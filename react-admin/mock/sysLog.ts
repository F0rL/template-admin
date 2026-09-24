/**
 * 日志 mock（Phase 3）
 * ---------------------------------------------
 * 对齐 src/api/system/sysLog.ts：请求日志 / 错误日志的列表与详情。
 * 数据源为 db 的 httpLogs / errorLogs（模块加载时随机生成一次）。
 */
import { defineMock } from 'vite-plugin-mock-dev-server'
import type { LogDetail } from '../src/api/system/sysLog'
import { makeResp, makePageResp, paginate } from './utils'
import { errorLogs, httpLogs, LOG_HOSTS, LOG_USERS, randomLogItem } from './db'

/** 关键字过滤：事件名称 / 接口地址 / 调用人员 / 错误信息 */
function filterBySearchKey<T extends { actionName: string; url: string; userName: string }>(
  list: T[],
  searchKey: string,
): T[] {
  if (!searchKey) return list
  const kw = searchKey.toLowerCase()
  return list.filter(
    item =>
      item.actionName.toLowerCase().includes(kw) ||
      item.url.toLowerCase().includes(kw) ||
      item.userName.toLowerCase().includes(kw) ||
      ('message' in item && String(item.message).toLowerCase().includes(kw)),
  )
}

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/151.0.0.0 Safari/537.36'

export default defineMock([
  {
    url: '/api/SysLog/GetHttpLogList',
    method: 'GET',
    body: ({ query }) => {
      const filtered = filterBySearchKey(httpLogs, String(query.searchKey ?? ''))
      const { list, total } = paginate(filtered, Number(query.page) || 1, Number(query.rows) || 10)
      return makePageResp(list, total)
    },
  },
  {
    url: '/api/SysLog/GetErrorLogList',
    method: 'GET',
    body: ({ query }) => {
      const filtered = filterBySearchKey(errorLogs, String(query.searchKey ?? ''))
      const { list, total } = paginate(filtered, Number(query.page) || 1, Number(query.rows) || 10)
      return makePageResp(list, total)
    },
  },
  {
    url: '/api/SysLog/GetHttpLogEntity',
    method: 'GET',
    body: ({ query }) => {
      const id = Number(query.id)
      const item = httpLogs.find(log => log.id === id)
      const detail: LogDetail = item
        ? {
            id: item.id,
            url: item.url,
            method: item.method,
            actionName: item.actionName,
            actionType: 'Internal',
            host: randomLogItem(LOG_HOSTS),
            ipAddress: item.ipAddress,
            userId: randomLogItem(LOG_USERS).userId,
            userName: item.userName,
            userType: 10,
            statusCode: item.statusCode,
            elapsed: item.elapsed,
            createTime: item.createTime,
            source: 'Platform.WebApi',
            userAgent: USER_AGENT,
            queryString: '',
            body: '{}',
            message: '{"code":0,"success":true,"msg":"ok"}',
          }
        : { id }
      return makeResp(detail)
    },
  },
  {
    url: '/api/SysLog/GetErrorLogEntity',
    method: 'GET',
    body: ({ query }) => {
      const id = Number(query.id)
      const item = errorLogs.find(log => log.id === id)
      const detail: LogDetail = item
        ? {
            id: item.id,
            url: item.url,
            method: item.method,
            actionName: item.actionName,
            host: randomLogItem(LOG_HOSTS),
            ipAddress: item.ipAddress,
            userId: randomLogItem(LOG_USERS).userId,
            userName: item.userName,
            userType: 10,
            statusCode: item.statusCode,
            elapsed: item.elapsed,
            createTime: item.createTime,
            message: item.message,
          }
        : { id }
      return makeResp(detail)
    },
  },
])
