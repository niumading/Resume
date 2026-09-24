---
# 故意不写 title：缺省时回退到 works.ts 里 item 的 name，中英切换都能拿到对应语言的标题
banner: /works/infinite-canvas/1.jpg
# 2.02:1 的宽幅界面截图：必须走 natural 限高不裁切，默认的 cover 会把上下砍掉四成
bannerFit: natural
year: 2026
role: 公司内部版本改造与维护
tags: [本地部署, AI 创作画布, 二次开发]
photos: [/works/infinite-canvas/2.png, /works/infinite-canvas/3.jpg]
---

面向公司员工的**本地 AI 创作画布**：把文生图、图生图、文生视频、图生视频、图片扩展、
视频帧抽取、循环节点这些能力铺在同一块无限画布上，素材库、模型接入和短剧工具都在里面。

## 我改了什么

### 新增白模导出：**白模/姿势模块 → 画布**

新增 `POST /api/white-model/send-to-canvas` 接口：白模模块截图后以 PNG data URL 回传，
服务端校验格式（只收 PNG）并限制体积（base64 上限 28 MB）后落到画布素材库，
省掉"截图存盘 → 手动上传"这一步。

### 接入本地短剧服务

把 `LocalMiniDrama` 作为子模块接进来，用**项目自带的 Node runtime**（不依赖机器上装没装 Node）
起在 `127.0.0.1:5680`，双击 `启动短剧服务.bat` 即可，和主画布互不干扰。

### 轮盘导航

重做了画布上的快捷导航（`wheel-nav`），把常用入口从菜单里提到手边。

## 画布本身支持什么

即梦 CLI（直接调会员积分做文生图 / 图生图 / 文生视频 / 图生视频）、本地局域网 ComfyUI、
ModelScope 免费模型、OpenAI 协议 / Gemini 协议 / 火山方舟 / RunningHub。
素材侧另有 Chrome 采集插件与 PS 直连插件。
