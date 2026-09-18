import { apiGet, apiPost } from '@/utils/http'
import type { PageResult, EvalSection } from './pcEval'

// ==================== Types ====================

/** 学生列表项 */
export interface StudentListItem {
  id: number
  student_Userid: string
  name: string
  initial: string
  avatar: string
  studentDepId: number | null
  studentDepName: string
}

export interface StudentCreateRequest {
  student_Userid: string
  name: string
  avatar?: string
  studentDepId: number | string | null
}

export interface StudentUpdateRequest {
  id: number
  name: string
  avatar?: string
  studentDepId: number | string | null
}

export interface StudentDeleteRequest {
  id: number
}

export interface StudentListParams {
  page: number
  rows: number
  studentDepId?: number | string
  searchKey?: string
  graduatedStatus?: number
}

/** 年级/班级树节点（家校通讯录） */
export interface StudentDepTreeNode {
  id: number
  name: string
  fullName: string
  type: number
  studentCount: number
  children: StudentDepTreeNode[]
}

/** 成长报告里的单条评价明细 */
export interface StudentEvalDetail {
  id: number
  section: EvalSection
  sectionName: string
  dimName: string
  wuyu: string
  score: number
  evalTime: string
  evaluatorName: string
  evaluatorRole: string
}

/** 成长报告 */
export interface StudentReport {
  studentId: number
  studentName: string
  studentDepName: string
  termName: string
  wuyuScores: Record<string, number>
  totalScore: number
  growthStage: string
  recentEvals: StudentEvalDetail[]
  teacherComment: string
}

export interface StudentReportParams {
  studentId: number
  termCode?: string
}

export interface SaveCommentRequest {
  reportId: number
  teacherComment: string
}

// ==================== API Functions ====================

export function fetchStudentList(params: StudentListParams, signal?: AbortSignal) {
  return apiGet<PageResult<StudentListItem>>('/PcStudent/GetList', { params, signal })
}

/** 获取年级/班级树（家校通讯录） */
export function fetchStudentDepTree(signal?: AbortSignal) {
  return apiGet<StudentDepTreeNode[]>('/PcStudent/GetStudentDepTree', { signal })
}

export function createStudent(data: StudentCreateRequest) {
  return apiPost('/PcStudent/Create', data)
}

export function updateStudent(data: StudentUpdateRequest) {
  return apiPost('/PcStudent/Update', data)
}

export function deleteStudent(data: StudentDeleteRequest) {
  return apiPost('/PcStudent/Delete', data)
}

export function fetchStudentReport(params: StudentReportParams, signal?: AbortSignal) {
  return apiGet<StudentReport>('/PcStudent/GetReport', { params, signal })
}

export function saveStudentComment(data: SaveCommentRequest) {
  return apiPost('/PcStudent/SaveComment', data)
}

/** 同步班级（从企微） */
export function syncStudentDeps() {
  return apiPost('/AppStudent/SyncStudentDeps')
}

/** 同步学生（从企微） */
export function syncStudents() {
  return apiPost('/AppStudent/SyncStudents')
}

/** 同步家校沟通班级老师 */
export function syncDepAdmins() {
  return apiPost('/AppStudent/SyncDepAdmins')
}

// ==================== Query Keys ====================

export const pcStudentKeys = {
  all: ['pcStudent'] as const,
  list: (params: StudentListParams) => [...pcStudentKeys.all, 'list', params] as const,
  depTree: () => [...pcStudentKeys.all, 'depTree'] as const,
  report: (params: StudentReportParams) => [...pcStudentKeys.all, 'report', params] as const,
}
