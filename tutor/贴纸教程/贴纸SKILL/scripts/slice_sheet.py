#!/usr/bin/env python3
"""Slice an AI-generated N×N sticker sheet into individual transparent stickers.

Component-based: flood-fill the background across the WHOLE sheet, find
connected foreground components, assign each to its N×N grid slot by
centroid (small floating elements like speech bubbles attach to the nearest
main sticker), then crop each group's full bounding box. Stickers that
overhang their nominal grid cell are preserved intact instead of being cut
at the cell line.

Usage:
  python3 slice_sheet.py sheet.png --grid 4 --out out/stickers \
      --names names.txt --size 512 --contact contact.png

names.txt: one name per line, row-major order; used as output filenames.
"""

from __future__ import annotations

import argparse
import sys
from collections import deque
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter


def background_mask(img: Image.Image, tolerance: int) -> tuple[bytearray, tuple[int, int, int]]:
    """Whole-sheet flood fill from the outer border. Returns (flags, bg_ref):
    flags per pixel — 2 = background, 1 = visited-foreground-boundary, 0 = foreground;
    bg_ref — the median border color used as the background reference."""
    rgb = img.convert("RGB")
    w, h = rgb.size
    px = rgb.load()

    border = [px[x, 0] for x in range(w)] + [px[x, h - 1] for x in range(w)]
    border += [px[0, y] for y in range(h)] + [px[w - 1, y] for y in range(h)]
    ref = tuple(sorted(c[i] for c in border)[len(border) // 2] for i in range(3))

    def is_bg(c: tuple[int, int, int]) -> bool:
        return max(abs(c[0] - ref[0]), abs(c[1] - ref[1]), abs(c[2] - ref[2])) <= tolerance

    flags = bytearray(w * h)
    queue: deque[tuple[int, int]] = deque()
    for x in range(w):
        queue.append((x, 0))
        queue.append((x, h - 1))
    for y in range(h):
        queue.append((0, y))
        queue.append((w - 1, y))

    while queue:
        x, y = queue.popleft()
        idx = y * w + x
        if flags[idx]:
            continue
        if not is_bg(px[x, y]):
            flags[idx] = 1
            continue
        flags[idx] = 2
        if x > 0:
            queue.append((x - 1, y))
        if x < w - 1:
            queue.append((x + 1, y))
        if y > 0:
            queue.append((x, y - 1))
        if y < h - 1:
            queue.append((x, y + 1))
    return flags, ref


class Component:
    __slots__ = ("label", "area", "x0", "y0", "x1", "y1")

    def __init__(self, label: int) -> None:
        self.label = label
        self.area = 0
        self.x0 = self.y0 = 1 << 30
        self.x1 = self.y1 = -1

    @property
    def centroid(self) -> tuple[float, float]:
        return ((self.x0 + self.x1) / 2, (self.y0 + self.y1) / 2)

    def bbox_gap(self, other: "Component") -> float:
        dx = max(self.x0 - other.x1, other.x0 - self.x1, 0)
        dy = max(self.y0 - other.y1, other.y0 - self.y1, 0)
        return (dx * dx + dy * dy) ** 0.5


def label_components(flags: bytearray, w: int, h: int) -> tuple[list[int], list[Component]]:
    """4-connected labeling of foreground (flags != 2)."""
    labels = [0] * (w * h)
    comps: list[Component] = []
    for sy in range(h):
        srow = sy * w
        for sx in range(w):
            if flags[srow + sx] == 2 or labels[srow + sx]:
                continue
            comp = Component(len(comps) + 1)
            queue = deque([(sx, sy)])
            labels[srow + sx] = comp.label
            while queue:
                x, y = queue.popleft()
                comp.area += 1
                if x < comp.x0:
                    comp.x0 = x
                if x > comp.x1:
                    comp.x1 = x
                if y < comp.y0:
                    comp.y0 = y
                if y > comp.y1:
                    comp.y1 = y
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if 0 <= nx < w and 0 <= ny < h:
                        ni = ny * w + nx
                        if flags[ni] != 2 and not labels[ni]:
                            labels[ni] = comp.label
                            queue.append((nx, ny))
            comps.append(comp)
    return labels, comps


def group_by_slot(comps: list[Component], rows: int, cols: int, w: int, h: int) -> dict[int, list[Component]]:
    """Assign components to grid slots. Components ≥5% of a cell are mains and
    claim the slot under their centroid; the rest attach to the nearest main."""
    cell_area = (w / cols) * (h / rows)
    mains = [c for c in comps if c.area >= cell_area * 0.05]
    floaters = [c for c in comps if c.area < cell_area * 0.05]

    total = rows * cols
    slots: dict[int, list[Component]] = {}
    slot_of: dict[int, int] = {}
    if len(mains) == total:
        # 主体数恰好 rows×cols → 排序分箱（按 y 切行、行内按 x 排），对「宫格排版不严格对齐」免疫。
        by_y = sorted(mains, key=lambda c: c.centroid[1])
        for row in range(rows):
            row_comps = sorted(by_y[row * cols : (row + 1) * cols], key=lambda c: c.centroid[0])
            for col, c in enumerate(row_comps):
                slot = row * cols + col
                slots[slot] = [c]
                slot_of[c.label] = slot
    else:
        # 数量不符（有贴纸缺失/粘连）→ 退回质心落格。
        print(f"warn: {len(mains)} mains != {total}, falling back to centroid binning", file=sys.stderr)
        for c in mains:
            cx, cy = c.centroid
            slot = min(int(cy / (h / rows)), rows - 1) * cols + min(int(cx / (w / cols)), cols - 1)
            slots.setdefault(slot, []).append(c)
            slot_of[c.label] = slot
        for slot, cs in slots.items():
            if len(cs) > 1:
                print(f"warn: slot {slot} has {len(cs)} main components (merged crops)", file=sys.stderr)
    for f in floaters:
        if not mains:
            break
        nearest = min(mains, key=f.bbox_gap)
        slots[slot_of[nearest.label]].append(f)
    return slots


def cut_group(
    sheet: Image.Image,
    labels: list[int],
    group: list[Component],
    pad_ratio: float,
    size: int,
    bg_ref: tuple[int, int, int],
    tolerance: int,
) -> Image.Image | None:
    wanted = {c.label for c in group}
    x0 = min(c.x0 for c in group)
    y0 = min(c.y0 for c in group)
    x1 = max(c.x1 for c in group) + 1
    y1 = max(c.y1 for c in group) + 1
    w = sheet.width

    crop = sheet.convert("RGBA").crop((x0, y0, x1, y1))
    # Enclosed background pockets (holes the border flood fill can't reach —
    # e.g. inside a stethoscope loop) are still labeled foreground; color-key
    # them out against the background reference.
    cpx = crop.load()
    rr, rg, rb = bg_ref
    mask = Image.new("L", crop.size, 0)
    mpx = mask.load()
    for y in range(y0, y1):
        row = y * w
        for x in range(x0, x1):
            if labels[row + x] in wanted:
                c = cpx[x - x0, y - y0]
                if max(abs(c[0] - rr), abs(c[1] - rg), abs(c[2] - rb)) > tolerance:
                    mpx[x - x0, y - y0] = 255
    # Shave the color-blended halo ring, then feather INWARD only — an outward
    # blur would give magenta background pixels partial alpha (pink fringe).
    mask = mask.filter(ImageFilter.MinFilter(5))
    blurred = mask.filter(ImageFilter.GaussianBlur(0.8))
    mask = ImageChops.darker(blurred, mask)
    crop.putalpha(mask)

    bbox = crop.getchannel("A").getbbox()
    if bbox is None:
        return None
    crop = crop.crop(bbox)

    pad = int(max(crop.size) * pad_ratio)
    out = Image.new("RGBA", (crop.width + 2 * pad, crop.height + 2 * pad), (0, 0, 0, 0))
    out.paste(crop, (pad, pad))

    scale = size / max(out.size)
    if scale < 1:
        out = out.resize(
            (max(1, round(out.width * scale)), max(1, round(out.height * scale))),
            Image.LANCZOS,
        )
    return out


def checkerboard(w: int, h: int, step: int = 16) -> Image.Image:
    bg = Image.new("RGB", (w, h), (255, 255, 255))
    px = bg.load()
    for y in range(h):
        for x in range(w):
            if ((x // step) + (y // step)) % 2:
                px[x, y] = (204, 204, 204)
    return bg


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("sheet", type=Path)
    ap.add_argument("--grid", default="4", help="N（N×N）或 ROWSxCOLS（如 3x4=3 行 4 列，默认 4）")
    ap.add_argument("--out", type=Path, required=True, help="output directory")
    ap.add_argument("--names", type=Path, help="one name per line, row-major")
    ap.add_argument("--size", type=int, default=512, help="max long edge (default 512)")
    ap.add_argument("--tolerance", type=int, default=28, help="bg flood-fill tolerance (default 28)")
    ap.add_argument("--pad", type=float, default=0.04, help="padding around trimmed content (default 0.04)")
    ap.add_argument("--format", choices=["webp", "png"], default="webp")
    ap.add_argument("--contact", type=Path, help="write a review contact sheet here")
    args = ap.parse_args()

    sheet = Image.open(args.sheet)
    # 宫格尺寸："4" → 4×4；"3x4" → 3 行 4 列。
    if "x" in str(args.grid):
        rows, cols = (int(v) for v in str(args.grid).lower().split("x"))
    else:
        rows = cols = int(args.grid)
    total = rows * cols
    names = None
    if args.names:
        names = [ln.strip() for ln in args.names.read_text().splitlines() if ln.strip()]
        if len(names) != total:
            print(f"error: {args.names} has {len(names)} names, expected {total}", file=sys.stderr)
            return 1

    w, h = sheet.size
    flags, bg_ref = background_mask(sheet, args.tolerance)
    labels, comps = label_components(flags, w, h)
    slots = group_by_slot(comps, rows, cols, w, h)

    mains = sum(1 for cs in slots.values() for c in cs if c.area >= (w / cols) * (h / rows) * 0.05)
    print(f"components: {len(comps)} total, {mains} mains in {len(slots)} slots")
    if len(slots) != total:
        missing = sorted(set(range(total)) - set(slots))
        print(f"warn: {len(missing)} empty slots: {missing}", file=sys.stderr)

    args.out.mkdir(parents=True, exist_ok=True)
    results: list[tuple[str, Image.Image | None]] = []
    for slot in range(total):
        name = names[slot] if names else f"cell-{slot // cols + 1}-{slot % cols + 1}"
        group = slots.get(slot)
        if not group:
            results.append((name, None))
            continue
        out = cut_group(sheet, labels, group, args.pad, args.size, bg_ref, args.tolerance)
        results.append((name, out))
        if out is None:
            print(f"warn: {name}: empty after masking", file=sys.stderr)
            continue
        dest = args.out / f"{name}.{args.format}"
        if args.format == "webp":
            out.save(dest, "WEBP", quality=90, method=6)
        else:
            out.save(dest, "PNG")
        print(f"{dest}  {out.width}x{out.height}")

    if args.contact:
        tile = args.size + 24
        board = checkerboard(tile * cols, tile * rows)
        for i, (_, img) in enumerate(results):
            if img is None:
                continue
            row, col = divmod(i, cols)
            board.paste(
                img,
                (col * tile + (tile - img.width) // 2, row * tile + (tile - img.height) // 2),
                img,
            )
        board.save(args.contact)
        print(f"contact sheet: {args.contact}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
