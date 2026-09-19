---
name: sticker-pack
description: |
  用 AI 批量生成一套「宫格贴纸包」：调 ZOOOP 平台的 GPT Image 2 出一张 N 宫格贴纸大图，
  再自动抠图 + 按宫格切分 + 存到指定文件夹 / 桌面。当用户想做贴纸、表情包、sticker
  pack、die-cut stickers，或给某个主题（职业 / 爱好 / 星座 / 宠物 / 心情…）做一组风格
  化贴纸时使用。Generate an AI die-cut sticker pack (1 / 4 / 9 / 16 stickers) via
  ZOOOP GPT Image 2, then auto matte + slice + save to a folder / Desktop.
---

# AI 宫格贴纸包生产

一句话流程：**问用户要几张 → 出一张宫格大图（AI）→ 自动抠图切分 → 存盘 → 逐格核对**。

> 这是本仓库（[3D 个人简历](../../README.md)）的「自己动手」教程之一。它是通用的——生成的透明
> 贴纸（WebP/PNG）可以用在任何地方：3D 场景贴花、网页、聊天表情、打印模切贴纸等。跟本仓
> 库的 3D 简历没有强绑定。

## 这个 SKILL 做什么 / 不做什么

- ✅ 帮用户把「一句主题」变成一套风格统一的透明贴纸：写提示词 → 生成 → 抠图 → 切分 → 存盘。
- ✅ 支持 **1 / 4 / 9 / 16 张**，分别对应 **单张 / 2×2 / 3×3 / 4×4** 宫格。
- ✅ 生成完自动抠底、按宫格切成单张透明图、存到用户指定文件夹（默认桌面），并出一张核对用的
  contact sheet。
- ❌ 不管理素材库 / 数据库 / 上传 CDN——只产出本地透明图文件，之后怎么用由用户决定。

## 依赖（先装这两样）

### 1. ZOOOP 官方 skill + API key

生图走 **ZOOOP** 平台（AI 生成图/视频/音频的聚合平台，含 GPT Image 2 等模型）。

**官方 skill（带上给 agent 用）**：<https://github.com/zooopai/skill-zooop>

```bash
# 任意 agent（推荐）
npx skills add zooopai/skill-zooop
# 或 Claude Code 原生
claude install github:zooopai/skill-zooop
# 装到 ~/.claude/skills/zooop/，会在对话提到 ZOOOP / 生图时自动加载
```

单文件参考（不想 clone 就直接 fetch）：
<https://raw.githubusercontent.com/zooopai/skill-zooop/main/SKILL.md>
· llms.txt：<https://api.zooop.ai/llms.txt>

**如果用户还没有 API key（`$ZOOOP_API_KEY` 为空），引导用户生成一个：**

1. 拿一个 token：打开 <https://zooop.ai/user#apiKeys> → **Create token** → 选一个 project
   （创建后不可改，之后所有任务/上传都归到这个 project）→ **设一个每日额度上限**（防跑飞）→
   复制 `zpk_live_…`（**只显示一次**）。团队额度则由团队 owner/admin 在团队后台的 API Keys
   页创建，用法完全一样。
2. 在终端里设环境变量：
   - macOS / Linux / WSL / Git Bash：
     ```bash
     echo 'export ZOOOP_API_KEY=zpk_live_…' >> ~/.zshrc && source ~/.zshrc
     ```
   - Windows PowerShell：
     ```powershell
     [Environment]::SetEnvironmentVariable('ZOOOP_API_KEY','zpk_live_…','User')
     ```
   - Windows cmd：`setx ZOOOP_API_KEY "zpk_live_…"`
3. **重启 agent**，让它继承到新环境变量。

设好后 `GET /v1/me` 能看到当前钱包和余额；生图前用 `POST /v1/quote` 能拿到确切积分/ETA。

### 2. Python + Pillow（切图脚本）

抠图/切分用本目录的 [`scripts/slice_sheet.py`](scripts/slice_sheet.py)，只依赖 Pillow：

```bash
python3 -m pip install --upgrade Pillow
```

## 交互流程（照这个顺序走）

### 步骤 0 · 先问用户「几张」

**必须先问**（除非用户已经说了）：要 **1 / 4 / 9 / 16** 张？张数决定宫格，也决定提示词模板：

| 张数 | 宫格  | `slice_sheet.py --grid` | 提示词模板         |
| ---- | ----- | ----------------------- | ------------------ |
| 1    | 单张  | `1`                     | 「单张」模板       |
| 4    | 2×2   | `2`                     | 「宫格」模板（2 行）|
| 9    | 3×3   | `3`                     | 「宫格」模板（3 行）|
| 16   | 4×4   | `4`                     | 「宫格」模板（4 行）|

顺便确认：**主题**（如「程序员职业」「柴犬表情」「十二星座」）、**风格**（见下「风格库」，默认
「复古波普」）、以及**存到哪里**（默认 `~/Desktop/<主题>-stickers/`）。

### 步骤 1 · 写提示词

一张宫格大图 = **纯品红底 `#FF00FF`**（干净好抠）+ N 个模切贴纸 + 每张一句 1–3 词有梗短语。
每张贴纸 = 一个**拟人化物件**（有脸/有情绪/有动作）+ 全大写粗体短语（弧形或堆叠排版）。

**宫格模板（4/9/16 张）**——把 `{N}` `{R}` `{C}` `{风格段}` 和每格描述填好：

```
A sticker sheet of {N} die-cut stickers arranged in a perfect {R}x{C} grid with
even gaps, on a solid uniform magenta background (#FF00FF). {风格段}
All words must be spelled EXACTLY as given, in chunky bold uppercase letters.

Grid order, strictly row by row, left to right:
Row 1: <格1 描述>, text "<短语1>"; <格2 描述>, text "<短语2>"; …
Row 2: …
（有几行写几行，每行 {C} 个）

Stickers must not overlap or touch each other, all fully inside the canvas with
clear margins. No watermark, no grid lines, no extra text beyond the given words.
```

**单张模板（1 张）**——没有宫格：

```
A single die-cut sticker on a solid uniform magenta background (#FF00FF). {风格段}
The sticker: <描述>, with chunky bold uppercase text "<短语>" spelled EXACTLY as
given. Thick white die-cut border, centered, clear margins, no watermark.
```

要点：
- **短语要有梗**（SHIP IT / CHEF'S KISS / TO THE MOON 这类），不要写说明文。
- **文字必须逐字写死**并强调 `spelled EXACTLY`——AI 出文字有翻车率，缺字（如只出半句）也算翻车。
- 徽章外形在各格之间**变化**（圆形/星爆/圆角矩形/三角旗/不规则色块），别全是圆角矩形。
- 完整可改的例子见 [`examples/prompt-career-retro.txt`](examples/prompt-career-retro.txt)
  （16 职业 · 复古波普）与配套 [`examples/names.txt`](examples/names.txt)。

### 步骤 2 · 生成宫格大图（ZOOOP · GPT Image 2）

装了官方 zooop skill 就直接用它的脚本；没装也可以裸 `curl`。

**A. 找到 GPT Image 2 的 model id**（interfaceId + versionId）：

```bash
curl -fsS "https://api.zooop.ai/v1/models?type=image&subtype=default" \
  -H "Authorization: Bearer $ZOOOP_API_KEY"
# 在返回里按 name 匹配 "GPT Image 2"，取它的 interfaceId 和某个 versions[].versionId（如 standard）
# 同时看该模型的 params[]，确认 quality/size/aspect_ratio/resolution 的确切字段名与可选值
```

**B. 组请求体并提交**（贴纸有文字 → `quality` 用 **Medium**；`low` 常把字糊掉。字仍糊再试
`High`。1:1 分辨率上限 `2k`，别填 4k 会超模型像素上限直接失败）：

```jsonc
{
  "interfaceId": "<上一步的 interfaceId>",
  "versionId":   "<上一步的 versionId，如 standard>",
  "params": {
    "prompt":       "<步骤1 写好的提示词>",
    "aspect_ratio": "1:1",
    "resolution":   "2k",
    "quality":      "Medium"   // 以模型 params[].options 的确切大小写为准
  }
}
```

用官方 skill 的脚本（在 `~/.claude/skills/zooop/`）：

```bash
cd ~/.claude/skills/zooop
bash scripts/quote.sh  <interfaceId> <versionId> "$BODY"   # 可选：先看确切积分/ETA
bash scripts/submit.sh <interfaceId> <versionId> "$BODY"   # → taskId
bash scripts/poll.sh   <taskId>                            # → outputs[0].url
```

`$BODY` 可以这样拼（把提示词从文件读进 JSON，避免转义地狱）：

```bash
BODY=$(python3 -c "import json,sys;print(json.dumps({'interfaceId':sys.argv[1],'versionId':sys.argv[2],'params':{'prompt':open(sys.argv[3]).read(),'aspect_ratio':'1:1','resolution':'2k','quality':'Medium'}}))" \
  "<interfaceId>" "<versionId>" "examples/prompt-career-retro.txt")
```

裸 curl 等价：`POST /v1/tasks` 提交、`GET /v1/tasks/{id}` 轮询（详见官方 SKILL.md）。

### 步骤 3 · 下载大图

```bash
curl -fsSL "<poll 返回的 outputs[0].url>" -o sheet.png
```

### 步骤 4 · 自动抠图 + 按宫格切分 + 存盘

一条命令搞定抠底、按宫格切成单张透明图、缩放、存盘，并出核对图：

```bash
python3 scripts/slice_sheet.py sheet.png \
  --grid <1|2|3|4> \
  --out  "$HOME/Desktop/<主题>-stickers" \
  --contact "$HOME/Desktop/<主题>-stickers/contact.png" \
  [--names examples/names.txt]     # 可选：一行一个名字（行序=宫格行优先），用作输出文件名
```

- `--grid` 用**步骤 0 表格**里的值（4 张=2，9 张=3，16 张=4，1 张=1）。也支持非正方形
  `--grid 3x4`（3 行 4 列）。
- 不给 `--names` 就用 `cell-<行>-<列>.webp` 命名。
- 默认输出 512px 长边的透明 **WebP**；要 PNG 加 `--format png`，要更大加 `--size 1024`。
- 脚本原理：整张图从边缘 flood-fill 抠掉品红底 → 连通域找出每个贴纸主体（小气泡/装饰会
  自动归到最近的主体）→ 按宫格分箱裁剪，**超出格子边界的贴纸也完整保留**，不会被切边；镂空
  处（如听诊器圈内）按底色 color-key 抠透，并做防粉边处理。

**「存到指定文件夹 / 桌面」**：用户给了路径就用用户的；没给就默认
`~/Desktop/<主题>-stickers/`。

### 步骤 5 · 逐格核对（不能省）

用 Read 工具打开 `contact.png`，逐格看**文字拼写**和内容对不对。翻车的格子（缺字/糊字/串
味）→ 只重做那一格：

1. 用「单张模板」重写那格的提示词（同风格段 + 单贴纸描述），生成一张小图（1:1 `1k`/Medium
   足矣，更省）。
2. `python3 scripts/slice_sheet.py fix.png --grid 1 --out /tmp/fix`。
3. 把 `/tmp/fix/…` 覆盖到输出目录里对应的那张文件。

## 风格库（默认「复古波普」；可切「手绘涂鸦」）

把对应「风格段」整段填进提示词模板的 `{风格段}`。这两套是小红书/dribbble 潮流贴纸包的风味，
**不要**素材库式干净图标（太 oldschool 反而不潮）。

**风格 1 · 复古波普（retro pop mascot）**

```
Style: bold funky retro pop-art sticker pack — anthropomorphic objects with
googly eyes, cheeky expressions and lots of attitude; chunky rounded bold
uppercase typography, arced or stacked, integrated into the sticker design;
badge shapes vary between stickers (circle, starburst, rounded rectangle,
pennant flag, organic blob); limited retro palette of cream, tomato red,
mustard yellow, teal green, cobalt blue and black, thick black outlines,
thick white die-cut border around every sticker; flat colors with subtle
vintage grain, no gradients, no realistic shading.
```

**风格 2 · 手绘涂鸦（doodle blob）**

```
Style: playful hand-drawn doodle sticker pack — simple organic blobs, abstract
shapes and everyday objects with tiny naive faces, drawn with loose wobbly black
ink lines over flat bright color fills (cobalt blue, tomato red, lemon yellow,
bubblegum pink, teal, purple); quirky doodle hands, sparkles and squiggle
accents; rounded friendly handwritten-style text arced around the character;
minimal detail, generous negative space, cheerful naive energy; thick white
die-cut border around every sticker; no gradients, no shading, no realistic
rendering.
```

想加新风格：照上面写一段 `Style: …` 塞进模板即可，风格与主题正交。

## 已知坑

- **文字翻车**：Medium 档中文/长句短语有概率糊字或缺字，`contact.png` 逐格核对不能省；坏格
  单张重做（步骤 5）。
- **别为「避免重复」改提交体去撞幂等**：zooop `submit.sh` 用 `sha256(body)` 做幂等键，超时
  重跑同一条命令是安全的（不会重复扣费）；真要同参数出多张，给每次设不同 `ZOOOP_IDEMPOTENCY_KEY`。
- **失败任务自动退款**；先 `quote.sh` 看确切积分再 `submit`。
- **像素上限**：1:1 只能到 `2k`，填 4k 必失败。
- **主体数 < 宫格数**（贴纸光晕粘连被当成一个连通域）→ 给 `slice_sheet.py` 加 `--tolerance 44`
  重切；宫格排版不严格对齐时脚本会自动按行分箱排序，通常不用管。
- **可能混进品牌元素**（如球鞋上类某品牌的勾）→ 核对时留意，介意就单张重做。
- **抠不干净/边缘发灰**：调 `--tolerance`（默认 28，底色越纯可越小）；边缘品红残留调大一点。
