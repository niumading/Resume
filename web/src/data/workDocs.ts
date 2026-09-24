// 作品详情内容规范：每个作品一个 markdown 文件，放在 src/content/works/<slug>.md
//
// frontmatter（--- 之间）字段（均可选）：
//   title   标题（缺省回退列表里的作品名）
//   banner  顶部 banner 图路径（如 /works/guqin/banner.jpg；缺省用渐变占位）
//   bannerFit banner 显示方式：cover（默认，裁切铺满）/ natural（保留比例不裁切）
//   year    年份
//   role    角色 / 担当
//   tags    标签数组：[互动项目, 虎啸奖]
//   link    外链（“访问作品”按钮）
//   photos  作品照片数组，**最多 3 张**（超出会被忽略）：
//             photos: [/works/<slug>/2.jpg, /works/<slug>/3.jpg, /works/<slug>/4.jpg]
//           放在正文末尾渲染成一条可点开放大的图带；
//           不写 photos 就整段不渲染（不影响只有 banner 的老详情页）。
// 正文（frontmatter 之后）写 markdown：文字 / 图 ![](...) / 视频 <video src=...>。
//
// 资源（图/视频）放到 public/works/ 下，用 /works/... 绝对路径引用。
// 列表（works.ts 的 item）通过 `slug` 关联到此处的 md；没有 slug 的 item 仍走占位详情。

export interface WorkDoc {
  slug: string
  title?: string
  banner?: string
  /** banner 显示方式：默认 'cover' 按容器裁切铺满；'natural' 保留原图比例完整显示（不裁切）；
   *  'portrait' 同为不裁切，但把高度上限放宽到 62vh —— 竖构图（9:16 竖屏）专用，
   *  走 'natural' 时竖图会被 50vh 压成中间窄窄一条，白白浪费屏幕。
   *  界面截图 / 长图必须用 'natural'，否则顶部内容会被切掉。 */
  bannerFit?: 'cover' | 'natural' | 'portrait'
  year?: string
  role?: string
  tags?: string[]
  link?: string
  /** 作品照片（最多 3 张，超出忽略）。渲染在正文末尾的可点开放大图带。 */
  photos?: string[]
  body: string
}

/** 每个作品最多展示的照片数 —— 需求方定死 3 张，别再放开。 */
export const MAX_PHOTOS = 3

// 构建期把全部 md 作为原始字符串内联进来
const files = import.meta.glob('../content/works/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

// 极简 frontmatter 解析（key: value，数组用 [a, b]）——避免引入依赖 Buffer 的库
function parseFrontmatter(raw: string): {
  data: Record<string, string | string[]>
  body: string
} {
  const m = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/.exec(raw)
  if (!m) return { data: {}, body: raw }
  const data: Record<string, string | string[]> = {}
  for (const line of m[1].split('\n')) {
    const mm = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line.trim())
    if (!mm) continue
    const rawVal = mm[2].trim()
    let val: string | string[]
    if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
      val = rawVal
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean)
    } else {
      val = rawVal.replace(/^['"]|['"]$/g, '')
    }
    data[mm[1]] = val
  }
  return { data, body: m[2].trim() }
}

const docs: Record<string, WorkDoc> = {}
for (const path in files) {
  const slug = path.split('/').pop()!.replace(/\.md$/, '')
  const { data, body } = parseFrontmatter(files[path])
  docs[slug] = { slug, ...data, body } as WorkDoc
}

export function getWorkDoc(slug?: string): WorkDoc | null {
  return slug ? docs[slug] || null : null
}
