/**
 * 学期选项（全局类型）
 */
export interface TermOption {
  /** 学期编码，如 202620271（与后端 GetCurrentTerm 一致的无连字符格式） */
  code: string
  /** 学期显示名，如 2026-2027 学年上学期 */
  name: string
  /** 排序序号（可选，便于自定义顺序） */
  sortNo?: number
  /** 是否当前学期（仅展示用） */
  current?: boolean
}

/**
 * 生成本地默认的最近 N 个学期选项（兜底用，接口失败时才生效）。
 *
 * code 采用与后端 GetCurrentTerm 一致的「无连字符」格式（如 202620271，
 * 即 {startYear}{endYear}{semester}）；name 与后端一致（如 2026-2027学年第1学期）。
 *
 * 当前学期由当前日期推算（8月~次年1月=第1学期；2月~7月=第2学期），
 * 并从当前学期往前回溯 count*2 个学期，最新学期标记 current=true。
 *
 * @param count 向前回溯多少个完整学年（默认 2，即 4 个学期）
 */
export function generateRecentTerms(count = 2): TermOption[] {
  const options: TermOption[] = []
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  // 与后端 GetCurrentTerm 规则一致：8月~次年1月 = 当年第1学期；2月~7月 = 上年跨今年的第2学期
  let startYear: number
  let sem: 1 | 2
  if (month >= 8) {
    startYear = year
    sem = 1
  } else if (month >= 2) {
    startYear = year - 1
    sem = 2
  } else {
    startYear = year - 1
    sem = 1
  }

  let sy = startYear
  let sm: 1 | 2 = sem
  for (let i = 0; i < count * 2; i++) {
    const endYear = sy + 1
    options.push({
      code: `${sy}${endYear}${sm}`,
      name: `${sy}-${endYear}学年第${sm}学期`,
      sortNo: options.length + 1,
      current: i === 0,
    })
    // 往前退一学期：第2学期 → 同年第1学期；第1学期 → 上一学年的第2学期
    if (sm === 2) sm = 1
    else {
      sm = 2
      sy -= 1
    }
  }
  return options
}
