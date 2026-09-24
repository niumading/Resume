import { motion } from 'framer-motion'
import { SOCIAL_ICONS } from './SocialIcons'
import { FOCUS_POINTS } from '../data/focusPoints'

// 原作者的个人社交链接（抖音 / B站 / 小红书）已移除——属其个人内容，不在 MIT 范围内。
// 如需展示自己的社交账号，在此加回数组并按 group.links 使用；
// id 必须是 SOCIAL_ICONS 里存在的键（douyin / bilibili / xiaohongshu），否则图标取不到会报错。

// 履历数据（双语）。英文为译稿，可按需润色。
interface ResumeGroup {
  heading?: string
  logoImg?: string
  sub?: string
  link?: string
  items?: string[]
  links?: { id: string; label: string; href: string }[]
  // 主题名用重点色（--accent）渲染。按条开关：只给「项目」类分组开，
  // 像「期望岗位」这类信息型分组保持米白，避免整页到处是金色。
  accent?: boolean
}
interface ResumeEntry {
  period: string
  place: string
  role?: string
  logo?: { src: string; alt: string }
  points?: string[]
  groups?: ResumeGroup[]
}
const RESUME: Record<'en' | 'zh', { title: string; entries: ResumeEntry[] }> = {
  en: {
    title: 'Résumé',
    entries: [
      {
        period: 'Sep 2022 – Oct 2025',
        place: 'Shanghai Chuangjin Supply Chain Management',
        role: 'Project Manager / Supervisor',
        points: [
          'Managing team members & work planning',
          'Incident handling & escalation',
          'Client relationship management',
        ],
      },
      {
        period: 'May 2020 – Aug 2022',
        place: 'Shanghai Shenyou Cold Chain Logistics',
        role: 'Data Entry Clerk',
        points: ['E-commerce order processing', 'Paper document entry & verification'],
      },
      {
        period: '2006 – 2009',
        place: 'Secondary Technical School',
        role: 'Vocational diploma',
      },
      {
        period: '2025 – Now',
        place: 'Vibe Coding',
        groups: [
          {
            heading: 'ERP / WMS document automation middle layer',
            sub: 'designed & shipped 0 → 1',
            accent: true,
            items: [
              'Replaced manual line-by-line entry of paper documents into ERP',
              'Automated return-order creation end to end',
            ],
          },
          {
            heading: 'Infinite Canvas',
            sub: 'open-source base; internal version built and maintained by me',
            accent: true,
            items: [
              'Runs locally for staff; aggregates Jimeng CLI / local ComfyUI / ModelScope',
              'Added mannequin export endpoint & local short-drama service',
            ],
          },
          {
            heading: 'RAG Knowledge Base · personal knowledge Q&A',
            sub: 'local-first, answers trace back to source',
            accent: true,
            items: [
              'Every answer carries original-text citations; states "unknown" when evidence is insufficient',
              'SQLCipher-encrypted store; cloud inference needs per-document opt-in of minimal passages',
            ],
          },
        ],
      },
      {
        period: '2026 – Now',
        place: 'Open to opportunities',
        groups: [
          {
            heading: 'AI Product Manager / Supply Chain',
            sub: 'target role',
            items: ['LangChain · LangGraph · RAG', 'Shanghai · 15–20K'],
          },
        ],
      },
    ],
  },
  zh: {
    title: 'Résumé',
    entries: [
      // ⚠️ 此数组顺序 = 页面从上到下的模块顺序，同时通过 POINT_ORDER[index]
      //    映射到 glb 里的 focus 锚点（相机停靠点）。调换模块只需调换数组元素，
      //    不要动 data-point：相机运镜顺序保持不变，只是各停靠点显示的内容变了。
      {
        period: '2022年9月 – 2025年10月',
        place: '上海创进供应链管理有限公司',
        role: '项目经理 / 主管',
        points: ['管理部门员工、制定工作计划', '突发状况处理', '客户关系维护'],
      },
      {
        period: '2020年5月 – 2022年8月',
        place: '上海神邮冷藏物流有限公司',
        role: '录入员',
        points: ['电商订单处理', '纸质单据录入与核对'],
      },
      {
        period: '2006 – 2009',
        place: '中专 / 中技',
        role: '学历',
      },
      {
        period: '2025 – 至今',
        place: 'Vibe Coding',
        groups: [
          {
            heading: 'ERP / WMS 制单自动化中间层',
            sub: '从 0 到 1 设计并上线',
            accent: true,
            items: ['替代纸质单据人工逐行录入 ERP', '退货单自动制作，流程打通'],
          },
          {
            heading: '无限画布',
            sub: '基于开源底座，由我独立改造并维护',
            accent: true,
            items: [
              '面向公司员工本地运行，聚合即梦 CLI / 本地 ComfyUI / ModelScope',
              '新增白模导出接口与本地短剧服务',
            ],
          },
          {
            heading: 'RAG 知识库 · 个人知识问答',
            sub: '本地优先，答案可回溯原文',
            accent: true,
            items: [
              '每条回答附原文引用，依据不足时明确回答「不知道」',
              'SQLCipher 加密存储，云端推理需按资料逐份授权最小片段',
            ],
          },
        ],
      },
      {
        period: '2026 – 至今',
        place: '求职方向',
        groups: [
          {
            heading: 'AI 产品经理 / 供应链',
            sub: '期望岗位',
            items: ['LangChain · LangGraph · RAG', '上海 · 15–20K'],
          },
        ],
      },
    ],
  },
}

// 履历条目依次对应 glb 里的聚焦锚点（相机停靠点），顺序须与 entries 一致。
// 名单是唯一真源，见 data/focusPoints.ts（Scene.tsx 也从那里取）。
const POINT_ORDER = FOCUS_POINTS

const EASE = [0.22, 1, 0.36, 1]
const containerV = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.04 } },
}
const itemV = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE } },
}

function Group({ group }: { group: ResumeGroup }) {
  const cls = group.accent ? 'is-accent' : undefined
  const heading = group.link ? (
    <a
      className={cls ? `about-link ${cls}` : 'about-link'}
      href={group.link}
      target="_blank"
      rel="noopener noreferrer"
    >
      {group.heading}
    </a>
  ) : (
    <span className={cls}>{group.heading}</span>
  )

  return (
    <motion.div className="tl-group" variants={itemV}>
      <div className="tl-group-head">
        {group.logoImg && (
          <span className="tl-group-logo">
            <img src={group.logoImg} alt={group.heading || ''} loading="lazy" />
          </span>
        )}
        {heading}
        {group.sub && <span className="tl-group-sub">{group.sub}</span>}
      </div>
      {group.items && (
        <ul className="tl-points">
          {group.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      )}
      {group.links && (
        <div className="tl-logos">
          {group.links.map((l) => {
            const Icon = SOCIAL_ICONS[l.id as keyof typeof SOCIAL_ICONS]
            return (
              <a
                key={l.id}
                className="tl-logo"
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={l.label}
                title={l.label}
              >
                <Icon />
              </a>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

function Entry({ entry, index }: { entry: ResumeEntry; index: number }) {
  return (
    <motion.div
      className="tl-entry"
      data-point={POINT_ORDER[index]}
      variants={containerV}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-12% 0px -12% 0px' }}
    >
      <motion.span className="tl-dot" variants={itemV} aria-hidden="true" />
      {/* tl-body 包住文字内容（点保持在外做时间轴标记）：移动端可给它加卡片衬底，
          且它紧贴内容高度，不含 tl-entry 用于排布的大 padding。
          用普通 div（非 motion）：framer 变体经 React context 穿透它，叶子元素仍是
          tl-entry 的直接 stagger 子级，入场动画与包裹前完全一致。 */}
      <div className="tl-body">
        <motion.div className="tl-period" variants={itemV}>
          {entry.period}
        </motion.div>
        <motion.div className="tl-head" variants={itemV}>
          {entry.logo && (
            <span className="tl-logo-chip">
              <img src={entry.logo.src} alt={entry.logo.alt} loading="lazy" />
            </span>
          )}
          <h3 className="tl-place">{entry.place}</h3>
        </motion.div>
        {entry.role && (
          <motion.div className="tl-role" variants={itemV}>
            {entry.role}
          </motion.div>
        )}
        {entry.points && (
          <motion.ul className="tl-points" variants={itemV}>
            {entry.points.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </motion.ul>
        )}
        {entry.groups && entry.groups.map((g, i) => <Group key={i} group={g} />)}
      </div>
    </motion.div>
  )
}

export default function Resume({ lang }: { lang: 'en' | 'zh' }) {
  const data = RESUME[lang]
  return (
    <section className="resume" lang={lang}>
      <motion.h2
        className="resume-title"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-10% 0px' }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        {data.title}
      </motion.h2>
      <div className="timeline">
        {data.entries.map((e, i) => (
          <Entry key={i} entry={e} index={i} />
        ))}
      </div>
    </section>
  )
}
