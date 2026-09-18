import type { ImportValueVM } from '@/api/importItem'

/** 五育类型 */
export const QUALITY_TYPES = [
  { key: 'de', label: '德' },
  { key: 'zhi', label: '智' },
  { key: 'ti', label: '体' },
  { key: 'mei', label: '美' },
  { key: 'lao', label: '劳' },
] as const

/** 素养类型标签配色（Tailwind 色板，与五育语义对应） */
export const QUALITY_BADGE_CLASS: Record<string, string> = {
  de: 'bg-amber-500',
  zhi: 'bg-violet-500',
  ti: 'bg-green-500',
  mei: 'bg-pink-400',
  lao: 'bg-blue-500',
  other: 'bg-slate-400',
}

/** 导入类型 */
export const IMPORT_TYPES = [
  { value: 0, label: '标题列' },
  { value: 1, label: '模板导入' },
  { value: 2, label: '文本填写' },
  { value: 3, label: '图片上传' },
]

/** 展示类型 */
export const SHOW_TYPES = [
  { value: 0, label: '其它' },
  { value: 1, label: '评语' },
  { value: 2, label: '统计' },
]

/** el-tree-select 父级选择 props（value 指定取值字段，node-key 指定节点 key） */
export const parentTreeProps = { value: 'id', label: 'project', children: 'children' }

export function wuyuName(k?: string) {
  if (!k || k === 'other') return '其他'
  return QUALITY_TYPES.find(q => q.key === k)?.label ?? k
}

export function qualityBadgeClass(k?: string) {
  return QUALITY_BADGE_CLASS[k || 'other'] ?? QUALITY_BADGE_CLASS.other
}

export function importTypeName(v: number) {
  return IMPORT_TYPES.find(t => t.value === v)?.label ?? String(v)
}

export function showTypeName(v: number) {
  return SHOW_TYPES.find(t => t.value === v)?.label ?? String(v)
}

/**
 * 返回值集合中单条值的悬浮说明：
 *  - 以 `+` 开头 → 加分项（如 "+5" 表示本次评分 +5 分）
 *  - 以 `-` 开头 → 减分项（如 "-3" 表示本次评分 -3 分）
 *  - 否则显示其等级 (type) 与对应分值 (scoreValue)
 * 空字符串返回空串（不显示 tooltip）
 */
export function valueTooltip(v: ImportValueVM): string {
  const val = (v.value ?? '').trim()
  if (!val) return ''
  if (val.startsWith('+')) {
    const num = val.slice(1).match(/-?\d+(\.\d+)?/)?.[0]
    return num ? `加分项：本次评分 +${num} 分` : `加分项：${val}`
  }
  if (val.startsWith('-')) {
    const num = val.slice(1).match(/-?\d+(\.\d+)?/)?.[0]
    return num ? `减分项：本次评分 -${num} 分` : `减分项：${val}`
  }
  const parts: string[] = []
  if (v.type) parts.push(`等级 ${v.type}`)
  if (typeof v.scoreValue === 'number') parts.push(`分值 ${v.scoreValue}`)
  return parts.length ? parts.join('，') : val
}
