import { apiGet } from '@/utils/http'

// ==================== Types ====================

/** 概览统计 */
export interface DashboardOverview {
  totalEvalCount: number
  studentCount: number
  classCount: number
  goodChildOpenStatus: string
  pendingFFCount: number
  /** 今日班级巡查明细数（教师版） */
  todayPatrolClassCount: number
  /** 今日学生督查明细数 */
  todayPatrolStudentCount: number
  /** 今日教师执勤明细数 */
  todayPatrolDutyCount: number
  termName: string
}

/** 五育分布（数组，每项一育） */
export interface WuyuDistributionItem {
  wuyu: string
  name: string
  score: number
}

/** 7 天趋势 */
export interface DashboardTrendPoint {
  date: string
  evalCount: number
  scoreSum: number
}

/** 最近动态 */
export interface RecentFeed {
  id: number
  feedTime: string
  feedType: string
  title: string
  content: string
  studentName: string
  studentDepName: string
  operatorName: string
  scoreChange: number | null
  icon: string
}

/** 待办事项 */
export interface DashboardTodo {
  category: string
  title: string
  status: string
  action: string
}

// ==================== API Functions ====================

export function fetchOverview(params?: { termCode?: string }, signal?: AbortSignal) {
  return apiGet<DashboardOverview>('/PcDashboard/GetOverview', { params, signal })
}

export function fetchWuyuDistribution(params?: { termCode?: string }, signal?: AbortSignal) {
  return apiGet<WuyuDistributionItem[]>('/PcDashboard/GetWuyuDistribution', { params, signal })
}

export function fetchTrend(params?: { termCode?: string; days?: number }, signal?: AbortSignal) {
  return apiGet<DashboardTrendPoint[]>('/PcDashboard/GetTrend', { params, signal })
}

export function fetchRecentFeeds(params?: { limit?: number }, signal?: AbortSignal) {
  return apiGet<RecentFeed[]>('/PcDashboard/GetRecentFeeds', { params, signal })
}

export function fetchTodos(signal?: AbortSignal) {
  return apiGet<DashboardTodo[]>('/PcDashboard/GetTodos', { signal })
}

// ==================== Query Keys ====================

export const pcDashboardKeys = {
  all: ['pcDashboard'] as const,
  overview: () => [...pcDashboardKeys.all, 'overview'] as const,
  wuyu: () => [...pcDashboardKeys.all, 'wuyu'] as const,
  trend: () => [...pcDashboardKeys.all, 'trend'] as const,
  feeds: () => [...pcDashboardKeys.all, 'feeds'] as const,
  todos: () => [...pcDashboardKeys.all, 'todos'] as const,
}
