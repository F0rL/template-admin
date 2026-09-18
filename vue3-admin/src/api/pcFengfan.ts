import { apiGet, apiPost } from '@/utils/http'
import type { PageResult } from './pcEval'

// ==================== 枚举（与后端一致） ====================

/** 锋范章 5 类：0=阳光 1=智慧 2=自律 3=爱心 4=责任 */
export const FFBadgeType = {
  Sun: 0,
  Wisdom: 1,
  SelfDiscipline: 2,
  Love: 3,
  Duty: 4,
} as const
export type FFBadgeType = (typeof FFBadgeType)[keyof typeof FFBadgeType]

export const FF_BADGE_MAP: Record<FFBadgeType, { label: string; color: string; wuyu: string }> = {
  [FFBadgeType.Sun]: { label: '阳光', color: '#faad14', wuyu: 'de' },
  [FFBadgeType.Wisdom]: { label: '智慧', color: '#2b85e4', wuyu: 'zhi' },
  [FFBadgeType.SelfDiscipline]: { label: '自律', color: '#722ed1', wuyu: 'ti' },
  [FFBadgeType.Love]: { label: '爱心', color: '#eb2f96', wuyu: 'mei' },
  [FFBadgeType.Duty]: { label: '责任', color: '#52c41a', wuyu: 'lao' },
}

/** 五星申报状态：0=未申报 1=待审核 2=已通过 3=已驳回 */
export const FFStarStatus = {
  NotApplied: 0,
  Pending: 1,
  Approved: 2,
  Rejected: 3,
} as const
export type FFStarStatus = (typeof FFStarStatus)[keyof typeof FFStarStatus]

export const FF_STAR_STATUS_MAP: Record<
  FFStarStatus,
  { label: string; type: 'warning' | 'success' | 'danger' | 'info' }
> = {
  [FFStarStatus.NotApplied]: { label: '未申报', type: 'info' },
  [FFStarStatus.Pending]: { label: '待审核', type: 'warning' },
  [FFStarStatus.Approved]: { label: '已通过', type: 'success' },
  [FFStarStatus.Rejected]: { label: '已驳回', type: 'danger' },
}

// ==================== 锋范认定 ====================

export interface FFRecognitionItem {
  id: number
  termCode: string
  termName: string
  studentId: number
  studentName: string
  studentDepId: number | null
  studentDepName: string
  badgeType: FFBadgeType
  badgeTypeName: string
  icon: string
  recognizeTime: string
  recognizerName: string
  remark: string
}

export interface FFRecognitionListParams {
  page: number
  rows: number
  studentDepId?: number | string
  termCode?: string
  badgeType?: FFBadgeType
  searchKey?: string
}

export interface CreateFFRecognitionRequest {
  studentId: number
  badgeType: FFBadgeType
  termCode?: string
  remark?: string
}

export interface DeleteFFRecognitionRequest {
  id: number
}

// ==================== 集章进度（班级内每个学生一条） ====================

export interface FFProgressParams {
  page: number
  rows: number
  studentDepId?: number | string
  termCode?: string
}

export interface FFProgressItem {
  studentId: number
  studentName: string
  studentDepId: number | null
  studentDepName: string
  sunCount: number
  wisdomCount: number
  selfDisciplineCount: number
  loveCount: number
  dutyCount: number
  totalBadges: number
  termCount: number
  isQualified: boolean
}

// ==================== 五星申报 ====================

export interface FFStarApplicationItem {
  id: number
  studentId: number
  studentName: string
  studentDepId: number | null
  studentDepName: string
  applyTermCode: string
  badgeCount: number
  termCount: number
  applyTime: string
  applicantName: string
  status: FFStarStatus
  statusName: string
  auditTime: string
  auditorName: string
  auditOpinion: string
}

export interface FFStarListParams {
  page: number
  rows: number
  status?: FFStarStatus
  studentDepId?: number | string
}

export interface AuditFFStarRequest {
  id: number
  approved: boolean
  auditOpinion?: string
}

// ==================== API Functions ====================

export function fetchFFRecognitions(params: FFRecognitionListParams, signal?: AbortSignal) {
  return apiGet<PageResult<FFRecognitionItem>>('/PcFF/GetRecognitions', { params, signal })
}

export function createFFRecognition(data: CreateFFRecognitionRequest) {
  return apiPost('/PcFF/Recognize', data)
}

export function deleteFFRecognition(data: DeleteFFRecognitionRequest) {
  return apiPost('/PcFF/DeleteRecognition', data)
}

export function fetchFFProgress(params: FFProgressParams, signal?: AbortSignal) {
  return apiGet<PageResult<FFProgressItem>>('/PcFF/GetProgress', { params, signal })
}

export function fetchFFStudentBadges(params: { studentId: number }, signal?: AbortSignal) {
  return apiGet<FFRecognitionItem[]>('/PcFF/GetStudentBadges', { params, signal })
}

export function fetchFFStarApplications(params: FFStarListParams, signal?: AbortSignal) {
  return apiGet<PageResult<FFStarApplicationItem>>('/PcFF/GetStarApplications', { params, signal })
}

export function auditFFStar(data: AuditFFStarRequest) {
  return apiPost('/PcFF/AuditStar', data)
}

// ==================== Query Keys ====================

export const pcFengfanKeys = {
  all: ['pcFengfan'] as const,
  recognitions: (params: FFRecognitionListParams) => [...pcFengfanKeys.all, 'rec', params] as const,
  progress: (params: FFProgressParams) => [...pcFengfanKeys.all, 'progress', params] as const,
  badges: (studentId: number) => [...pcFengfanKeys.all, 'badges', studentId] as const,
  starApps: (params: FFStarListParams) => [...pcFengfanKeys.all, 'starApps', params] as const,
}
