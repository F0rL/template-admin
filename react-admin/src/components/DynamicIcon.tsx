/**
 * DynamicIcon — 按图标名渲染 iconMap 中的图标
 * ---------------------------------------------
 * 用于后端菜单 icon 字段等「图标名以字符串下发」的场景：
 *   <DynamicIcon name={menu.icon} />
 * 图标名不存在或未提供时不渲染任何内容。
 */
import type { CSSProperties } from 'react'
import iconMap from '@/icons'

interface DynamicIconProps {
  name?: string
  className?: string
  style?: CSSProperties
}

function DynamicIcon({ name, className, style }: DynamicIconProps) {
  if (!name) return null
  const Icon = iconMap[name]
  if (!Icon) return null
  return <Icon className={className} style={style} />
}

export default DynamicIcon
