import { useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'

// 全屏加载遮罩：读取 three LoadingManager 进度（useProgress），
// 模型/贴图全部加载完（进度到过 100）后淡出并卸载，确保进入时场景已就绪。
// 纯动态 UI：随真实进度填充的旋转圆环，无文字。
// 用 CSS 过渡 + setTimeout 控制淡出/卸载（不依赖 rAF，后台/离屏也可靠）。
export default function LoadingScreen() {
  const { progress } = useProgress()
  // reached：进度是否到过 100%（单向 false→true，避免分批加载的抖动）
  const [reached, setReached] = useState(false)
  const [hiding, setHiding] = useState(false) // 开始淡出
  const [removed, setRemoved] = useState(false) // 彻底卸载
  // 记录最高进度，防止分批注册资源时圆环回缩
  const peak = useRef(0)
  peak.current = Math.max(peak.current, Math.min(Math.max(progress, 0), 100))

  useEffect(() => {
    if (progress >= 100) setReached(true)
  }, [progress])

  // 到过 100% 后：停留片刻 → 淡出 → 卸载（一次性，锁定不受后续进度变化影响）
  useEffect(() => {
    if (!reached) return
    const t1 = setTimeout(() => setHiding(true), 400)
    const t2 = setTimeout(() => setRemoved(true), 1100)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [reached])

  if (removed) return null

  const R = 34
  const C = 2 * Math.PI * R
  const offset = C * (1 - peak.current / 100)

  return (
    <div className={`loading-screen${hiding ? ' is-hidden' : ''}`} aria-hidden="true">
      <div className="loading-ring">
        <svg viewBox="0 0 80 80">
          <circle className="lr-track" cx="40" cy="40" r={R} />
          <circle
            className="lr-arc"
            cx="40"
            cy="40"
            r={R}
            style={{ strokeDasharray: C, strokeDashoffset: offset }}
          />
        </svg>
      </div>
    </div>
  )
}
