import { apiGet } from '@/utils/http'

// ==================== Types ====================

/** 请求日志列表项 */
export interface HttpLogListItem {
  /** 日志 ID */
  id: number | string
  /** 接口地址 */
  url: string
  /** 请求方式 */
  method: string
  /** 事件名称 */
  actionName: string
  /** 响应状态 */
  statusCode: number | null
  /** 请求IP */
  ipAddress: string
  /** 用户姓名 */
  userName: string
  /** 请求时间 */
  createTime: string | null
  /** 响应时间(ms) */
  elapsed: number | null
}

/** 错误日志列表项 */
export interface ErrorLogListItem {
  /** 日志 ID */
  id: number | string
  /** 接口地址 */
  url: string
  /** 请求方式 */
  method: string
  /** 事件名称 */
  actionName: string
  /** 响应状态 */
  statusCode: number | null
  /** 错误信息 */
  message: string
  /** 请求IP */
  ipAddress: string
  /** 用户姓名 */
  userName: string
  /** 请求时间 */
  createTime: string | null
  /** 响应时间(ms) */
  elapsed: number | null
}

/** 表格行（请求/错误共用，message 仅错误日志有） */
export interface LogRow {
  id: number | string
  url: string
  method: string
  actionName: string
  statusCode: number | null
  ipAddress: string
  userName: string
  createTime: string | null
  elapsed: number | null
  message?: string
}

/** 日志详情（请求/错误共用，部分字段按类型存在） */
export interface LogDetail {
  id: number | string
  url?: string
  method?: string
  controller?: string
  action?: string
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

// ==================== API ====================

/** 请求日志列表 */
export function fetchHttpLogList(params?: LogListParams, signal?: AbortSignal) {
  return apiGet<PaginatedData<HttpLogListItem>>('/SysLog/GetHttpLogList', { params, signal })
}

/** 错误日志列表 */
export function fetchErrorLogList(params?: LogListParams, signal?: AbortSignal) {
  return apiGet<PaginatedData<ErrorLogListItem>>('/SysLog/GetErrorLogList', { params, signal })
}

/** 请求日志详情 */
export function fetchHttpLogDetail(id: number | string, signal?: AbortSignal) {
  return apiGet<LogDetail>(`/SysLog/GetHttpLogEntity?id=${id}`, { signal })
}

/** 错误日志详情 */
export function fetchErrorLogDetail(id: number | string, signal?: AbortSignal) {
  return apiGet<LogDetail>(`/SysLog/GetErrorLogEntity?id=${id}`, { signal })
}

export const logKeys = {
  all: ['logs'] as const,
  httpList: (params: LogListParams) => [...logKeys.all, 'http', params] as const,
  errorList: (params: LogListParams) => [...logKeys.all, 'error', params] as const,
  httpDetail: (id: number | string) => [...logKeys.all, 'http', 'detail', id] as const,
  errorDetail: (id: number | string) => [...logKeys.all, 'error', 'detail', id] as const,
}
