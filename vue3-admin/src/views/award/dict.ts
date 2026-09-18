// 奖证库字典：获奖大类 / 获奖分类 / 级别 / 奖次

export interface OptionItem {
  value: number
  label: string
}

/** 获奖大类：学生 / 教师 / 学校 */
export const CATEGORY_OPTIONS: OptionItem[] = [
  { value: 1, label: '学生' },
  { value: 2, label: '教师' },
  { value: 3, label: '学校' },
]

/** 获奖分类：荣誉类 / 竞赛类 / 辅导类 */
export const SUB_CATEGORY_OPTIONS: OptionItem[] = [
  { value: 1, label: '荣誉类' },
  { value: 2, label: '竞赛类' },
  { value: 3, label: '辅导类' },
]

/** 教师获奖下的竞赛类展示名（含论文、赛课） */
export const SUB_CATEGORY_LABEL_TEACHER: Record<number, string> = {
  1: '荣誉类',
  2: '竞赛类(论文、赛课)',
  3: '辅导类',
}

/**
 * 各获奖大类下可选的获奖分类（统计要求）：
 * 学生 → 荣誉类、竞赛类
 * 教师 → 辅导类、荣誉类、竞赛类（竞赛类含论文、赛课）
 * 学校 → 荣誉类、竞赛类
 */
export const SUB_CATEGORY_BY_CATEGORY: Record<number, number[]> = {
  1: [1, 2],
  2: [3, 1, 2],
  3: [1, 2],
}

/** 获奖级别（常用值，可自定义） */
export const AWARD_LEVEL_OPTIONS = ['国家级', '省级', '市级', '区级', '校级']

/** 奖次（常用值，可自定义） */
export const AWARD_GRADE_OPTIONS = ['特等奖', '一等奖', '二等奖', '三等奖', '优秀奖', '优胜奖']

export function categoryLabel(v: number): string {
  return CATEGORY_OPTIONS.find(o => o.value === v)?.label ?? '未知'
}

export function subCategoryLabel(v: number): string {
  return SUB_CATEGORY_OPTIONS.find(o => o.value === v)?.label ?? '未知'
}

/** 按获奖大类取分类展示名：教师竞赛类展示为「竞赛类(论文、赛课)」 */
export function subCategoryLabelFor(category: number, v: number): string {
  if (category === 2) return SUB_CATEGORY_LABEL_TEACHER[v] ?? subCategoryLabel(v)
  return subCategoryLabel(v)
}

/** 某获奖大类下的分类下拉选项（教师使用专属展示名） */
export function subCategoryOptionsFor(category: number): OptionItem[] {
  const allowed = SUB_CATEGORY_BY_CATEGORY[category] ?? []
  return allowed
    .map(v => ({ value: v, label: subCategoryLabelFor(category, v) }))
    .sort((a, b) => allowed.indexOf(a.value) - allowed.indexOf(b.value))
}
