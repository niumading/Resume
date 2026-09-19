<h1 align="center">关于 Xiaoding · 3D 个人简历</h1>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/code-MIT-blue.svg?style=flat" alt="License MIT"></a>
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=white" alt="React 18">
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript&logoColor=white" alt="TypeScript 5">
  <img src="https://img.shields.io/badge/three.js-r169-000000?style=flat&logo=three.js&logoColor=white" alt="three.js r169">
  <img src="https://img.shields.io/badge/Vite-5-646CFF?style=flat&logo=vite&logoColor=white" alt="Vite 5">
</p>

<p align="center"><b>滚动就是运镜。把简历，长在一个 3D 场景里。</b></p>

---

一个基于 **React Three Fiber + TypeScript** 的滚动式个人 3D 简历：一层固定的 3D 背景（随滚动运镜的人物模型）+ 一层可滚动的 HTML 内容（首屏 → 履历 → 作品集）。相机路径直接复用 glb 里烘好的动画，滚动条只负责在时间轴上「刮」，再叠上自动对焦景深与头部跟随光标。纯前端 SPA，`npm run build` 出来就是一个静态 `dist/`，扔哪都能跑。

> **许可说明（先读这段）**
> **代码**采用 **MIT** 许可证（见 [`LICENSE`](LICENSE)）。代码部分源自 [Sen Zheng 的 sen-3d-resume](https://github.com/dayinji/sen-3d-resume)（MIT），感谢原作者开源。
> **个人内容与素材**（3D 人物模型 / 履历数据 / 作品文案与配图）为本仓库作者的个人内容，**不在 MIT 范围内**，详见 [`NOTICE`](NOTICE)。

## 快速开始

前端应用整个在 [`web/`](web) 下，**下文提到的代码 / 资源路径都相对 `web/`**（如 `src/App.tsx` 即 `web/src/App.tsx`），npm 命令也在 `web/` 里执行。

```bash
git clone https://github.com/niumading/Resume.git
cd Resume/web
npm install
npm run dev        # 开发 http://localhost:5173
```

其余命令：

```bash
npm run build      # 类型检查 + 打包，产物输出到 web/dist
npm run preview    # 预览 build 产物
npm run typecheck  # 仅类型检查（tsc -b）
npm run lint       # ESLint
```

**环境要求：** Node.js 20+（ESLint 10 需要）。无后端、无数据库、无需任何 API key。

> **调试小技巧**：地址后面加 `?bg=<名称>` 可即时切换背景配色，八套可选 —— `sky`（默认晴空）/ `clay` / `night` / `mist` / `sage` / `dune` / `slate` / `amber`。

## 内容在哪里改

内容与表现是分离的，改内容基本只动数据文件：

| 想改什么 | 改哪里 |
| --- | --- |
| 首屏标题与正文 | `src/App.tsx` 里的 `COPY`（中英双语） |
| 履历（求职方向 / 工作经历 / 教育） | `src/ui/Resume.tsx` 的 `entries` |
| 履历条数 / 相机停靠点 | `src/data/focusPoints.ts` 的 `FOCUS_POINTS`（要与 `Resume.tsx` 的 entries 同步增删） |
| 作品集板块与作品列表 | `src/data/works.ts` |
| 单个作品的详情正文 | `src/content/works/<slug>.md`（frontmatter + markdown；格式见 `src/data/workDocs.ts`，模板见 `src/content/works/example.md`） |
| 背景配色 | `src/scene/Scene.tsx` 的 `BG_PRESETS` / `BG_DEFAULT` |
| 灯光 / 景深 / Bloom / 人物位置 | `src/scene/Scene.tsx` 里各组件顶部的**普通常量**，直接改值，没有面板也没有额外配置文件 |
| 3D 人物模型 | `public/models/me.glb`，见 [3D 场景与人物模型](#3d-场景与人物模型) |

作品详情用极简 markdown：`works.ts` 里某个 item 写上 `slug: xxx`，对应建一个 `src/content/works/xxx.md`，点开该条目就会渲染成完整详情页；没有对应 `.md` 的作品走统一占位详情。配图放 `public/works/<slug>/`，正文里用 `/works/<slug>/图片名` 绝对路径引用。

## 3D 场景与人物模型

`public/models/me.glb` 是整个站点的核心资产：人物网格 + 相机 + 相机动画 + 对焦锚点都烘在一个文件里，人物由本人照片经图生 3D 制作。`Scene.tsx` 加载后按**对象名字**在 glb 里查找这些内容，缺哪个对应功能就失效：

| glb 里要有 | 作用 | 缺了会怎样 |
| --- | --- | --- |
| 相机 + 名为 `CameraAction` 的动画 clip | 滚动驱动的镜头路径；总帧数运行时按 24fps 从 clip 读，不写死 | 没有镜头运动，整个效果失效 |
| `focus-start`（或 `focus-0`） | 首屏对焦锚点（空对象），两种命名都认 | 首屏自动对焦失效 |
| 时间轴对焦锚点（每条履历一个空对象） | 顺序列在 `src/data/focusPoints.ts` 的 `FOCUS_POINTS`——`Scene.tsx` 与 `Resume.tsx` 共用的唯一真源，**条数是动态的** | 对应节点对不上焦 |
| `focus-works` | 作品区对焦锚点（空对象），可选 | 自动复用末时间轴锚点 |
| 名字含 `eye` 的网格 | 眼睛 | 头部/视线跟随光标失效 |

镜头与履历怎么对上，靠 glb 里 `CameraAction` 的**帧约定**（24fps）：

```
第 0 帧                                                          最后一帧
  │        │        │        │        │        │                    │
focus-0  focus-1  focus-2  focus-3  focus-4  focus-5  ···  ···  focus-works
首屏     ├─ 50 帧 ─┤ 每个时间轴节点相隔 50 帧            尾段 = 作品区（长度任意）
```

改造模型、调整头部跟随或眼球逻辑之前，先读 [`CLAUDE.md`](CLAUDE.md)（含 3D 模型期的踩坑记录）。

## 工作原理

纯前端 SPA，无后端、无路由：`index.html` → `src/main.tsx` → `src/App.tsx`（一个固定 `<Canvas>` 3D 背景 + 可滚动 HTML 叠层）。

- **3D 背景**：`src/scene/Scene.tsx` 加载 `public/models/me.glb`，用 glb 自带的相机动画分 5 段被滚动「刮」着播放，再叠自动对焦景深与头部跟随；灯光来自 `src/scene/Env.tsx`（`public/textures/env.hdr` 做 IBL）。
- **滚动内容**：`Hero`（首屏，在 `App.tsx` 内）→ `src/ui/Resume.tsx`（履历时间轴）→ `src/ui/Works.tsx`（作品集画廊 + 详情弹窗）。
- **叠层效果**：`LoadingScreen`（模型加载完前的遮罩）、`NoiseOverlay`（胶片噪点）、滚动渐暗 / 磨砂右轨 / 首屏装饰画框（都在 `App.tsx`）。
- **后期管线**：`<EffectComposer>` 里顺序为 DepthOfField → Bloom → SMAA，换效果时注意顺序会影响合成。
- **全局状态**：`src/store.ts`（zustand，轻量）。

## 仓库结构

| 目录 | 内容 |
| --- | --- |
| [`web/`](web) | 前端应用（React Three Fiber + TypeScript），所有代码约定都在这里 |
| [`tutor/`](tutor) | 改造教程（部署、贴纸、眼球、intro3d 导模型） |
| [`CLAUDE.md`](CLAUDE.md) [`AGENTS.md`](AGENTS.md) | 面向 AI 编码助手的协作约定 |
| [`LICENSE`](LICENSE) [`NOTICE`](NOTICE) | 许可与内容声明 |

`web/` 内部：

```
web/
  src/
    App.tsx              Canvas + 滚动内容装配、首屏、加载/叠层
    main.tsx             入口
    store.ts             全局交互状态（zustand）
    data/
      works.ts           作品集板块 / 作品列表（作品集数据源）
      workDocs.ts        构建期内联 content/works/*.md + frontmatter 解析
      focusPoints.ts     时间轴对焦锚点名单（履历条数的唯一真源）
    content/works/       作品详情 markdown；含 example.md 模板
    scene/
      Scene.tsx          3D 场景：me.glb 人物 + glb 相机动画 + 滚动驱动 / 头部跟随
      Env.tsx            env.hdr 环境光照（IBL）
    ui/
      Resume.tsx         履历时间轴（含个人数据）
      Works.tsx          作品集画廊 + 详情弹窗
      LoadingScreen.tsx / NoiseOverlay.tsx / SocialIcons.tsx
  public/
    models/me.glb        3D 人物 + 相机动画（核心资产）
    textures/env.hdr     环境贴图（IBL，第三方素材）
    fonts/               字体（第三方素材）
    works/covers/        作品集板块封面
    works/<slug>/        作品详情页配图
  scripts/compress-media.sh   媒体压缩脚本（ffmpeg，原地压缩）
```

## 部署

```bash
cd web
npm run build    # → web/dist
```

`vite.config.ts` 里 `base: './'`，产物用相对路径，`dist/` 可直接双击打开，也可放到任意子目录（如 `example.com/portfolio/`）。运行时 public 资源用 `import.meta.env.BASE_URL` 拼接。

仓库自带 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)，**推送到 `main` 就自动构建并发布到 GitHub Pages**。启用方式：仓库 **Settings → Pages → Source** 选 **GitHub Actions**，推一次代码即可，站点地址为 `https://niumading.github.io/Resume/`。

也可以部署到任何静态托管（Cloudflare Pages / Netlify / Vercel / 对象存储 / 自有服务器）。

## 技术栈

React 18 · TypeScript · @react-three/fiber · @react-three/drei · @react-three/postprocessing · three · framer-motion · zustand · Vite

## 教程

写给使用者（不一定会写代码）的分步教程，都在 [`tutor/`](tutor)：

| 教程 | 讲什么 |
| --- | --- |
| [① 部署到 GitHub Pages](tutor/部署教程/1-部署到-GitHub-Pages.md) | 免费上线成 `你的用户名.github.io/仓库名/`，全程点鼠标 |
| [② 部署到 Cloudflare Pages](tutor/部署教程/2-部署到-Cloudflare-Pages.md) | 私有仓库也免费、全球 CDN、绑自定义域名更省心 |
| [用 intro3d 处理模型](tutor/intro3d处理模型教程/intro3d处理模型教程.md) | 不开 Blender，在浏览器里摆好模型和镜头导出 `me.glb`（含 B 站视频） |
| [眼球跟随](tutor/眼球教程/眼球教程.md) | 「眼睛追着鼠标看」是怎么做的，换模型后怎么接上（含 B 站视频） |
| [AI 贴纸包](tutor/贴纸教程/贴纸教程.md) | 让 AI 批量生成透明背景贴纸，贴到脸上 / 场景 / 网页里 |

## 许可与版权

- **代码**：[MIT](LICENSE)。代码部分源自 [Sen Zheng 的 sen-3d-resume](https://github.com/dayinji/sen-3d-resume)（MIT），已保留原始版权声明。
- **个人内容与素材**：3D 人物模型（`public/models/me.glb`）、履历数据、作品文案与配图为本仓库作者的个人内容，**不在 MIT 范围内**，详见 [`NOTICE`](NOTICE)。
- **第三方素材**（`public/fonts/` 字体、`public/textures/env.hdr` HDR）：请各自核对其原始许可后再分发。
