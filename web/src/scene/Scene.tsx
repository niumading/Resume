import { Suspense, useMemo, useRef, useEffect, type MutableRefObject } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { EffectComposer, Bloom, DepthOfField, SMAA } from '@react-three/postprocessing'
import * as THREE from 'three'
import Env from './Env'
import { FOCUS_POINTS, FRAMES_PER_NODE } from '../data/focusPoints'

useGLTF.preload(`${import.meta.env.BASE_URL}models/me.glb`)

// 聚焦锚点（glb 内 focus-* 空对象），顺序对应履历节点；名单是唯一真源，见 data/focusPoints.ts
const POINTS = FOCUS_POINTS as readonly string[]
const M = POINTS.length // 时间轴节点数（= 履历条数），从名单推导，不写死
const RESUME_FRAMES = M * FRAMES_PER_NODE // 履历区帧数：每节点 FRAMES_PER_NODE 帧（节点 k → 第 k·50 帧）
const WORKS_ENTRANCE = 50 // 作品区"入场"（画廊屏幕从底部滑入覆盖）占的帧数
const FPS = 24 // 所有 clip @24fps 共享时间轴；相机动画总帧数运行时从 CameraAction clip 读（见 totalFrames）
const NODE_LINE = 0.3 // 节点"终点"参考线：条目顶部到达视口该高度(从上 30%)时锁定为该节点

// 背景配色预设：换风格只改 BG_PRESET 一行
//   clay  陶土  —— 暖红棕 → 米白，有温度、够大胆
//   night 子夜  —— 深青蓝 → 暖沙，冷暖强对比、戏剧感
//   mist  紫雾  —— 灰紫 → 暖米，克制、高级
//   sage  灰绿  —— 原作配色保留项
//   dune  暖沙  —— 浅暖沙驼，配 --ink-hero 深棕字，首屏文案最清晰
//   slate 冷雾  —— 浅冷灰，人物暖肤与白 T 恤在冷底上更跳，字同样清楚
//   amber 暖驼  —— 中等明度暖驼，兼顾暖调与人物轮廓（不似 dune 那样与白 T 恤黏连）
const BG_PRESETS = {
  clay: { top: '#7d4436', mid: '#c08a63', bottom: '#f2e6d2', accent: '#ffcf9a' },
  night: { top: '#17303d', mid: '#4e7f86', bottom: '#efdfc4', accent: '#84e0cd' },
  sky: { top: '#1a3f66', mid: '#4a86b8', bottom: '#e6f2fb', accent: '#ffd166' },
  mist: { top: '#453a5e', mid: '#9c8ea8', bottom: '#f4ece0', accent: '#d9c6f0' },
  sage: { top: '#6f906f', mid: '#c3c9a4', bottom: '#dbd3b5', accent: '#fff3c4' },
  dune: { top: '#9c6b47', mid: '#d9bd97', bottom: '#f6efe2', accent: '#ffe2b0' },
  slate: { top: '#6f737d', mid: '#b9bcc0', bottom: '#f2f1ef', accent: '#dfe6ea' },
  amber: { top: '#8a5a3c', mid: '#c2a184', bottom: '#efe3d0', accent: '#ffd7a2' },
} as const

// 当前默认背景（改这一行即换风格）。带 ?bg=clay 可临时切换任意预设、用于对比。
const BG_DEFAULT: keyof typeof BG_PRESETS = 'sky'
const BG_PRESET: keyof typeof BG_PRESETS = (() => {
  if (typeof window === 'undefined') return BG_DEFAULT
  const v = new URLSearchParams(window.location.search).get('bg')
  return v && v in BG_PRESETS ? (v as keyof typeof BG_PRESETS) : BG_DEFAULT
})()

// 上下渐变背景球（包裹相机）：三段渐变 + 斜向柔带 + 颗粒去 banding
function GradientBackground() {
  const PRESET = BG_PRESET
  const { top, mid, bottom, accent } = BG_PRESETS[PRESET]

  // glb 相机视角很窄(~23°)，只看到渐变中间一条；陡度把可见窄带拉伸出完整过渡
  const steep = 1.4
  const bandAmt = 0.06 // 斜向柔带强度（0 = 关）
  const grainAmt = 0.032 // 颗粒强度，压掉渐变色阶

  const uniforms = useMemo(
    () => ({
      uTop: { value: new THREE.Color() },
      uMid: { value: new THREE.Color() },
      uBottom: { value: new THREE.Color() },
      uAccent: { value: new THREE.Color() },
      uSteep: { value: 1 },
      uBand: { value: 0 },
      uGrain: { value: 0 },
    }),
    []
  )
  uniforms.uTop.value.set(top)
  uniforms.uMid.value.set(mid)
  uniforms.uBottom.value.set(bottom)
  uniforms.uAccent.value.set(accent)
  uniforms.uSteep.value = steep
  uniforms.uBand.value = bandAmt
  uniforms.uGrain.value = grainAmt

  return (
    <mesh scale={100}>
      <sphereGeometry args={[1, 32, 32]} />
      <shaderMaterial
        side={THREE.BackSide}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={/* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={/* glsl */ `
          uniform vec3 uTop;
          uniform vec3 uMid;
          uniform vec3 uBottom;
          uniform vec3 uAccent;
          uniform float uSteep;
          uniform float uBand;
          uniform float uGrain;
          varying vec3 vDir;

          float hash21(vec2 p) {
            p = fract(p * vec2(123.34, 456.21));
            p += dot(p, p + 45.32);
            return fract(p.x * p.y);
          }

          void main() {
            vec3 d = normalize(vDir);
            // 以地平线(y=0)为中心按陡度拉伸，narrow-fov 下也能看到完整过渡
            float t = clamp(d.y * uSteep * 0.5 + 0.5, 0.0, 1.0);
            // 三段渐变：底 → 中 → 顶，比双色更有层次
            vec3 col = t < 0.5
              ? mix(uBottom, uMid, t * 2.0)
              : mix(uMid, uTop, (t - 0.5) * 2.0);

            // 斜向柔带：给渐变加一点"印刷/riso"的肌理，越靠上越明显
            float ang = atan(d.z, d.x);
            float b = sin(ang * 3.0 + d.y * 9.0) * 0.5 + 0.5;
            col = mix(col, uAccent, uBand * b * (0.3 + 0.7 * t));

            // 颗粒：屏幕空间采样，稳定不流动，专门消掉渐变色阶
            col += (hash21(gl_FragCoord.xy) - 0.5) * uGrain;

            gl_FragColor = vec4(col, 1.0);
          }
        `}
      />
    </mesh>
  )
}

// 所有光源（HDRI 环境 + 半球 + 主/补方向光）
function Lights() {
  const c = {
    envIntensity: 0.85,
    hemiIntensity: 1.15,
    hemiSky: '#ffffff',
    hemiGround: '#404040',
    keyIntensity: 2.35,
    keyColor: '#ffd9c6',
    keyPos: [5, 8, 5] as [number, number, number],
    fillIntensity: 2.25,
    fillColor: '#9fc6ff',
    fillPos: [-5, 4, -4] as [number, number, number],
  }

  return (
    <>
      <Env
        intensity={c.envIntensity}
        rotationX={0}
        rotationY={0}
        rotationZ={0}
        asBackground={false}
        bgIntensity={0.4}
        bgBlur={0}
      />
      <hemisphereLight args={[c.hemiSky, c.hemiGround, c.hemiIntensity]} />
      <directionalLight
        position={c.keyPos}
        intensity={c.keyIntensity}
        color={c.keyColor}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight position={c.fillPos} intensity={c.fillIntensity} color={c.fillColor} />
    </>
  )
}

// 表情调试开关：URL 带 ?expr=0.8 可强制表情强度（0–1），用来单独看笑容效果；不带则走默认逻辑
const FORCE_EXPR = (() => {
  if (typeof window === 'undefined') return -1
  const v = new URLSearchParams(window.location.search).get('expr')
  return v === null ? -1 : Number(v)
})()

// 头部变形 GLSL（注入身体网格的 MeshStandardMaterial 顶点着色器）：
//   hRotate —— 按高度权重绕颈部枢轴旋转，做出「转头」；肩膀以下权重为 0，身体纹丝不动
//   hExpr   —— 嘴/眼区域的顶点位移，做出夸张笑容（下唇下拉 + 嘴角上提 + 眯眼 + 颊部外扩）
// 区域坐标由 analyze_head.py 实测：脖子 y 0.06–0.22、眼 y≈0.62、嘴 y≈0.38–0.46、脸前沿 z≈0.397
const HEAD_GLSL = /* glsl */ `
uniform float uYaw;
uniform float uPitch;
uniform float uExpr;
uniform vec3 uPivot;
uniform vec2 uNeck;

// 带通：lo..hi 之间为 1，两端模糊过渡
float hBand(float x, float lo, float hi, float blur) {
  return smoothstep(lo - blur, lo + blur, x) * (1.0 - smoothstep(hi - blur, hi + blur, x));
}

vec3 hRotate(vec3 p, float w) {
  float a = uYaw * w;
  float ca = cos(a), sa = sin(a);
  p = vec3(p.x * ca + p.z * sa, p.y, -p.x * sa + p.z * ca);
  float b = uPitch * w;
  float cb = cos(b), sb = sin(b);
  return vec3(p.x, p.y * cb - p.z * sb, p.y * sb + p.z * cb);
}

// 两次翻车记录：① 压缩眼睑 → 怒目三角眼；② 上提脸颊 → 眼周被带歪 + 几何破洞。
// 根因是这个模型的五官几乎全靠贴图承载，几何一动贴图就错位。
// 现在只保留唯一安全的一种形变：提嘴角。区域严格收在嘴的高度（上界含模糊 0.495，
// 离眼下沿 0.53 还有余量），中央不动、只抬两侧，幅度克制。
vec3 hExpr(vec3 p) {
  if (uExpr < 0.001) return p;
  float e = uExpr;
  float faceW = smoothstep(0.16, 0.28, p.z);           // 只在脸正面生效，后脑不动
  float sideW = 1.0 - smoothstep(0.17, 0.27, abs(p.x)); // 不越出脸宽

  float wM = hBand(p.y, 0.28, 0.46, 0.035) * faceW * sideW;
  if (wM > 0.0) {
    float corner = smoothstep(0.05, 0.15, abs(p.x));
    p.y += e * wM * corner * 0.03;
    p.z += e * wM * corner * 0.008;
  }
  return p;
}
`;

// 原作者遗留的贴纸平面（节点 sticker0…sticker14 / 材质「贴纸1·贴纸2」）整组隐藏。
//
// 实测真相：这 15 个节点是**孤儿** —— glb 的 scenes[0].nodes 只有 [Camera, man]，
// 它们既不在场景图里、也不在 man.children 中（man 的子节点只有 eye1/eye2 + focus-*），
// 所以 three.js 根本没加载它们，这段遍历其实是 no-op。
// 保留它是因为：一旦换成自带贴纸的正确场景图模型，这里就能兜住。
// 顺带一提：它们是原作者的个人品牌贴纸（I❤SYSU / HOTSAR / ZOOOP / 抖音）。
// 当初把贴脸特写里的两块白斑误判成这批贴纸，真凶其实是**眼球**（见下方 /eye/i 分支）。
const STICKER_NODE_RE = /^sticker\d+$/i
const STICKER_MAT_RE = /^贴纸/
function hideLegacyStickers(root: THREE.Object3D) {
  root.traverse((o: any) => {
    if (STICKER_NODE_RE.test(o.name || '')) {
      o.visible = false
      return
    }
    if (o.isMesh) {
      const ms = Array.isArray(o.material) ? o.material : [o.material]
      if (ms.some((m: any) => m && STICKER_MAT_RE.test(m.name || ''))) o.visible = false
    }
  })
}

// me.glb：模型 + glb 自带相机动画（滚动分 5 段擦除）+ 自动对焦 + 眼睛跟随
function Man2({
  focusRef,
  frameRef,
  dofBokehRef,
  dofRangeRef,
}: {
  focusRef: MutableRefObject<THREE.Vector3>
  frameRef: MutableRefObject<number>
  dofBokehRef: MutableRefObject<number>
  dofRangeRef: MutableRefObject<number>
}) {
  const posX = 0
  const posY = 0.4
  const posZ = -0.7
  const scale = 2.25
  const rotationY = 0

  // mobilePullback：移动端相机沿「焦点→相机」方向拉远的倍率（1 = 不变，1.2 = 远 20%）
  // mobileTimelineShift：移动端「时间轴阶段」相机水平位移，单位=视距占比（正=左移，负=右移，0=关）
  const cam = {
    damping: 0.1,
    dwell: 0.35,
    parallax: 4,
    parallaxEase: 0.1,
    mobilePullback: 1.2,
    mobileTimelineShift: 0.12,
  }

  // 眼球跟随：代码保留，但当前 model 里眼球网格已隐藏（见下方 /eye/i 分支），
  // 因此这一项现在没有可见效果 —— 脸部的眼睛是贴图烘的。留档以备换成自带眼球的模型。
  const eye = {
    enabled: true,
    gain: 3,
    maxYaw: 15,
    maxPitch: 8,
    invertX: false,
    invertY: false,
    smooth: 0.44,
    crossEye: 45,
    crossRadius: 0.25,
  }

  // 头部跟随：用顶点着色器把「脖子以上」的顶点绕枢轴旋转（不是转节点）。
  // 这样 focus-* 锚点一毫米都不动 → 相机运镜/对焦完全不受影响。
  const head = {
    enabled: true,
    maxYaw: 9, // 左右最大转角（度）。再大下巴和脖子之间会露缝（模型脖子是 AI 猜的）
    maxPitch: 5, // 上下最大俯仰（度）
    smooth: 0.05, // 缓动系数，越小越跟手
  }

  // 顶点形变式表情：**默认关闭**，两次实测都翻车。
  // 这个模型的五官几乎全靠贴图承载，几何一动（哪怕只推脸颊、不碰眼睛）眼周顶点也会
  // 被带着挤歪，出现三角吊眼 + 几何破洞。写实贴图 + 浅几何不适合做顶点变形表情。
  // 想要表情，正确做法是换一个带表情的模型重新生成（gen3d.py + inject_avatar.py）。
  // 代码保留：若以后换成高模/自雕模型，打开 enabled 即可。
  const expr = {
    enabled: false,
    base: 0.5, // 常驻微笑强度（0 = 面无表情）
    peak: 1.0, // 鼠标停在画面中心时的强度
    radius: 0.9, // 鼠标距中心多远以内开始加成（NDC 单位，1 ≈ 半个屏幕宽）
    smooth: 0.04, // 变化缓动
  }

  // 传给材质 uniform 的共享对象（注入顶点着色器后用）
  const headU = useMemo(
    () => ({
      uYaw: { value: 0 },
      uPitch: { value: 0 },
      uExpr: { value: 0 },
      uPivot: { value: new THREE.Vector3(0, 0.22, 0.12) }, // 颈部枢轴（模型局部坐标）
      uNeck: { value: new THREE.Vector2(0.02, 0.3) }, // 肩(不动) → 头(全跟随) 的高度过渡区
    }),
    []
  )

  const get = useThree((s) => s.get)
  // 仅开发环境暴露 scene/camera：_verify/probe_face.mjs / probe_scan.mjs 靠它做
  // 「屏幕坐标 → 模型局部坐标」的射线拾取。要往脸上精确定位任何东西（贴片、锚点、
  // 热点）都得走这条链——纯看顶点云分不清脸的实际结构。生产构建里不含这段。
  if (import.meta.env.DEV) {
    ;(window as any).__dbg = { get }
  }
  const { scene, animations } = useGLTF(`${import.meta.env.BASE_URL}models/me.glb`)

  // 克隆模型；收集眼睛对象、聚焦锚点对象、glb 自带相机、各锚点景深开关
  const { model, eyes, points, startPoint, glbCam, focusNode, dof } = useMemo(() => {
    const clone = scene.clone(true)
    // 先把遗留贴纸平面整组关掉，再做其余遍历（隐藏必须在 clone 上做，不能污染 useGLTF 缓存）
    hideLegacyStickers(clone)
    const eyes: any[] = []
    const pmap: Record<string, any> = {}
    let startPoint: any = null
    let glbCam: any = null
    let focusNode: any = null
    clone.traverse((o: any) => {
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
      }
      // 身体网格：注入头部变形顶点着色器。
      // 注意：头部跟随只是这一段顶点着色器在形变「身体网格」本身，它形变不到任何
      // 独立子网格。所以将来若再往脸上加贴片，必须让它也走这里 —— 否则皮肤跟着
      // 着色器转走、贴片留在原地，表现就是「一动就穿模」（眼球白斑是同一个病根）。
      if (o.isMesh && o.name === 'man') {
        const src = Array.isArray(o.material) ? o.material[0] : o.material
        const m = src.clone()
        m.onBeforeCompile = (shader: any) => {
          shader.uniforms.uYaw = headU.uYaw
          shader.uniforms.uPitch = headU.uPitch
          shader.uniforms.uExpr = headU.uExpr
          shader.uniforms.uPivot = headU.uPivot
          shader.uniforms.uNeck = headU.uNeck
          shader.vertexShader = shader.vertexShader
            .replace('#include <common>', `#include <common>\n${HEAD_GLSL}`)
            .replace(
              '#include <beginnormal_vertex>',
              `#include <beginnormal_vertex>
               {
                 float hwN = smoothstep(uNeck.x, uNeck.y, position.y);
                 if (hwN > 0.0) objectNormal = hRotate(objectNormal, hwN);
               }`
            )
            .replace(
              '#include <begin_vertex>',
              `#include <begin_vertex>
               {
                 float hw = smoothstep(uNeck.x, uNeck.y, transformed.y);
                 transformed = hExpr(transformed);
                 if (hw > 0.0) transformed = uPivot + hRotate(transformed - uPivot, hw);
               }`
            )
        }
        m.customProgramCacheKey = () => 'manHeadDeform'
        o.material = m
      }
      if (o.isCamera) glbCam = o
      // 首页锚点：兼容旧名 focus-start 与 intro3d 统一命名 focus-0
      if (o.name === 'focus-start' || o.name === 'focus-0') startPoint = o
      if (o.name === 'focus-works') focusNode = o
      if (POINTS.includes(o.name)) pmap[o.name] = o
      if (/eye/i.test(o.name)) {
        // 原作者遗留的眼球网格必须隐藏（与 inject_avatar.py 的 --eyes hide 默认一致）：
        // 它们是两个孤立小球（半径 ≈0.056，位于模型局部 y 0.486 / z 0.237），而新脸的
        // 眼睛是烘在贴图上的、并非由它们承担。头部跟随走的是顶点着色器 —— 只动身体网格，
        // 这两个小球不跟着转，于是镜头或头部一动就从额头/眼睑顶出来，看起来就是两块
        // 白斑「穿模」（实测：mouse 移到画面上下两端时最明显）。
        o.visible = false
        // 平滑着色：重算平滑顶点法线 + 关闭 flatShading
        if (o.isMesh) {
          o.geometry.computeVertexNormals()
          const mats = Array.isArray(o.material) ? o.material : [o.material]
          mats.forEach((m: any) => {
            m.flatShading = false
            m.needsUpdate = true
          })
        }
        eyes.push({ obj: o, base: o.quaternion.clone(), x: o.position.x })
      }
    })
    // 按本地 x 定左右：最左眼 sx=-1、最右眼 sx=+1，用于斗鸡眼内转方向
    if (eyes.length > 1) {
      const xs = eyes.map((e) => e.x)
      const min = Math.min(...xs)
      const max = Math.max(...xs)
      const mid = (min + max) / 2
      eyes.forEach((e) => {
        e.sx = e.x < mid ? -1 : 1
      })
    } else {
      eyes.forEach((e) => (e.sx = 0))
    }
    const pts = POINTS.map((n) => pmap[n] || null)
    // 作品区锚点：优先 focus-works（旧 glb）；缺省（intro3d 统一命名不导）则复用末时间轴节点 focus-M。
    const works = focusNode || pts[pts.length - 1] || null
    // 首页锚点：focus-start / focus-0；都没有则回退首个时间轴节点。
    const start = startPoint || pts[0] || null
    // 逐锚点景深参数（intro3d 导出写入 userData/extras）：dofBokeh 虚化强度、dofFocusRange 清晰范围、
    // dofEnabled 开关（关→有效 bokeh 记 0）。has=false（老 glb 无这些字段）→ Post2 走原全局帧混合，行为不变。
    const ud = (o: any): any => o?.userData ?? {}
    const hasDofParams = [...pts, start, works].some((o) => ud(o).dofBokeh !== undefined)
    const effBokeh = (o: any): number => (ud(o).dofEnabled === false ? 0 : (ud(o).dofBokeh ?? 0))
    const effRange = (o: any): number => ud(o).dofFocusRange ?? 0
    return {
      model: clone,
      eyes,
      points: pts,
      startPoint: start,
      glbCam,
      focusNode: works,
      dof: {
        has: hasDofParams,
        bokeh: pts.map(effBokeh),
        range: pts.map(effRange),
        startBokeh: effBokeh(start),
        startRange: effRange(start),
        worksBokeh: effBokeh(works),
        worksRange: effRange(works),
      },
    }
  }, [scene, headU])

  // 相机动画总帧数：从 CameraAction clip 读（回退到最长 clip / 默认履历+入场+横移），不写死。
  // 作品区帧段 = [RESUME_FRAMES, totalFrames]，长度随 glb 而定（当前 me.glb 为 100 帧）。
  const totalFrames = useMemo(() => {
    const clips: any[] = animations || []
    const cam = clips.find((c: any) => c.name === 'CameraAction')
    const clip = cam || (clips.length ? clips.reduce((a, b) => (b.duration > a.duration ? b : a)) : null)
    return clip ? Math.round(clip.duration * FPS) : RESUME_FRAMES + 2 * WORKS_ENTRANCE
  }, [animations])

  // 动画混合器：把全部 clip（manAction + CameraAction）都挂上，逐帧设 time + update(0) 擦除
  const mixer = useMemo(() => new THREE.AnimationMixer(model), [model])
  const actions = useRef<any[]>([])
  useEffect(() => {
    if (!animations || animations.length === 0) return
    mixer.stopAllAction()
    actions.current = animations.map((clip) => {
      const a = mixer.clipAction(clip)
      a.play()
      a.paused = true
      return { action: a, duration: clip.duration }
    })
    return () => {
      mixer.stopAllAction()
      actions.current = []
    }
  }, [mixer, animations])

  // 不切换激活相机（避免后处理 CoC 缓存旧相机 near/far 导致整体糊）。
  // 改为每帧把 glb 相机的世界变换 + fov 拷到默认相机上。

  // window 级鼠标输入（smouse 为缓动后的值）
  const mouse = useRef({ x: 0, y: 0 })
  const smouse = useRef({ x: 0, y: 0 })
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.current.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  // 移动端 / 触屏（无鼠标可跟随）：关闭眼睛跟随，眼睛保持默认朝向。
  // 判定 = 触屏指针 或 窄视口（≤640px，与移动端样式断点一致）。
  const isMobile = useRef(
    typeof window !== 'undefined' &&
      (window.matchMedia?.('(pointer: coarse)').matches === true ||
        window.innerWidth <= 640)
  )

  // 履历锚点 DOM 元素（决定当前播放到第几段）
  const anchorEls = useRef<any>(null)
  // 作品区画廊 DOM 元素（决定作品入场 / 横移阶段的帧）
  const galleryEl = useRef<any>(null)

  // 复用对象，避免每帧分配
  const frameSmooth = useRef(0)
  const posA = useRef(new THREE.Vector3())
  const posB = useRef(new THREE.Vector3())

  // 头部跟随的当前角度（自带缓动，与眼球各自独立）
  const hYaw = useRef(0)
  const hPitch = useRef(0)

  const tmpEuler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))
  const tmpQuat = useRef(new THREE.Quaternion())
  const desiredQuat = useRef(new THREE.Quaternion())
  const tmpVec = useRef(new THREE.Vector3())

  // 拷贝 glb 相机世界变换用
  const camPos = useRef(new THREE.Vector3())
  const camQuat = useRef(new THREE.Quaternion())
  const camScl = useRef(new THREE.Vector3())
  const paraEuler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))
  const paraQuat = useRef(new THREE.Quaternion())

  useFrame((_, dt) => {
    const a = 1 - Math.pow(cam.damping, dt)

    // 1) 由履历锚点（文档坐标）算连续索引 s：
    //    顶部 s≈-1，sysu 居中 s=0，hotsar=1 … zooop=4
    if (!anchorEls.current) {
      anchorEls.current = POINTS.map((n) => document.querySelector(`[data-point="${n}"]`))
    }
    const els = anchorEls.current
    // 节点停顿：对每段滚动做停顿重映射——靠近某节点的一段滚动里 s 保持不变（停顿），
    // 段中部快速过渡到下一节点。只改"滚动→s"的节奏，glb 动画仍是 s 的线性函数。
    const d = THREE.MathUtils.clamp(cam.dwell, 0, 0.49)
    const dwell = (t: number) => {
      if (d <= 0) return t
      if (t < d) return 0
      if (t > 1 - d) return 1
      return THREE.MathUtils.smoothstep((t - d) / (1 - 2 * d), 0, 1)
    }
    let sTarget = THREE.MathUtils.clamp(frameSmooth.current / FRAMES_PER_NODE - 1, -1, M - 1)
    if (els && els.length === M && els.every(Boolean)) {
      // 参考线在视口 NODE_LINE 高度；锚点用条目顶部（文字位置，不含底部大 padding）
      const refLine = window.scrollY + window.innerHeight * NODE_LINE
      const tops = els.map((el: any) => el.getBoundingClientRect().top + window.scrollY)
      if (refLine <= tops[0]) {
        // 顶部 → sysu 的渐入段：scrollY=0 时 s=-1（第 0 帧），sysu 到达参考线时 s=0
        const heroScroll = Math.max(1, tops[0] - window.innerHeight * NODE_LINE)
        sTarget = -1 + dwell(THREE.MathUtils.clamp(window.scrollY / heroScroll, 0, 1))
      } else if (refLine >= tops[M - 1]) {
        sTarget = M - 1
      } else {
        for (let i = 0; i < M - 1; i++) {
          if (refLine <= tops[i + 1]) {
            const t = (refLine - tops[i]) / Math.max(1, tops[i + 1] - tops[i])
            sTarget = i + dwell(t)
            break
          }
        }
      }
    }
    // 2) 帧驱动：先算"目标帧"（履历/作品统一，交界处两侧都是 RESUME_FRAMES → 连续），
    //    再对最终帧做一次缓动——避免之前"平滑 s + 直读 rectTop"两路径不一致导致的瞬跳。
    //    履历区 0–RESUME_FRAMES（节点 i→(i+1)·50）；作品区 = 入场（屏幕滑入）+ 首板块横移，直到末帧
    let frameTarget = THREE.MathUtils.clamp((sTarget + 1) * FRAMES_PER_NODE, 0, RESUME_FRAMES)
    let inWorks = false
    if (!galleryEl.current) galleryEl.current = document.querySelector('.wk-gallery')
    if (galleryEl.current) {
      const ih = window.innerHeight
      const rectTop = galleryEl.current.getBoundingClientRect().top
      const range = Math.max(0, galleryEl.current.offsetHeight - ih)
      if (rectTop < ih) {
        inWorks = true
        // 入场段结束帧（作品屏幕完全覆盖时）：履历末尾 + 入场帧数，钳到总帧
        const entranceEnd = Math.min(RESUME_FRAMES + WORKS_ENTRANCE, totalFrames)
        if (rectTop > 0) {
          // 作品屏幕从底部(rectTop=ih)滑到完全覆盖(rectTop=0)：入场帧段
          const pA = THREE.MathUtils.clamp(1 - rectTop / ih, 0, 1)
          frameTarget = RESUME_FRAMES + (entranceEnd - RESUME_FRAMES) * pA
        } else {
          // 已钉住，首板块水平移入（前一整屏 100vw 横移）：入场结束 → 末帧，之后定格末帧
          // 竖滚与横移 1:1（px）；横移 100vw = innerWidth px
          const scrolled = THREE.MathUtils.clamp(-rectTop, 0, range)
          const pB = THREE.MathUtils.clamp(scrolled / window.innerWidth, 0, 1)
          frameTarget = entranceEnd + (totalFrames - entranceEnd) * pB
        }
      }
    }
    // 缓动程度随目标帧过渡：≤RESUME_FRAMES 正常平滑；入场段渐关；入场后 a=1（直接跟手、无 smooth）
    const smoothOff = THREE.MathUtils.smoothstep(frameTarget, RESUME_FRAMES, RESUME_FRAMES + WORKS_ENTRANCE)
    const aEff = THREE.MathUtils.lerp(a, 1, smoothOff)
    frameSmooth.current += (frameTarget - frameSmooth.current) * aEff
    const frame = frameSmooth.current
    // 所有 clip 共享时间轴：time = frame/FPS，各自钳到自身时长
    // （较短的 clip 播完后保持末帧，相机 clip CameraAction 走满 totalFrames）
    if (actions.current.length) {
      const t = frame / FPS
      for (const { action: act, duration } of actions.current) {
        act.time = Math.min(t, duration)
      }
      mixer.update(0)
    }
    if (frameRef) frameRef.current = frame

    // 履历段用于对焦的连续索引：由平滑后的帧反推，确保对焦与镜头同步
    const s = THREE.MathUtils.clamp(frame / FRAMES_PER_NODE - 1, -1, M - 1)

    // 3) 自动对焦：作品区跟随 glb focus-works 空对象；履历区按 focus 锚点插值
    //    （在 mixer.update 之后取世界坐标，保证与当前帧一致）
    if (focusRef) {
      if (inWorks && focusNode) {
        focusNode.getWorldPosition(focusRef.current)
      } else if (s < 0 && startPoint && points[0]) {
        startPoint.getWorldPosition(posA.current)
        points[0].getWorldPosition(posB.current)
        focusRef.current.lerpVectors(posA.current, posB.current, THREE.MathUtils.clamp(s + 1, 0, 1))
      } else {
        const sc = THREE.MathUtils.clamp(s, 0, M - 1)
        const iA = Math.floor(sc)
        const iB = Math.min(iA + 1, M - 1)
        const f = sc - iA
        if (points[iA] && points[iB]) {
          points[iA].getWorldPosition(posA.current)
          points[iB].getWorldPosition(posB.current)
          focusRef.current.lerpVectors(posA.current, posB.current, f)
        }
      }
    }

    // 3b) 景深：glb 带逐锚点参数（intro3d 导出）时，沿当前连续索引在相邻锚点间插值 bokeh/focusRange，
    //     写入 refs 供 Post2 直接采用（忠实还原 intro3d）；无参数（老 glb）则写哨兵 -1 → Post2 走原全局帧混合。
    if (dofBokehRef && dofRangeRef) {
      if (!dof.has) {
        dofBokehRef.current = -1
      } else {
        const sample = (arr: number[], sv: number, wv: number): number => {
          if (inWorks) return wv
          if (s < 0) return THREE.MathUtils.lerp(sv, arr[0] ?? sv, THREE.MathUtils.clamp(s + 1, 0, 1))
          const sc = THREE.MathUtils.clamp(s, 0, M - 1)
          const iA = Math.floor(sc)
          const iB = Math.min(iA + 1, M - 1)
          return THREE.MathUtils.lerp(arr[iA] ?? 0, arr[iB] ?? 0, sc - iA)
        }
        dofBokehRef.current = sample(dof.bokeh, dof.startBokeh, dof.worksBokeh)
        // focusRange 按模型 group 缩放折算到世界单位（scene 被放大 scale 倍，清晰范围需同比放大才与 intro3d 观感一致）。
        dofRangeRef.current = sample(dof.range, dof.startRange, dof.worksRange) * scale
      }
    }

    // 2b) 拷贝 glb 相机世界变换到默认相机，并绕焦点做轨道式鼠标视差（焦点屏幕位置不变）
    const camera: any = get().camera
    if (glbCam && camera.isPerspectiveCamera) {
      glbCam.updateWorldMatrix(true, false)
      glbCam.matrixWorld.decompose(camPos.current, camQuat.current, camScl.current)
      // 鼠标缓动：无限趋近目标值
      const me = 1 - Math.pow(cam.parallaxEase, dt)
      smouse.current.x += (mouse.current.x - smouse.current.x) * me
      smouse.current.y += (mouse.current.y - smouse.current.y) * me
      const ax = THREE.MathUtils.degToRad(cam.parallax)
      paraEuler.current.set(-smouse.current.y * ax, -smouse.current.x * ax, 0)
      paraQuat.current.setFromEuler(paraEuler.current)
      // 绕焦点旋转相机位置 + 同步旋转朝向 → 焦点不动，仅四周产生视差
      tmpVec.current
        .copy(camPos.current)
        .sub(focusRef.current)
        .applyQuaternion(paraQuat.current)
      // 移动端沿「焦点→相机」方向整体拉远：焦点屏幕位置不变，主体更小、留白更多
      if (isMobile.current) tmpVec.current.multiplyScalar(cam.mobilePullback)
      tmpVec.current.add(focusRef.current)
      camera.position.copy(tmpVec.current)
      camera.quaternion.multiplyQuaternions(paraQuat.current, camQuat.current)
      // 移动端「时间轴阶段」把镜头整体左移，让主体从满宽文字后错开。
      // 权重：从 Hero 渐入(s: -0.8→0.3)、进入作品区随 smoothOff 渐出 → 无跳变。
      if (isMobile.current && cam.mobileTimelineShift !== 0) {
        const tlWeight = THREE.MathUtils.smoothstep(s, -0.8, 0.3) * (1 - smoothOff)
        if (tlWeight > 0) {
          // translateX 沿局部 +X（屏幕右）；取负 → 相机左移
          const dist = camera.position.distanceTo(focusRef.current)
          camera.translateX(-dist * cam.mobileTimelineShift * tlWeight)
        }
      }
      if (camera.fov !== glbCam.fov) {
        camera.fov = glbCam.fov
        camera.updateProjectionMatrix()
      }
    }

    // 3.5) 头部跟随 + 夸张表情（顶点着色器变形，不动节点 → 不影响运镜与对焦）
    //     头部跟随依赖鼠标，触屏跳过；表情由滚动（作品区）触发，移动端一样生效。
    if (head.enabled && !isMobile.current) {
      // 特写距离衰减：履历末段的镜头几乎贴在脸上，此时 9° 的转头会被透视放大成
      // "整张脸歪出画"。按相机到当前对焦点的距离把幅度压下去，越近越接近不动。
      // 实测：首屏距离 ≈ 1.6，末段特写 ≈ 0.45。
      const headDist = camera.position.distanceTo(focusRef.current)
      const atten = THREE.MathUtils.clamp((headDist - 0.5) / 0.8, 0.12, 1)
      const he = 1 - Math.pow(head.smooth, dt)
      const yawT = smouse.current.x * THREE.MathUtils.degToRad(head.maxYaw) * atten
      const pitchT = -smouse.current.y * THREE.MathUtils.degToRad(head.maxPitch) * atten
      hYaw.current += (yawT - hYaw.current) * he
      hPitch.current += (pitchT - hPitch.current) * he
      headU.uYaw.value = hYaw.current
      headU.uPitch.value = hPitch.current
    }
    if (expr.enabled) {
      // 鼠标离画面中心越近，笑得越夸张
      const near =
        1 -
        THREE.MathUtils.clamp(
          Math.hypot(smouse.current.x, smouse.current.y) / expr.radius,
          0,
          1
        )
      const target = FORCE_EXPR >= 0 ? FORCE_EXPR : expr.base + (expr.peak - expr.base) * near
      const ee = 1 - Math.pow(expr.smooth, dt)
      headU.uExpr.value += (target - headU.uExpr.value) * ee
    }

    // 4) 眼睛跟随（用当前激活相机做屏幕投影）；移动端 / 触屏则跳过
    if (!eye.enabled || eyes.length === 0 || isMobile.current) return
    const sx = eye.invertX ? -1 : 1
    const sy = eye.invertY ? -1 : 1

    let ax = 0
    let ay = 0
    for (const e of eyes) {
      e.obj.getWorldPosition(tmpVec.current).project(camera)
      ax += tmpVec.current.x
      ay += tmpVec.current.y
    }
    ax /= eyes.length
    ay /= eyes.length

    const mx = mouse.current.x - ax
    const my = mouse.current.y - ay
    const yawBase = sx * mx * THREE.MathUtils.degToRad(eye.maxYaw) * eye.gain
    const pitch = sy * -my * THREE.MathUtils.degToRad(eye.maxPitch) * eye.gain

    const dist = Math.hypot(mx, my)
    const convWeight = THREE.MathUtils.clamp(1 - dist / eye.crossRadius, 0, 1)
    const convRad = THREE.MathUtils.degToRad(eye.crossEye) * convWeight

    for (const e of eyes) {
      const yaw = yawBase - e.sx * convRad
      tmpEuler.current.set(pitch, yaw, 0)
      tmpQuat.current.setFromEuler(tmpEuler.current)
      desiredQuat.current.copy(tmpQuat.current).multiply(e.base)
      e.obj.quaternion.slerp(desiredQuat.current, eye.smooth)
    }
  })

  return (
    <group
      position={[posX, posY, posZ]}
      rotation={[0, (rotationY * Math.PI) / 180, 0]}
      scale={scale}
    >
      <primitive object={model} />
    </group>
  )
}

// 后处理：DepthOfField → Bloom → SMAA。
// DoF 焦点逐帧跟随 focusRef（自动对焦）；30–220 帧间收紧清晰范围、加大虚化。
function Post2({
  focusRef,
  frameRef,
  dofBokehRef,
  dofRangeRef,
}: {
  focusRef: MutableRefObject<THREE.Vector3>
  frameRef: MutableRefObject<number>
  dofBokehRef: MutableRefObject<number>
  dofRangeRef: MutableRefObject<number>
}) {
  const post = {
    bloomIntensity: 0.6,
    bloomThreshold: 0.82,
    dof: true,
    startBokeh: 7.4,
    startRange: 2.0,
    focusBokeh: 11.0,
    focusRange: 0.15,
    startBlendFrame: 48,
    endBlendFrame: RESUME_FRAMES - 50, // 末节点附近回到"起始帧"景深档（原 250−50=200）
  }

  const dofRef = useRef<any>(null)
  useFrame(() => {
    const e = dofRef.current
    if (!e) return
    if (e.target && focusRef) e.target.copy(focusRef.current)
    // 权重 w=1 用"开始帧档"，w=0 用"聚焦点档"。
    // 开头(f→0)和末节点(f→RESUME_FRAMES)都取开始帧档；中间各节点取聚焦点档。
    const f = frameRef ? frameRef.current : 0
    const wStart = 1 - THREE.MathUtils.smoothstep(f, 0, post.startBlendFrame)
    const wEnd = THREE.MathUtils.smoothstep(f, post.endBlendFrame, RESUME_FRAMES)
    const w = Math.max(wStart, wEnd)
    if (dofBokehRef && dofBokehRef.current >= 0) {
      // glb 自带逐锚点景深参数（intro3d 导出）：直接采用，忠实还原 intro3d 的虚化强度/清晰范围（bokeh=0 即该点关景深）。
      e.bokehScale = dofBokehRef.current
      if (e.cocMaterial) e.cocMaterial.focusRange = Math.max(1e-4, dofRangeRef ? dofRangeRef.current : post.focusRange)
    } else {
      // 老 glb（无逐锚点参数）：沿用原全局帧混合档位。
      e.bokehScale = THREE.MathUtils.lerp(post.focusBokeh, post.startBokeh, w)
      if (e.cocMaterial) e.cocMaterial.focusRange = THREE.MathUtils.lerp(post.focusRange, post.startRange, w)
    }
  })

  return (
    <EffectComposer multisampling={0} stencilBuffer={false} depthBuffer>
      {(post.dof ? (
        <DepthOfField
          ref={dofRef}
          target={[0, 1.3, 0]}
          worldFocusRange={post.focusRange}
          bokehScale={post.focusBokeh}
          height={480}
        />
      ) : null) as any}
      <Bloom
        mipmapBlur
        intensity={post.bloomIntensity}
        luminanceThreshold={post.bloomThreshold}
        luminanceSmoothing={0.3}
      />
      <SMAA />
    </EffectComposer>
  )
}

// 场景根组件：展示 me.glb（相机由 glb 动画 + 滚动驱动）
export default function Scene() {
  const focusRef = useRef(new THREE.Vector3(0, 1.3, 0))
  const frameRef = useRef(0)
  // 逐锚点景深（intro3d 导出的 glb 携带）：Man2 每帧写、Post2 读。dofBokeh=-1 表示无参数 → Post2 走旧全局混合。
  const dofBokehRef = useRef(-1)
  const dofRangeRef = useRef(0.15)
  return (
    <>
      <GradientBackground />

      <Suspense fallback={null}>
        <Lights />
        <Man2 focusRef={focusRef} frameRef={frameRef} dofBokehRef={dofBokehRef} dofRangeRef={dofRangeRef} />
      </Suspense>

      <Post2 focusRef={focusRef} frameRef={frameRef} dofBokehRef={dofBokehRef} dofRangeRef={dofRangeRef} />
    </>
  )
}
