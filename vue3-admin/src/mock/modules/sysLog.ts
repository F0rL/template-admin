import type MockAdapter from 'axios-mock-adapter'
import { makeResp } from '../utils'
import type { HttpLogListItem, ErrorLogListItem, LogDetail } from '@/api/system/sysLog'

const methods = ['GET', 'POST', 'PUT', 'DELETE']
const actions = [
  { controller: '系统管理', actionName: '菜单列表', url: '/api/SysMenu/GetMenuList' },
  { controller: '系统管理', actionName: '菜单树', url: '/api/SysMenu/GetMenuTree' },
  { controller: '系统管理', actionName: '角色列表', url: '/api/SysRole/GetRoleList' },
  { controller: '系统管理', actionName: '用户列表', url: '/api/SysUser/GetUserList' },
  { controller: '系统管理', actionName: '组织架构', url: '/api/SysOrg/GetDepartmentTree' },
  { controller: '系统管理', actionName: '请求日志', url: '/api/SysLog/GetHttpLogList' },
  { controller: '系统管理', actionName: '错误日志', url: '/api/SysLog/GetErrorLogList' },
  { controller: '系统管理', actionName: '创建用户', url: '/api/SysUser/CreateUser' },
  { controller: '系统管理', actionName: '更新角色', url: '/api/SysRole/UpdateRole' },
  { controller: '系统管理', actionName: '删除菜单', url: '/api/SysMenu/DeleteMenu' },
]

const hosts = ['43.142.111.195:89', '192.168.1.100', '10.0.0.5', '172.16.0.1']
const ips = ['::ffff:27.19.162.115', '::ffff:10.0.0.8', '::ffff:172.16.0.3', '::ffff:192.168.1.66']
const users = [
  { userId: 'SysAdmin0808', userName: '超级管理员' },
  { userId: 'zhangsan', userName: '张三' },
  { userId: 'lisi', userName: '李四' },
  { userId: 'wangwu', userName: '王五' },
  { userId: 'zhaoliu', userName: '赵六' },
]
const errors = [
  'System.NullReferenceException: 未将对象引用设置到对象的实例。',
  'System.Exception: 数据库连接超时',
  'System.ArgumentException: 参数无效',
  'System.InvalidOperationException: 序列不包含任何元素',
]

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
function pad(n: number): string {
  return String(n).padStart(2, '0')
}
function randomTime(today: Date): string {
  const h = randomInt(0, 23)
  const m = randomInt(0, 59)
  const s = randomInt(0, 59)
  return `${today.getFullYear()}/${pad(today.getMonth() + 1)}/${pad(today.getDate())} ${pad(h)}:${pad(m)}:${pad(s)}`
}

function genHttpLogs(): HttpLogListItem[] {
  const today = new Date()
  return Array.from({ length: 38 }, (_, i) => {
    const action = randomItem(actions)
    const user = randomItem(users)
    return {
      id: 800 + i,
      url: action.url,
      method: randomItem(methods),
      actionName: action.actionName,
      statusCode: randomItem([200, 200, 200, 400, 500]),
      ipAddress: randomItem(ips),
      userName: user.userName,
      createTime: randomTime(today),
      elapsed: randomInt(5, 2800),
    }
  })
}

function genErrorLogs(): ErrorLogListItem[] {
  const today = new Date()
  return Array.from({ length: 21 }, (_, i) => {
    const action = randomItem(actions)
    const user = randomItem(users)
    return {
      id: 500 + i,
      url: action.url,
      method: randomItem(methods),
      actionName: action.actionName,
      statusCode: randomItem([400, 401, 403, 404, 500]),
      message: randomItem(errors),
      ipAddress: randomItem(ips),
      userName: user.userName,
      createTime: randomTime(today),
      elapsed: randomInt(5, 2800),
    }
  })
}

const httpLogs = genHttpLogs()
const errorLogs = genErrorLogs()

function paginate<T>(list: T[], params: Record<string, unknown>) {
  const searchKey = ((params.searchKey as string) || '').toLowerCase()
  const startTime = (params.startTime as string) || ''
  const endTime = (params.endTime as string) || ''
  let filtered = [...list]
  if (searchKey) {
    filtered = filtered.filter(
      (l: any) =>
        l.actionName.toLowerCase().includes(searchKey) ||
        l.url.toLowerCase().includes(searchKey) ||
        l.userName.toLowerCase().includes(searchKey) ||
        (l.message && l.message.toLowerCase().includes(searchKey)),
    )
  }
  const pageIndex = Number(params.page) || 1
  const pageSize = Number(params.rows) || 10
  const total = filtered.length
  const start = (pageIndex - 1) * pageSize
  const page = filtered.slice(start, start + pageSize)
  return makeResp(page, 0, total)
}

export function registerSysLogMock(mock: MockAdapter) {
  mock.onGet('/api/SysLog/GetHttpLogList').reply(config => {
    return [200, paginate(httpLogs, config.params || {})]
  })
  mock.onGet('/api/SysLog/GetErrorLogList').reply(config => {
    return [200, paginate(errorLogs, config.params || {})]
  })
  mock.onGet('/api/SysLog/GetHttpLogEntity').reply(config => {
    const id = Number(config.params?.id)
    const item = httpLogs.find(l => l.id === id)
    const detail: LogDetail = item
      ? {
          id: item.id,
          url: item.url,
          method: item.method,
          actionName: item.actionName,
          actionType: 'Internal',
          host: randomItem(hosts),
          ipAddress: item.ipAddress,
          userId: randomItem(users).userId,
          userName: item.userName,
          userType: 10,
          statusCode: item.statusCode,
          elapsed: item.elapsed,
          createTime: item.createTime,
          source: 'Platform.WebApi',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/151.0.0.0 Safari/537.36',
          queryString: '',
          body: '{}',
          message: '{"code":0,"success":true,"msg":"ok"}',
        }
      : { id: id }
    return [200, makeResp(detail)]
  })
  mock.onGet('/api/SysLog/GetErrorLogEntity').reply(config => {
    const id = Number(config.params?.id)
    const item = errorLogs.find(l => l.id === id)
    const detail: LogDetail = item
      ? {
          id: item.id,
          url: item.url,
          method: item.method,
          actionName: item.actionName,
          host: randomItem(hosts),
          ipAddress: item.ipAddress,
          userId: randomItem(users).userId,
          userName: item.userName,
          userType: 10,
          statusCode: item.statusCode,
          elapsed: item.elapsed,
          createTime: item.createTime,
          message: item.message,
        }
      : { id: id }
    return [200, makeResp(detail)]
  })
}
