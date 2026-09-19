// 时间轴聚焦锚点：glb 内 `focus-*` 空对象的名字，按顺序对应履历 entries（Resume.tsx）。
// 这是「履历条数 / 相机停靠点」的唯一真源——Scene.tsx 与 Resume.tsx 都从这里取，
// 增删履历时只改这里 + Resume.tsx 的 entries，其余（节点数 M、帧区间）由 Scene.tsx 自动推导。
//
// 相机动画（glb 里的 CameraAction）帧约定：
//   第 0 帧          → 首页镜头（首页锚点：`focus-start` 或 `focus-0`，两种命名都认）
//   第 50·k 帧       → 第 k 个时间轴节点（k = 1…M，对应 FOCUS_POINTS[k-1]）
//   最后一帧          → 作品区镜头（`focus-works`；没有则自动复用末时间轴节点）
// 即每个节点相隔 FRAMES_PER_NODE 帧；最后一个节点到作品区之间是「作品区」帧段，
// 长度 = 相机动画总帧数 − 50·M，可长可短（当前 me.glb 是 100 帧的入场+横移运镜）。
//
// 命名两种都支持：本仓库自带 glb 用有意义的 slug（下方）；intro3d 一键导出的 glb 用统一编号
// `focus-0`(首页) + `focus-1…M`(时间轴)，此时把下面换成 ['focus-1','focus-2',…] 即可。
// ⚠️ 必须与 glb 里的时间轴 focus 空对象名一一对应、且数量 = Resume.tsx 的 entries 数。
// 首页锚点 focus-0（或旧名 focus-start）+ 作品区 focus-works 由 Scene.tsx 自动识别，不列在这里。
// 当前为统一命名的 5 节点 glb（focus-1…5）。改履历条数时，同步增删这里 + Resume.tsx 的 entries。
export const FOCUS_POINTS = ['focus-1', 'focus-2', 'focus-3', 'focus-4', 'focus-5'] as const

// 每个时间轴节点在相机动画里占的帧数（节点 k 落在第 k·FRAMES_PER_NODE 帧）。
export const FRAMES_PER_NODE = 50
