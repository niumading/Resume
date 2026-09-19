import { useEffect, useRef, useState, type Ref } from 'react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { WORKS, SECTION_COVERS, type WorkListItem, type WorkSection, type WorksLang } from '../data/works'
import { getWorkDoc } from '../data/workDocs'

const EASE = [0.22, 1, 0.36, 1]

// 复制到剪贴板。优先用异步 Clipboard API —— 但它只在安全上下文可用
// （localhost / https 算安全；用局域网 IP 打开的开发机、http 域名都不算），
// 拿不到就回退到老式 execCommand 方案，否则手机上点「复制」会静默失败。
async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* 落到下面的兜底 */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '-1000px'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    ta.setSelectionRange(0, ta.value.length)
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

// 极简清单的一行：作品名靠左、数据(播放量/标签)靠右、发丝线分隔。
// 三种行：带 copy 的（联系方式）点击复制；带 link 的直接跳转；其余整行点开全屏详情。
function WorkLine({
  item,
  onOpen,
  onCopy,
  copyHintLabel,
}: {
  item: WorkListItem
  onOpen: (item: WorkListItem) => void
  onCopy: (text: string) => void
  copyHintLabel: string
}) {
  const hasMeta = item.meta || (item.tags && item.tags.length)
  const inner = (
    <>
      <span className="wk-line-name">{item.name}</span>
      {hasMeta && (
        <span className="wk-line-meta">
          {item.meta && <span className="wk-line-num">{item.meta}</span>}
          {item.tags &&
            item.tags.map((t, i) => (
              <span key={i} className="wk-line-tag">
                {t}
              </span>
            ))}
        </span>
      )}
    </>
  )

  // 点击整行复制（联系方式）。复制的东西用 copyText 覆盖 meta，可带协议头。
  if (item.copy) {
    const value = item.copyText || item.meta || ''
    // 只有真的能打开的网页外链才给「↗」；mailto / tel 是复制为主，不给第二个入口
    const webLink = item.link && /^https?:/i.test(item.link) ? item.link : null
    return (
      <li className="wk-line">
        <div className="wk-line-row">
          <button
            type="button"
            className="wk-line-btn is-copy"
            title={`${copyHintLabel} · ${value}`}
            aria-label={`${copyHintLabel} · ${value}`}
            onClick={() => {
              void writeClipboard(value).then((ok) => {
                if (ok) onCopy(value)
              })
            }}
          >
            {inner}
          </button>
          {webLink && (
            <a
              className="wk-line-open"
              href={webLink}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${item.name} ↗`}
            >
              ↗
            </a>
          )}
        </div>
      </li>
    )
  }

  return (
    <li className="wk-line">
      {item.link ? (
        <a
          className="wk-line-btn is-link"
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
        >
          {inner}
        </a>
      ) : (
        <button className="wk-line-btn" onClick={() => onOpen(item)}>
          {inner}
        </button>
      )}
    </li>
  )
}

// 一张全高板块卡：左侧整高配图，右侧文字（编号 + 标题 + 清单）
function SectionCard({
  section,
  data,
  onOpen,
  onCopy,
  onZoom,
}: {
  section: WorkSection
  data: WorksLang
  onOpen: (item: WorkListItem) => void
  onCopy: (text: string) => void
  onZoom: (src: string, title: string) => void
}) {
  const [coverError, setCoverError] = useState(false)
  const cover = SECTION_COVERS[section.id]
  // 有真实封面图才可点开放大；占位态无图可放
  const zoomable = Boolean(cover) && !coverError
  // contain：保留原图比例、完整显示不裁切（卡片高度随之自适应）
  // 封面显示方式：缺省 'cover' 按 3:2 裁切铺满；'contain' 原比例完整显示但容器仍占满固定宽度；
  // 'portrait' 竖图专用 —— 容器宽度跟着图收窄，既不裁也不在两侧留深色空带。
  const fit = section.coverFit || 'cover'
  const coverCls = `wk-card-cover${fit === 'contain' ? ' is-natural' : ''}${
    fit === 'portrait' ? ' is-portrait' : ''
  }${zoomable ? ' is-zoomable' : ''}`
  const inner = zoomable ? (
    <img src={cover} alt="" onError={() => setCoverError(true)} />
  ) : (
    <div className="wk-card-cover-ph" aria-hidden="true">
      <span className="wk-card-cover-no">{section.no}</span>
    </div>
  )
  return (
    <div className="wk-card">
      <div className="wk-card-head">
        <span className="wk-card-no">{section.no}</span>
        <h3 className="wk-card-title">{section.title}</h3>
        <span className="wk-card-tagline">{section.tagline}</span>
      </div>
      {zoomable ? (
        <button
          type="button"
          className={coverCls}
          onClick={() => cover && onZoom(cover, section.title)}
          aria-label={`${data.zoomLabel}${section.title}`}
        >
          {inner}
          <span className="wk-card-cover-zoom" aria-hidden="true">
            ⤢
          </span>
        </button>
      ) : (
        <div className={coverCls}>{inner}</div>
      )}
      <SectionWorks section={section} data={data} onOpen={onOpen} onCopy={onCopy} />
    </div>
  )
}

// 板块内的作品清单（items 扁平 / groups 分组 / awards · footer 底部小字）
function SectionWorks({
  section,
  data,
  onOpen,
  onCopy,
}: {
  section: WorkSection
  data: WorksLang
  onOpen: (item: WorkListItem) => void
  onCopy: (text: string) => void
}) {
  return (
    <div className="wk-card-body">
      {section.items && (
        <ul className="wk-list">
          {section.items.map((it, i) => (
            <WorkLine key={i} item={it} onOpen={onOpen} onCopy={onCopy} copyHintLabel={data.copyHintLabel} />
          ))}
        </ul>
      )}

      {section.groups &&
        section.groups.map((g, gi) => (
          <div key={gi} className="wk-sub">
            <div className="wk-sub-head">{g.heading}</div>
            <ul className="wk-list">
              {g.items.map((it, i) => (
                <WorkLine
                  key={i}
                  item={{ name: it }}
                  onOpen={onOpen}
                  onCopy={onCopy}
                  copyHintLabel={data.copyHintLabel}
                />
              ))}
            </ul>
          </div>
        ))}

      {(section.awards || section.footer) && (
        <div className="wk-foot">
          {section.awards && (
            <p className="wk-foot-line">
              <span className="wk-foot-label">{data.awardsLabel}</span>
              <span className="wk-foot-val accent">{section.awards.join('  ·  ')}</span>
            </p>
          )}
          {section.footer && <p className="wk-foot-line">{section.footer}</p>}
        </div>
      )}
    </div>
  )
}

// 全屏沉浸详情：渲染该作品的 md（banner + 标题 + markdown 正文 + 外链）；
// 无 md 时回退到占位 banner + meta/标签简介
function WorkDetail({
  item,
  data,
  onClose,
  onZoom,
}: {
  item: WorkListItem
  data: WorksLang
  onClose: () => void
  onZoom: (src: string, title: string) => void
}) {
  const [bannerError, setBannerError] = useState(false)
  const doc = getWorkDoc(item.slug)
  const title = (doc && doc.title) || item.name
  const banner = doc && doc.banner
  // 有 md 详情时展示完整信息；无 md 时详情页只保留标题 + 统一占位文案
  const link = doc ? doc.link || item.link : null
  const tags = doc ? doc.tags || item.tags : null
  // 副标题不含年份；标签单独做 badge 展示
  const sub = doc ? [item.meta, doc.role].filter(Boolean).join('  ·  ') : ''

  return (
    <>
      <motion.div
        className="wk-detail-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={onClose}
      />
      <motion.div
        className="wk-detail"
        initial={{ opacity: 0, scale: 0.985, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.99, y: 6 }}
        transition={{ duration: 0.42, ease: EASE }}
      >
        <button className="wk-detail-close" onClick={onClose} aria-label={data.closeLabel}>
          ✕
        </button>

        {banner && !bannerError ? (
          // 可点开全屏放大：界面截图上的小字只有放大后读得清（放大层 z-index 高于本层）
          <button
            type="button"
            className={`wk-detail-banner${
              doc?.bannerFit === 'natural'
                ? ' is-natural'
                : doc?.bannerFit === 'portrait'
                  ? ' is-portrait'
                  : ''
            }`}
            onClick={() => onZoom(banner, title)}
            aria-label={`${data.zoomLabel}${title}`}
          >
            <span className="wk-detail-banner-inner">
              <img src={banner} alt={title} onError={() => setBannerError(true)} />
              <span className="wk-detail-banner-zoom" aria-hidden="true">
                ⤢
              </span>
            </span>
          </button>
        ) : (
          <div className="wk-detail-banner is-ph" aria-hidden="true">
            <span className="wk-detail-ph-text">{title}</span>
          </div>
        )}

        <article className="wk-detail-article">
          <header className="wk-detail-head">
            <h3 className="wk-detail-title">{title}</h3>
            {sub && <div className="wk-detail-sub">{sub}</div>}
            {tags && tags.length > 0 && (
              <div className="wk-detail-tags">
                {tags.map((t, i) => (
                  <span key={i} className="wk-badge">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </header>

          {doc && doc.body ? (
            <div className="wk-md">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {doc.body}
              </ReactMarkdown>
            </div>
          ) : (
            // 无 md：演示详情页支持的组件 —— 介绍文本 + 图片/视频占位 + 跳转按钮
            <>
              <p className="wk-detail-desc">{data.detailPlaceholder}</p>
              <div className="wk-detail-ph-img" aria-hidden="true">
                <span className="wk-detail-ph-img-label">{data.phImageLabel}</span>
              </div>
              <span className="wk-detail-link is-ph" role="button" aria-disabled="true">
                {data.phButtonLabel} <span aria-hidden="true">↗</span>
              </span>
            </>
          )}

          {link && (
            <a
              className="wk-detail-link"
              href={link}
              target="_blank"
              rel="noopener noreferrer"
            >
              {data.visitLabel} <span aria-hidden="true">↗</span>
            </a>
          )}
        </article>
      </motion.div>
    </>
  )
}

// 封面放大预览：全屏遮罩 + 居中大图。点遮罩/✕/ESC 关闭，打开时锁滚动
function CoverZoom({
  src,
  title,
  data,
  onClose,
}: {
  src: string
  title: string
  data: WorksLang
  onClose: () => void
}) {
  return (
    <motion.div
      className="wk-zoom"
      role="dialog"
      aria-modal="true"
      aria-label={`${data.zoomLabel}${title}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.24 }}
      onClick={onClose}
    >
      <motion.img
        className="wk-zoom-img"
        src={src}
        alt={title}
        initial={{ opacity: 0, scale: 0.965 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.985 }}
        transition={{ duration: 0.36, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
      />
      <button className="wk-zoom-close" onClick={onClose} aria-label={data.closeLabel}>
        ✕
      </button>
    </motion.div>
  )
}

export default function Works({ lang, innerRef }: { lang: 'en' | 'zh'; innerRef: Ref<HTMLElement> }) {
  const data = WORKS[lang]
  const sections = data.sections
  const count = sections.length

  const [active, setActive] = useState<WorkListItem | null>(null) // 当前打开详情的作品 item
  const [zoomed, setZoomed] = useState<{ src: string; title: string } | null>(null) // 封面放大预览
  // 复制成功后的浮层提示（点联系方式行触发），1.8s 后自动消失
  const [copied, setCopied] = useState<string | null>(null)
  const copiedTimer = useRef<number | null>(null)
  const handleCopied = (text: string) => {
    setCopied(text)
    if (copiedTimer.current) window.clearTimeout(copiedTimer.current)
    copiedTimer.current = window.setTimeout(() => setCopied(null), 1800)
  }
  useEffect(
    () => () => {
      if (copiedTimer.current) window.clearTimeout(copiedTimer.current)
    },
    [],
  )

  // 竖滚 pin 转横移：测量整排卡片的实际可横移距离（px），竖滚进度 → 横移
  const galleryRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: galleryRef,
    offset: ['start start', 'end end'],
  })

  // track 实际宽度 - 视口宽 = 需要横移的距离；随尺寸/语言变化重测
  const [scrollRange, setScrollRange] = useState(0)
  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const measure = () => setScrollRange(Math.max(0, el.scrollWidth - window.innerWidth))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [count, lang])

  // px 数值插值（比 vw 字符串更顺）；竖滚行程与横移 1:1
  const x = useTransform(scrollYProgress, [0, 1], [0, -scrollRange])
  // 横移到底时「继续下滑」提示渐隐
  const hintOpacity = useTransform(scrollYProgress, [0.85, 1], [1, 0])

  // 详情/放大预览打开时锁滚动 + ESC 关闭（ESC 先关最上层的放大预览）
  useEffect(() => {
    if (!active && !zoomed) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (zoomed) setZoomed(null)
      else setActive(null)
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [active, zoomed])

  return (
    <section className="works" lang={lang} ref={innerRef}>
      <div
        className="wk-gallery"
        ref={galleryRef}
        style={{ height: `calc(100vh + ${scrollRange}px)` }}
      >
        <div className="wk-gallery-sticky">
          <span className="wk-gallery-title">{data.title}</span>

          <motion.div className="wk-track" ref={trackRef} style={{ x }}>
            {sections.map((s) => (
              <SectionCard
                key={s.id}
                section={s}
                data={data}
                onOpen={setActive}
                onCopy={handleCopied}
                onZoom={(src, title) => setZoomed({ src, title })}
              />
            ))}
          </motion.div>

          <div className="wk-progress" aria-hidden="true">
            <motion.div className="wk-progress-fill" style={{ scaleX: scrollYProgress }} />
          </div>
          <motion.span className="wk-hint" style={{ opacity: hintOpacity }} aria-hidden="true">
            {data.hint}
          </motion.span>
        </div>
      </div>

      {/* 点击复制反馈：底部居中的胶囊提示，位置固定、不参与卡片布局 */}
      <AnimatePresence>
        {copied && (
          <motion.div
            key={copied}
            className="wk-toast"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: EASE }}
          >
            <span className="wk-toast-tick" aria-hidden="true">
              ✓
            </span>
            <span className="wk-toast-label">{data.copiedLabel}</span>
            <span className="wk-toast-val">{copied}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {zoomed && (
          <CoverZoom
            key={zoomed.src}
            src={zoomed.src}
            title={zoomed.title}
            data={data}
            onClose={() => setZoomed(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {active && (
          <WorkDetail
            key={active.slug || active.name}
            item={active}
            data={data}
            onClose={() => setActive(null)}
            onZoom={(src, title) => setZoomed({ src, title })}
          />
        )}
      </AnimatePresence>
    </section>
  )
}
