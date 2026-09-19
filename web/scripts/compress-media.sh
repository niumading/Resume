#!/usr/bin/env bash
# 压缩 public 下的图片/视频（原地）。规则：
#  - 最大宽度 1920，超出等比缩小（不放大）
#  - 视频 H.264 ~2Mbps，faststart，音频 aac 128k
#  - 图片：jpg q=4 / webp q=80 / png 最大压缩 / gif 调色板重编码
# 仅当输出成功且更小才覆盖原文件；否则保留原文件。保持文件名与扩展名不变。
set -u
DIRS=("public/works" "public/images")
LOG="scripts/compress-media.log"
: > "$LOG"

# 视频缩放：宽取 min(1920,iw) 并向下取偶；高 -2 自动偶数
VSCALE="scale=w='trunc(min(1920\,iw)/2)*2':h=-2:flags=lanczos"
ISCALE="scale=w='min(1920\,iw)':h=-2:flags=lanczos"

human() { du -h "$1" 2>/dev/null | cut -f1; }
sizeof() { stat -f%z "$1" 2>/dev/null || echo 0; }

process() {
  local f="$1" ext lc tmp rc before after
  ext="${f##*.}"; lc=$(echo "$ext" | tr '[:upper:]' '[:lower:]')
  tmp="${f%.*}.__c__.${ext}"
  before=$(sizeof "$f")
  case "$lc" in
    mp4|mov|m4v|webm)
      ffmpeg -y -hide_banner -loglevel error -i "$f" -vf "$VSCALE" \
        -c:v libx264 -preset medium -b:v 2M -maxrate 2.6M -bufsize 5M \
        -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 128k "$tmp" </dev/null ;;
    jpg|jpeg)
      ffmpeg -y -hide_banner -loglevel error -i "$f" -vf "$ISCALE" -q:v 4 "$tmp" </dev/null ;;
    png)
      ffmpeg -y -hide_banner -loglevel error -i "$f" -vf "$ISCALE" -compression_level 100 "$tmp" </dev/null ;;
    webp)
      ffmpeg -y -hide_banner -loglevel error -i "$f" -vf "$ISCALE" -quality 80 "$tmp" </dev/null ;;
    gif)
      ffmpeg -y -hide_banner -loglevel error -i "$f" \
        -vf "${ISCALE},split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer" "$tmp" </dev/null ;;
    *) return ;;
  esac
  rc=$?
  if [ $rc -ne 0 ] || [ ! -s "$tmp" ]; then
    rm -f "$tmp"; echo "FAIL  $f (rc=$rc，保留原文件)" | tee -a "$LOG"; return
  fi
  after=$(sizeof "$tmp")
  if [ "$after" -lt "$before" ]; then
    mv -f "$tmp" "$f"
    echo "OK    $f  $(numfmt --to=iec $before 2>/dev/null || echo ${before}B) -> $(numfmt --to=iec $after 2>/dev/null || echo ${after}B)" | tee -a "$LOG"
  else
    rm -f "$tmp"; echo "SKIP  $f（压后未更小，保留原文件）" | tee -a "$LOG"
  fi
}

for d in "${DIRS[@]}"; do
  [ -d "$d" ] || continue
  while IFS= read -r -d '' f; do process "$f"; done \
    < <(find "$d" -type f \( -iname '*.mp4' -o -iname '*.mov' -o -iname '*.m4v' -o -iname '*.webm' \
        -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' -o -iname '*.gif' \) -print0)
done

echo "==== DONE ====" | tee -a "$LOG"
echo "public/works: $(human public/works)  public/images: $(human public/images)" | tee -a "$LOG"
