import { apiGet } from '@/utils/http'

// ==================== Types ====================

export interface AnalysisParams {
  studentDepId?: number | string
  termCode?: string
}

/** 五育分布（数组，每项一育） */
export interface WuyuAnalysisItem {
  wuyu: string
  name: string
  score: number
  count: number
  avgScore: number
}

/** 班级对比 */
export interface ClassCompareItem {
  studentDepId: number
  studentDepName: string
  totalScore: number
  evalCount: number
  avgScore: number
  studentCount: number
}

/** 维度热力图（维度 × 五育 扁平列表） */
export interface DimensionHeatmapItem {
  dimName: string
  wuyu: string
  count: number
  totalScore: number
}

/** 教师评价统计 */
export interface TeacherStatsItem {
  evaluatorName: string
  evalCount: number
  totalScore: number
  avgPerStudent: number
}

/** 趋势 */
export interface AnalysisTrendPoint {
  date: string
  evalCount: number
  scoreSum: number
}

// ==================== 排行榜 ====================

export interface RankingRequest {
  studentDepId?: number | string
  termCode?: string
  limit?: number
}

/** 班级学生榜（五育为字符串分数） */
export interface ClassRankingItem {
  studentId: number
  studentName: string
  studentDepId: number
  studentDepName: string
  totalScore: number
  rank: number
  wuyuDe: string
  wuyuZhi: string
  wuyuTi: string
  wuyuMei: string
  wuyuLao: string
  hasFFBadge: boolean
  isFFStar: boolean
}

export interface GradeRankingItem {
  studentDepId: number
  studentDepName: string
  totalScore: number
  rank: number
  studentCount: number
  avgScore: number
  hasFFBadge: boolean
  isFFStar: boolean
}

/** 三类评价活动概览（好学生 / 好公民 / 好孩子） */
export interface SectionOverviewItem {
  section: number
  sectionName: string
  evalCount: number
  studentCount: number
}

// ==================== API Functions ====================

export function fetchWuyuDistribution(params: AnalysisParams, signal?: AbortSignal) {
  return apiGet<WuyuAnalysisItem[]>('/PcAnalysis/GetWuyuDistribution', { params, signal })
}

export function fetchClassCompare(params?: AnalysisParams, signal?: AbortSignal) {
  return apiGet<ClassCompareItem[]>('/PcAnalysis/GetClassCompare', { params, signal })
}

export function fetchDimensionHeatmap(params: AnalysisParams, signal?: AbortSignal) {
  return apiGet<DimensionHeatmapItem[]>('/PcAnalysis/GetDimensionHeatmap', { params, signal })
}

export function fetchTeacherStats(params: AnalysisParams, signal?: AbortSignal) {
  return apiGet<TeacherStatsItem[]>('/PcAnalysis/GetTeacherStats', { params, signal })
}

export function fetchAnalysisTrend(params?: AnalysisParams, signal?: AbortSignal) {
  return apiGet<AnalysisTrendPoint[]>('/PcAnalysis/GetTrend', { params, signal })
}

export function fetchClassRanking(params: RankingRequest, signal?: AbortSignal) {
  return apiGet<ClassRankingItem[]>('/PcRanking/GetClassRanking', { params, signal })
}

export function fetchGradeRanking(params?: AnalysisParams, signal?: AbortSignal) {
  return apiGet<GradeRankingItem[]>('/PcRanking/GetGradeRanking', { params, signal })
}

export function fetchSectionOverview(params?: AnalysisParams, signal?: AbortSignal) {
  return apiGet<SectionOverviewItem[]>('/PcAnalysis/GetSectionOverview', { params, signal })
}

// ==================== Query Keys ====================

export const pcAnalysisKeys = {
  all: ['pcAnalysis'] as const,
  wuyu: (params: AnalysisParams) => [...pcAnalysisKeys.all, 'wuyu', params] as const,
  classCompare: (params?: AnalysisParams) =>
    [...pcAnalysisKeys.all, 'classCompare', params] as const,
  heatmap: (params: AnalysisParams) => [...pcAnalysisKeys.all, 'heatmap', params] as const,
  teacherStats: (params: AnalysisParams) =>
    [...pcAnalysisKeys.all, 'teacherStats', params] as const,
  trend: (params?: AnalysisParams) => [...pcAnalysisKeys.all, 'trend', params] as const,
  classRanking: (params: RankingRequest) =>
    [...pcAnalysisKeys.all, 'classRanking', params] as const,
  gradeRanking: (params?: AnalysisParams) =>
    [...pcAnalysisKeys.all, 'gradeRanking', params] as const,
  sectionOverview: (params?: AnalysisParams) =>
    [...pcAnalysisKeys.all, 'sectionOverview', params] as const,
}
