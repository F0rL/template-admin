import { apiGet } from '@/utils/http'

// ==================== Types ====================

/** 请求日志列表项 */
export interface HttpLogListItem {
  id: number | string
  /** 接口地址 */
  url: string
  /** 请求方式 */
  method: string
  /** 事件名称 */
  actionName: string
  /** 响应状态码 */
  statusCode: number | null
  /** 请求 IP */
  ipAddress: string
  /** 调用人员 */
  userName: string
  /** 请求时间 */
  createTime: string | null
  /** 响应时长(ms) */
  elapsed: number | null
}

/** 错误日志列表项（比请求日志多错误信息） */
export interface ErrorLogListItem extends HttpLogListItem {
  message: string
}

/** 表格行（请求 / 错误共用，message 仅错误日志有） */
export interface LogRow extends HttpLogListItem {
  message?: string
}

/** 日志详情（请求 / 错误共用，字段按类型存在） */
export interface LogDetail {
  id: number | string
  url?: string
  method?: string
  controller?: string
  actionName?: string
  actionType?: string
  host?: string
  ipAddress?: string
  userId?: string
  userName?: string
  userType?: number | null
  statusCode?: number | null
  elapsed?: number | null
  createTime?: string | null
  queryString?: string
  body?: string
  source?: string
  userAgent?: string
  message?: string
}

export interface LogListParams {
  page: number
  rows: number
  searchKey?: string
  startTime?: string
  endTime?: string
}

// ==================== API Functions ====================

export function fetchHttpLogList(params?: LogListParams, signal?: AbortSignal) {
  return apiGet<PaginatedData<HttpLogListItem>>('/SysLog/GetHttpLogList', { params, signal })
}

export function fetchErrorLogList(params?: LogListParams, signal?: AbortSignal) {
  return apiGet<PaginatedData<ErrorLogListItem>>('/SysLog/GetErrorLogList', { params, signal })
}

export function fetchHttpLogDetail(id: number | string, signal?: AbortSignal) {
  return apiGet<LogDetail>('/SysLog/GetHttpLogEntity', { params: { id }, signal })
}

export function fetchErrorLogDetail(id: number | string, signal?: AbortSignal) {
  return apiGet<LogDetail>('/SysLog/GetErrorLogEntity', { params: { id }, signal })
}

// ==================== Query Keys ====================

export const logKeys = {
  all: ['logs'] as const,
  httpDetail: (id: number | string) => [...logKeys.all, 'http', 'detail', id] as const,
  errorDetail: (id: number | string) => [...logKeys.all, 'error', 'detail', id] as const,
}
