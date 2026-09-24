// 静态资源路径解析（public/ 下的图 / 视频 / 模型）
//
// ⚠️ 站点部署在**子路径**时（GitHub Pages 的 https://niumading.github.io/Resume/），
// md 里写的 `/works/xxx/1.jpg` 这种「根绝对路径」会被浏览器解析到**域名根**，
// 也就是 https://niumading.github.io/works/... —— 直接 404，详情页图片全空。
// 本地 dev（根路径部署）看不出问题，**只有上线才会炸**，所以统一走这个函数。
//
// 规则：
//   - 外链（http(s) / data: / blob: / mailto: / 页内锚点）原样返回，不动
//   - 已经是相对路径（./ ../ 开头）的也原样返回，避免二次加工
//   - 其余一律去掉前导斜杠后拼上 import.meta.env.BASE_URL
//     base './'（当前配置）   → './works/...'   相对于当前文档解析，子目录部署正确
//     base '/Resume/'（若改） → '/Resume/works/...'
export function assetUrl(path: string | undefined | null): string {
  if (!path) return ''
  if (/^(https?:|data:|blob:|mailto:|tel:|#)/i.test(path)) return path
  if (path.startsWith('./') || path.startsWith('../')) return path
  const base = import.meta.env.BASE_URL || '/'
  const rel = path.replace(/^\/+/, '')
  return base.endsWith('/') ? base + rel : `${base}/${rel}`
}
