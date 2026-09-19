# 用 intro3d 处理模型：可视化导出你的 me.glb（不用 Blender）

> 目标：不打开 Blender，直接在浏览器里的 **intro3d** 编辑器摆好模型和镜头，
> 一键导出这个 3D 简历需要的 `me.glb`，替换进你 fork 的项目里。

---

## 📺 先看视频

👉 **[点此在 B 站观看视频教程](https://www.bilibili.com/video/BV1oF3U6oELF/)**

---

## 这是在干嘛（一分钟看懂）

这个简历的 3D 背景，本质是一个带**相机动画**和若干**焦点锚点**的 `me.glb`
（原本要在 Blender 里做，见 [`CLAUDE.md`](../../CLAUDE.md)「Making it yours after a fork」）。
**intro3d** 把这套东西变成了网页上的可视化操作：你摆好模型、拉好每个时间线节点的镜头，
它就按本项目的规范帮你把相机动画和焦点锚点烘焙好，导出成能直接用的 `me.glb`。

---

## 导出之后要做的两件事

1. **换模型文件**：把导出的 `me.glb` 放到 [`web/public/models/me.glb`](../../web/public/models/me.glb)（覆盖原来的）。
2. **对齐焦点列表**：导出时 intro3d 会给你一份 `FOCUS_POINTS` 数组，把它填进
   [`web/src/data/focusPoints.ts`](../../web/src/data/focusPoints.ts)，并让
   [`web/src/ui/Resume.tsx`](../../web/src/ui/Resume.tsx) 里的简历条目数量和它对上
   —— 节点数是动态的，两边必须一致（详见 CLAUDE.md）。

然后 `cd web && npm run dev` 看效果即可。

---

## 常见问题

- **模型能显示，但节点 / 镜头对不上？** → 多半是 `focusPoints.ts` 的列表和 `Resume.tsx` 的条目数量没对齐，两边数量要一致。
- **想手动微调镜头 / 光照 / 景深？** → 场景参数都在 [`web/src/scene/Scene.tsx`](../../web/src/scene/Scene.tsx) 顶部的常量里。
