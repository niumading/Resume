// 作品集数据（双语）。4 大板块 → 点击展开作品详情。
// 纯数据驱动：增删板块 / 作品只改本文件，Works.tsx 仅负责渲染。
//
// 板块字段：
//   id        唯一标识（用于 framer layoutId 共享元素动画，同时是 SECTION_COVERS 的取图键）
//   no        编号 '01'…'04'
//   title     板块标题
//   tagline   索引行右侧一句话
//   items[]   扁平作品列表：{ name, meta?, tags?, link?, slug? }
//             点击 item 弹出全屏详情，可补充可选媒体/文案字段：
//             { image?, video?, year?, desc? }（缺省时媒体用占位、简介回退 meta/标签）
//             带 slug 且在 src/content/works/<slug>.md 有同名文件时，详情渲染该 markdown；
//             没有对应 .md 的作品走统一占位详情（文案见下方 detailPlaceholder）。
//   groups[]  分组作品（与 items 二选一）：{ heading, items: string[] }
//   awards[]  奖项 chip（可选）
//   footer    底部技术/备注一行（可选）
//
// ⚠️ 当前状态：板块标题已替换为本人的真实项目方向，作品详情正文一律留占位，
//    待逐个补充（写 src/content/works/<slug>.md 并把 slug 填到对应 item 上即可）。

export interface WorkListItem {
  name: string
  meta?: string
  tags?: string[]
  link?: string
  slug?: string
  // 点击整行复制到剪贴板（联系方式用）。复制的内容默认取 meta；
  // 需要复制「和显示不一样的文本」时（如 GitHub 要带上 https://）用 copyText 覆盖。
  copy?: boolean
  copyText?: string
}

export interface WorkGroup {
  heading: string
  items: string[]
}

export interface WorkSection {
  id: string
  no: string
  title: string
  tagline: string
  items?: WorkListItem[]
  groups?: WorkGroup[]
  awards?: string[]
  footer?: string
  /**
   * 封面显示方式：
   *   'cover'（默认）按 3:2 裁切铺满
   *   'contain' 保留原图比例完整显示，容器仍占满固定宽度（两侧可能留深色空带）
   *   'portrait' 竖图专用：容器宽度跟着图收窄、高度按 38vh 封顶，横向不裁也不留空带
   */
  coverFit?: 'cover' | 'contain' | 'portrait'
}

export interface WorksLang {
  title: string
  closeLabel: string
  openLabel: string
  hint: string
  awardsLabel: string
  visitLabel: string
  detailPlaceholder: string
  phImageLabel: string
  phButtonLabel: string
  zoomLabel: string
  copiedLabel: string
  copyHintLabel: string
  countLabel: (n: number) => string
  sections: WorkSection[]
}

export const WORKS: Record<'zh' | 'en', WorksLang> = {
  zh: {
    title: 'Works',
    closeLabel: '返回',
    openLabel: '展开作品',
    hint: '继续下滑',
    awardsLabel: '获奖',
    visitLabel: '访问作品',
    detailPlaceholder: '项目详情待补充',
    phImageLabel: '图片 / 视频',
    phButtonLabel: '跳转按钮',
    zoomLabel: '放大预览：',
    copiedLabel: '已复制到剪贴板',
    copyHintLabel: '点击复制',
    countLabel: (n) => `${n} 件作品`,
    sections: [
      {
        id: 'ad',
        no: '01',
        title: '作品集',
        tagline: '3 个真实落地的项目',
        coverFit: 'contain',
        items: [
          {
            name: 'ERP / WMS 制单自动化中间层',
            meta: 'Python · FastAPI · PostgreSQL',
            slug: 'erp-wms',
          },
          { name: '无限画布', meta: 'Python · 本地部署 · 二次开发', slug: 'infinite-canvas' },
          { name: 'RAG 知识库', meta: 'FastAPI · Milvus · SQLCipher', slug: 'rag-kb' },
        ],
      },
      {
        id: 'product',
        no: '02',
        title: '毛茸茸的朋友',
        tagline: '稳 · 伴 · 乐',
        coverFit: 'portrait',
        items: [
          { name: '牛 · 稳', meta: '不着急', slug: 'cow' },
          { name: '狗 · 伴', meta: '一直在', slug: 'dog' },
          { name: '水獭 · 乐', meta: '玩玩水', slug: 'otter' },
        ],
      },
      {
        id: 'graphics',
        no: '03',
        title: '联系方式',
        tagline: '上海 · 期待交流',
        items: [
          {
            name: '邮箱',
            meta: '150134444@qq.com',
            link: 'mailto:150134444@qq.com',
            copy: true,
          },
          { name: '手机/微信', meta: '13752955432', link: 'tel:13752955432', copy: true },
          {
            name: 'GitHub',
            meta: 'github.com/niumading',
            link: 'https://github.com/niumading',
            copy: true,
            copyText: 'https://github.com/niumading',
          },
        ],
      },
    ],
  },
  en: {
    title: 'Works',
    closeLabel: 'Back',
    openLabel: 'Explore',
    hint: 'Keep scrolling',
    awardsLabel: 'Awards',
    visitLabel: 'Visit site',
    detailPlaceholder: 'Project details coming soon',
    phImageLabel: 'Image / Video',
    phButtonLabel: 'Link button',
    zoomLabel: 'Enlarge: ',
    copiedLabel: 'Copied to clipboard',
    copyHintLabel: 'Click to copy',
    countLabel: (n) => `${n} works`,
    sections: [
      {
        id: 'ad',
        no: '01',
        title: 'Portfolio',
        tagline: 'three real, shipped projects',
        coverFit: 'contain',
        items: [
          {
            name: 'ERP / WMS document automation middle layer',
            meta: 'Python · FastAPI · PostgreSQL',
            slug: 'erp-wms',
          },
          { name: 'Infinite Canvas', meta: 'Python · local deploy · open-source fork', slug: 'infinite-canvas' },
          { name: 'RAG knowledge base', meta: 'FastAPI · Milvus · SQLCipher', slug: 'rag-kb' },
        ],
      },
      {
        id: 'product',
        no: '02',
        title: 'Furry Friends',
        tagline: 'Steady · Loyal · Joy',
        coverFit: 'portrait',
        items: [
          { name: 'Cow · Steady', meta: 'Take it slow', slug: 'cow' },
          { name: 'Dog · Loyal', meta: 'Always here', slug: 'dog' },
          { name: 'Otter · Joy', meta: 'Splash', slug: 'otter' },
        ],
      },
      {
        id: 'graphics',
        no: '03',
        title: 'Contact',
        tagline: 'Shanghai · Say hello',
        items: [
          {
            name: 'Email',
            meta: '150134444@qq.com',
            link: 'mailto:150134444@qq.com',
            copy: true,
          },
          { name: 'Phone / WeChat', meta: '13752955432', link: 'tel:13752955432', copy: true },
          {
            name: 'GitHub',
            meta: 'github.com/niumading',
            link: 'https://github.com/niumading',
            copy: true,
            copyText: 'https://github.com/niumading',
          },
        ],
      },
    ],
  },
}

// 板块配图（横向画廊每张卡片左侧的整高封面）。放到 public/works/covers/ 下。
// 缺图时左栏用大编号渐变占位，放入图片后自动点亮。
// ⚠️ 现有 4 张 jpg 是原作者的个人素材（不在 MIT 范围内），上线前请替换成自己的图。
// 09-24 起板块 02「AI 提效」整块已删，`maker` 取图键一并摘掉
//（`covers/maker.jpg` 文件仍留在磁盘上，板块若要回来直接把它加回来即可）。
export const SECTION_COVERS: Record<string, string> = {
  ad: `${import.meta.env.BASE_URL}works/covers/ad.jpg`,
  product: `${import.meta.env.BASE_URL}works/covers/product.jpg`,
  graphics: `${import.meta.env.BASE_URL}works/covers/graphics.jpg`,
}

// 统计一个板块的作品数（items 或 groups 求和），用于索引行 hover 显示
export function sectionCount(section: WorkSection): number {
  if (section.items) return section.items.length
  if (section.groups) return section.groups.reduce((n, g) => n + g.items.length, 0)
  return 0
}
