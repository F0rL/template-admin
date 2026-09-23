/**
 * iconMap — 动态图标注册表
 * ---------------------------------------------
 * 字符串图标名（如 'ad:user'、'ri:user-line'）→ 图标组件的映射表。
 * adMap（Ant Design 图标）与 riMap（Remix Icon，unplugin-icons 生成）
 * 在此合并，同键时后者覆盖前者。
 *
 * 使用方式：
 *   import iconMap from '@/icons'
 *   const Icon = iconMap[name]
 *   或直接 <DynamicIcon name={name} />
 *
 * 新增动态图标时在 ad.ts / ri.ts 中登记映射；
 * 静态场景（按钮/表单内固定图标）请直接 import 图标组件，不走本表。
 */
import type { ComponentType, CSSProperties } from 'react'
import adMap from './ad'
import riMap from './ri'

/** iconMap 值的统一组件签名（兼容 antd 图标与 unplugin-icons 生成的 SVG 组件） */
export type IconComponent = ComponentType<{
  className?: string
  style?: CSSProperties
}>

const iconMap: Record<string, IconComponent> = { ...adMap, ...riMap }

export default iconMap
