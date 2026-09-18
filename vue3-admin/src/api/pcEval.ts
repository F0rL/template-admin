import { apiGet, apiPost } from '@/utils/http'

// ==================== 枚举（与后端 Platform.Common.Enums.App 一致） ====================

/** 评价板块：0=好学生 1=好公民 2=好孩子 */
export const EvalSection = {
  GoodStudent: 0,
  GoodCitizen: 1,
  GoodChild: 2,
} as const
export type EvalSection = (typeof EvalSection)[keyof typeof EvalSection]

export const EVAL_SECTION_MAP: Record<EvalSection, { label: string; color: string; wuyu: string }> =
  {
    [EvalSection.GoodStudent]: { label: '好学生', color: '#2b85e4', wuyu: 'de' },
    [EvalSection.GoodCitizen]: { label: '好公民', color: '#52c41a', wuyu: 'de' },
    [EvalSection.GoodChild]: { label: '好孩子', color: '#faad14', wuyu: 'lao' },
  }

// ==================== 通用分页 ====================

export interface PageResult<T> {
  list: T[]
  total: number
}

// ==================== 评价记录（好学生 / 好公民，单维度一条记录） ====================

export interface EvalListItem {
  id: number
  termCode: string
  termName: string
  section: EvalSection
  sectionName: string
  studentId: number
  studentName: string
  studentDepId: number | null
  studentDepName: string
  dimName: string
  wuyu: string
  score: number
  certName: string
  description: string
  evalTime: string
  evaluatorName: string
  evaluatorRole: string
  remark: string
  files: string
}

export interface EvalListParams {
  page: number
  rows: number
  studentDepId?: number | string
  termCode?: string
  section?: EvalSection
  studentId?: number
  searchKey?: string
  wuyu?: string
}

export interface BatchPublishRequest {
  studentIds: number[]
  score: number
  certName: string
  description: string
  termCode?: string
}

export interface UpdateEvalRequest {
  id: number
  score?: number
  description?: string
  remark?: string
}

export interface DeleteEvalRequest {
  id: number
}

// ==================== 家长评价（好孩子） ====================

/** 家长评价评分项（后端已把 key 解析为评价项名称） */
export interface ParentEvalRatingItem {
  key: string
  /** 评价项名称（来自「积分规则配置」的好孩子配置） */
  name: string
  star: number
  /** 星级上限 */
  starMax: number
  /** 归入五育 de/zhi/ti/mei/lao */
  wuyu: string
  wuyuName: string
}

export interface ParentEvalItem {
  id: number
  studentId: number
  studentName: string
  studentDepId: number | null
  studentDepName: string
  termName: string
  totalScore: number
  evalTime: string
  evaluatorName: string
  /** 本学期是否已提交「好孩子」评价（未提交时 id = 0） */
  isEvaluated: boolean
  ratingsJson: string
  /** 评分明细（优先用它渲染，避免直出 housework 这类 key） */
  ratings?: ParentEvalRatingItem[]
  /** 归入五育（跨育时为 de/lao） */
  wuyu?: string
  /** 五育全称展示串 */
  wuyuName?: string
}

export interface ParentEvalListParams {
  page: number
  rows: number
  studentDepId?: number | string
  termCode?: string
  /** 关键字：仅按学生姓名模糊匹配 */
  searchKey?: string
  /** 评价状态：0 = 全部 1 = 已评价 2 = 未评价 */
  status?: number
}

export interface ParentEvalDetailParams {
  id: number
}

export interface GoodCitizenListParams {
  page: number
  rows: number
  studentDepId?: number | string
  termCode?: string
  searchKey?: string
  wuyu?: string
}

export interface GoodChildListParams {
  page: number
  rows: number
  studentDepId?: number | string
  termCode?: string
  searchKey?: string
}

// ==================== 评价动态（PcFeed） ====================

/** FeedType 枚举：0=评价 1=获章 2=五星申报 3=校务巡查 */
export const FeedType = {
  Eval: 0,
  Badge: 1,
  Star: 2,
  Patrol: 3,
} as const

export interface FeedListItem {
  id: number
  feedTime: string
  feedType: number
  title: string
  content: string
  studentId: number | null
  studentName: string
  studentDepId: number | null
  studentDepName: string
  operatorName?: string
  scoreChange?: number | null
  icon?: string
}

export interface FeedListParams {
  page: number
  rows: number
  studentDepId?: number | string
  feedType?: string
  searchKey?: string
}

// ==================== 家长评价入口配置 ====================

export interface ParentEvalConfig {
  open: boolean
}

// ==================== API Functions ====================

export function fetchEvalList(params: EvalListParams, signal?: AbortSignal) {
  return apiGet<PageResult<EvalListItem>>('/PcEval/GetList', { params, signal })
}

export function batchPublish(data: BatchPublishRequest) {
  return apiPost('/PcEval/BatchPublish', data)
}

export function updateEval(data: UpdateEvalRequest) {
  return apiPost('/PcEval/Update', data)
}

export function deleteEval(data: DeleteEvalRequest) {
  return apiPost('/PcEval/Delete', data)
}

export function fetchParentEvals(params: ParentEvalListParams, signal?: AbortSignal) {
  return apiGet<PageResult<ParentEvalItem>>('/PcEval/GetParentEvals', { params, signal })
}

export function fetchParentEvalDetail(params: ParentEvalDetailParams, signal?: AbortSignal) {
  return apiGet<ParentEvalItem>('/PcEval/GetParentEvalDetail', { params, signal })
}

export function fetchGoodCitizenList(params: GoodCitizenListParams, signal?: AbortSignal) {
  return apiGet<PageResult<EvalListItem>>('/PcEval/GetGoodCitizenList', { params, signal })
}

export function fetchGoodChildList(params: GoodChildListParams, signal?: AbortSignal) {
  return apiGet<PageResult<ParentEvalItem>>('/PcEval/GetGoodChildList', { params, signal })
}

export function fetchFeedList(params: FeedListParams, signal?: AbortSignal) {
  return apiGet<PageResult<FeedListItem>>('/PcFeed/GetList', { params, signal })
}

export function fetchParentEvalConfig(signal?: AbortSignal) {
  return apiGet<ParentEvalConfig>('/PcEval/GetParentEvalConfig', { signal })
}

export function setParentEvalConfig(data: { open: boolean }) {
  return apiPost('/PcEval/SetParentEvalConfig', data)
}

// ==================== Query Keys ====================

export const pcEvalKeys = {
  all: ['pcEval'] as const,
  list: (params: EvalListParams) => [...pcEvalKeys.all, 'list', params] as const,
  parentList: (params: ParentEvalListParams) => [...pcEvalKeys.all, 'parentList', params] as const,
  parentDetail: (params: ParentEvalDetailParams) =>
    [...pcEvalKeys.all, 'parentDetail', params] as const,
  goodCitizen: (params: GoodCitizenListParams) =>
    [...pcEvalKeys.all, 'goodCitizen', params] as const,
  goodChild: (params: GoodChildListParams) => [...pcEvalKeys.all, 'goodChild', params] as const,
  feedList: (params: FeedListParams) => [...pcEvalKeys.all, 'feedList', params] as const,
}
