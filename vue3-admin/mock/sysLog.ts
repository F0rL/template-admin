import { defineMock } from 'vite-plugin-mock-dev-server'
import type { LogDetail } from '../src/api/system/sysLog'
import { makeResp, makePageResp, paginate } from './utils'
import { httpLogs, errorLogs, randomLogItem, LOG_HOSTS, LOG_USERS } from './db'

function filterBySearchKey<T extends { actionName: string; url: string; userName: string }>(
  list: T[],
  searchKey: string,
): T[] {
  if (!searchKey) return list
  const kw = searchKey.toLowerCase()
  return list.filter(
    l =>
      l.actionName.toLowerCase().includes(kw) ||
      l.url.toLowerCase().includes(kw) ||
      l.userName.toLowerCase().includes(kw) ||
      ('message' in l && typeof l.message === 'string' && l.message.toLowerCase().includes(kw)),
  )
}

function paginateQuery<T>(list: T[], query: Record<string, unknown>) {
  return paginate(list, Number(query.page) || 1, Number(query.rows) || 10)
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/151.0.0.0 Safari/537.36'

export default defineMock([
  {
    url: '/api/SysLog/GetHttpLogList',
    method: 'GET',
    body: ({ query }) => {
      const { list, total } = paginateQuery(filterBySearchKey(httpLogs, String(query.searchKey ?? '')), query)
      return makePageResp(list, total)
    },
  },
  {
    url: '/api/SysLog/GetErrorLogList',
    method: 'GET',
    body: ({ query }) => {
      const { list, total } = paginateQuery(filterBySearchKey(errorLogs, String(query.searchKey ?? '')), query)
      return makePageResp(list, total)
    },
  },
  {
    url: '/api/SysLog/GetHttpLogEntity',
    method: 'GET',
    body: ({ query }) => {
      const id = Number(query.id)
      const item = httpLogs.find(l => l.id === id)
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
      const item = errorLogs.find(l => l.id === id)
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
