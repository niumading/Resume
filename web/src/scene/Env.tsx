import { useEffect, useRef } from 'react'
import { useThree, useLoader } from '@react-three/fiber'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import * as THREE from 'three'

// env.hdr 作为光照 / 反射环境（IBL），并可选作为可见背景（替代 Sky.jsx 天空球）。
// three r163+ 原生支持 scene.environmentRotation / scene.backgroundRotation。
export default function Env({
  intensity,
  rotationX,
  rotationY,
  rotationZ,
  asBackground,
  bgIntensity,
  bgBlur,
}: {
  intensity: number
  rotationX: number
  rotationY: number
  rotationZ: number
  asBackground: boolean
  bgIntensity: number
  bgBlur: number
}) {
  const scene = useThree((s) => s.scene)
  const texture = useLoader(RGBELoader, `${import.meta.env.BASE_URL}textures/env.hdr`)

  // 记录接管前的背景（App.jsx 里设的深色），关闭 asBackground 时恢复。
  const initialBg = useRef<any>(null)
  useEffect(() => {
    initialBg.current = scene.background
  }, [scene])

  // 作为光照/反射环境
  useEffect(() => {
    texture.mapping = THREE.EquirectangularReflectionMapping
    scene.environment = texture
    return () => {
      scene.environment = null
    }
  }, [scene, texture])

  useEffect(() => {
    scene.environmentIntensity = intensity
  }, [scene, intensity])

  // 旋转：同一组欧拉角(度→弧度)同时驱动环境反射与背景朝向
  useEffect(() => {
    const x = THREE.MathUtils.degToRad(rotationX)
    const y = THREE.MathUtils.degToRad(rotationY)
    const z = THREE.MathUtils.degToRad(rotationZ)
    scene.environmentRotation.set(x, y, z)
    scene.backgroundRotation.set(x, y, z)
  }, [scene, rotationX, rotationY, rotationZ])

  // 作为可见背景
  useEffect(() => {
    scene.background = asBackground ? texture : initialBg.current
    return () => {
      scene.background = initialBg.current
    }
  }, [scene, texture, asBackground])

  // 背景曝光控制：backgroundIntensity 只缩放背景显示亮度，不影响场景受光；
  // backgroundBlurriness 柔化背景、削弱刺眼高光。
  useEffect(() => {
    scene.backgroundIntensity = bgIntensity
    scene.backgroundBlurriness = bgBlur
  }, [scene, bgIntensity, bgBlur])

  return null
}
