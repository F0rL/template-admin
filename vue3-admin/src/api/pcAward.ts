import http, { apiGet, apiPost } from '@/utils/http'
import type { PageResult } from './pcEval'

// ==================== Types ====================

/** 获奖记录列表项 */
export interface AwardListItem {
  id: string
  /** 获奖大类 1学生 2教师 3学校 */
  category: number
  categoryName: string
  /** 获奖分类 1荣誉类 2竞赛类 3辅导类 */
  subCategory: number
  subCategoryName: string
  winnerName: string
  /** 班级全名（仅学生获奖时记录，如 五年级4班） */
  winnerClass: string
  awardName: string
  awardLevel: string
  awardGrade: string
  /** 获奖时间（yyyy-MM） */
  awardTime: string
  awardUnit: string
  reward: string
  remark: string
  /** 图片附件相对路径 */
  attachmentPath: string
  /** 好公民同步状态：0未同步 1已同步 2同步失败 */
  syncStatus: number
  /** 同步失败原因 */
  syncFailReason: string
  /** 同步生成的好公民评价记录ID */
  syncEvalRecordId: number | null
  /** 同步时间（yyyy-MM-dd HH:mm:ss） */
  syncTime: string
  /** 登记时间（yyyy-MM-dd HH:mm:ss） */
  createTime: string
}

export interface AwardListParams {
  page: number
  rows: number
  category?: number
  subCategory?: number
  awardLevel?: string
  /** 获奖时间范围-起始（yyyy-MM） */
  startAwardTime?: string
  /** 获奖时间范围-结束（yyyy-MM） */
  endAwardTime?: string
  searchKey?: string
}

export interface SaveAwardPayload {
  /** 空 = 新增 */
  id?: string
  category: number
  subCategory: number
  winnerName: string
  /** 班级全名（仅学生获奖时记录，如 五年级4班） */
  winnerClass?: string
  awardName: string
  awardLevel?: string
  awardGrade?: string
  awardTime?: string
  awardUnit?: string
  reward?: string
  remark?: string
  /** 图片附件相对路径（系统上传接口返回的 path） */
  attachmentPath?: string
  /** 保存后是否自动同步好公民（仅学生奖证；默认同步） */
  autoSync?: boolean
  /** 自动同步五育归属（默认 de 德育） */
  syncWuyu?: string
  /** 自动同步积分（默认 3） */
  syncScore?: number
}

export interface AwardSubStat {
  subCategory: number
  subCategoryName: string
  count: number
}

export interface AwardCategoryStat {
  category: number
  categoryName: string
  count: number
  subs: AwardSubStat[]
}

/** 手动同步好公民结果 */
export interface SyncAwardResult {
  total: number
  success: number
  fail: number
  errors: string[]
}

// ==================== 报表统计 ====================

export interface AwardReportStatsParams {
  /** 起始月份 yyyyMM */
  startMonth?: string
  /** 结束月份 yyyyMM */
  endMonth?: string
  category?: number
  subCategory?: number
  awardLevel?: string
  searchKey?: string
}

export interface AwardMonthStat {
  month: string
  count: number
}

export interface AwardLevelStat {
  level: string
  count: number
}

export interface AwardReportStats {
  total: number
  studentCount: number
  teacherCount: number
  schoolCount: number
  syncedCount: number
  byMonth: AwardMonthStat[]
  byCategory: AwardCategoryStat[]
  byLevel: AwardLevelStat[]
}

/** 奖证库导入结果 */
export interface AwardImportResult {
  /** 有效数据行数（不含空行与表头） */
  total: number
  /** 成功导入条数 */
  success: number
  /** 失败条数 */
  fail: number
  /** 失败明细（如 "第3行：获奖者不能为空"） */
  errors: string[]
}

// ==================== API ====================

/** 奖证库列表（分页 + 筛选） */
export function fetchAwardList(params: AwardListParams, signal?: AbortSignal) {
  return apiGet<PageResult<AwardListItem>>('/PcAward/GetList', { params, signal })
}

/** 新增 / 编辑获奖记录（id 为空 = 新增），返回 Id */
export function saveAward(payload: SaveAwardPayload) {
  return apiPost<string>('/PcAward/Save', payload)
}

/** 批量删除获奖记录 */
export function deleteAwards(ids: string[]) {
  return apiPost<unknown>('/PcAward/Delete', { ids })
}

/** 手动同步学生奖证到素养评价好公民（可指定五育/积分，默认德育 3 分） */
export function syncAwards(ids: string[], wuyu = 'de', score = 3) {
  return apiPost<SyncAwardResult>('/PcAward/Sync', { ids, wuyu, score })
}

/** 获奖统计报表（按时间范围 / 大类 / 分类 / 级别聚合） */
export function fetchAwardReportStats(params?: AwardReportStatsParams, signal?: AbortSignal) {
  return apiGet<AwardReportStats>('/PcAward/GetReportStats', { params, signal })
}

/** 导入获奖记录（Excel 文件，category 为当前页签大类，仅导入该大类行），返回导入结果 */
export function importAwards(file: File, category?: number) {
  const fd = new FormData()
  fd.append('File', file)
  if (category != null) fd.append('Category', String(category))
  return apiPost<AwardImportResult>('/PcAward/Import', fd)
}

/** 按筛选条件导出获奖记录为 Excel（返回 Blob，由 downloadBlob 触发下载） */
export function exportAwards(params?: Partial<AwardListParams>) {
  return http.get<Blob>('/PcAward/Export', { params, responseType: 'blob' })
}

// ==================== Query Keys ====================

export const pcAwardKeys = {
  all: ['pcAward'] as const,
  list: (params: AwardListParams) => [...pcAwardKeys.all, 'list', params] as const,
  reportStats: (params: AwardReportStatsParams) => [...pcAwardKeys.all, 'reportStats', params] as const,
}
