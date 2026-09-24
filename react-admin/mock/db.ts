/**
 * Mock 统一数据源：所有 handler 共享同一份内存数据，
 * 规范源为部门树（depts），用户的 depId/depName/性别/岗位均与其对齐。
 * （与 vue3-admin/mock/db.ts 保持完全一致，确保两端消费同一套数据）
 */

// ==================== 部门树（规范源） ====================

export interface MockDept {
  id: string
  name: string
  parentId: string | null
  userIds: string[]
}

export const depts: MockDept[] = [
  { id: '1', name: '示例集团', parentId: null, userIds: [] },
  { id: '2', name: '研发部', parentId: '1', userIds: ['liuyi', 'chener'] },
  { id: '3', name: '产品部', parentId: '1', userIds: ['yangsi'] },
  { id: '4', name: '设计部', parentId: '1', userIds: [] },
  { id: '5', name: '人力资源部', parentId: '1', userIds: ['sunqi', 'zhouba'] },
  { id: '6', name: '财务部', parentId: '1', userIds: ['wujiu', 'zhengshi'] },
  { id: '7', name: '技术部', parentId: '1', userIds: ['admin', 'zhangsan', 'lisi'] },
  { id: '8', name: '市场部', parentId: '1', userIds: ['wangwu', 'zhaoliu'] },
]

// ==================== 用户 ====================

const AVATAR_PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#c0c4cc"/><text x="50" y="64" font-size="44" text-anchor="middle" fill="#fff">人</text></svg>',
  )

export interface MockUser {
  id: string
  userId: string
  name: string
  avatar: string
  /** 1 启用，其它禁用 */
  status: number
  roleIds: string[]
  isDelHandle: boolean
  _disabled: boolean
  /** 企业微信性别：1 男 0 女 */
  gender: 0 | 1
  position: string
  depId: string
  depName: string
}

export const users: MockUser[] = [
  {
    id: 'admin',
    userId: 'admin',
    name: '管理员',
    avatar: AVATAR_PLACEHOLDER,
    status: 1,
    roleIds: ['10086'],
    isDelHandle: false,
    _disabled: true,
    gender: 1,
    position: '系统管理员',
    depId: '7',
    depName: '技术部',
  },
  {
    id: 'zhangsan',
    userId: 'zhangsan',
    name: '张三',
    avatar: AVATAR_PLACEHOLDER,
    status: 1,
    roleIds: ['740000000000000001'],
    isDelHandle: true,
    _disabled: true,
    gender: 1,
    position: '前端开发',
    depId: '7',
    depName: '技术部',
  },
  {
    id: 'lisi',
    userId: 'lisi',
    name: '李四',
    avatar: AVATAR_PLACEHOLDER,
    status: 1,
    roleIds: ['740000000000000002'],
    isDelHandle: true,
    _disabled: false,
    gender: 1,
    position: '后端开发',
    depId: '7',
    depName: '技术部',
  },
  {
    id: 'wangwu',
    userId: 'wangwu',
    name: '王五',
    avatar: AVATAR_PLACEHOLDER,
    status: -1,
    roleIds: ['740000000000000002'],
    isDelHandle: true,
    _disabled: false,
    gender: 1,
    position: '市场专员',
    depId: '8',
    depName: '市场部',
  },
  {
    id: 'zhaoliu',
    userId: 'zhaoliu',
    name: '赵六',
    avatar: AVATAR_PLACEHOLDER,
    status: 1,
    roleIds: ['740000000000000003'],
    isDelHandle: true,
    _disabled: false,
    gender: 0,
    position: '市场经理',
    depId: '8',
    depName: '市场部',
  },
  {
    id: 'sunqi',
    userId: 'sunqi',
    name: '孙七',
    avatar: AVATAR_PLACEHOLDER,
    status: 1,
    roleIds: ['740000000000000002'],
    isDelHandle: true,
    _disabled: false,
    gender: 1,
    position: '人事主管',
    depId: '5',
    depName: '人力资源部',
  },
  {
    id: 'zhouba',
    userId: 'zhouba',
    name: '周八',
    avatar: AVATAR_PLACEHOLDER,
    status: -1,
    roleIds: ['740000000000000003'],
    isDelHandle: true,
    _disabled: false,
    gender: 0,
    position: '人事专员',
    depId: '5',
    depName: '人力资源部',
  },
  {
    id: 'wujiu',
    userId: 'wujiu',
    name: '吴九',
    avatar: AVATAR_PLACEHOLDER,
    status: 1,
    roleIds: ['740000000000000001'],
    isDelHandle: true,
    _disabled: false,
    gender: 1,
    position: '财务主管',
    depId: '6',
    depName: '财务部',
  },
  {
    id: 'zhengshi',
    userId: 'zhengshi',
    name: '郑十',
    avatar: AVATAR_PLACEHOLDER,
    status: 1,
    roleIds: ['740000000000000002'],
    isDelHandle: true,
    _disabled: false,
    gender: 1,
    position: '会计',
    depId: '6',
    depName: '财务部',
  },
  {
    id: 'liuyi',
    userId: 'liuyi',
    name: '刘一',
    avatar: AVATAR_PLACEHOLDER,
    status: 1,
    roleIds: ['740000000000000003'],
    isDelHandle: true,
    _disabled: false,
    gender: 0,
    position: '前端工程师',
    depId: '2',
    depName: '研发部',
  },
  {
    id: 'chener',
    userId: 'chener',
    name: '陈二',
    avatar: AVATAR_PLACEHOLDER,
    status: 1,
    roleIds: ['740000000000000002'],
    isDelHandle: true,
    _disabled: false,
    gender: 0,
    position: '后端工程师',
    depId: '2',
    depName: '研发部',
  },
  {
    id: 'yangsi',
    userId: 'yangsi',
    name: '杨四',
    avatar: AVATAR_PLACEHOLDER,
    status: -1,
    roleIds: ['740000000000000003'],
    isDelHandle: true,
    _disabled: false,
    gender: 1,
    position: '产品专员',
    depId: '3',
    depName: '产品部',
  },
]

/** 固定 mock 手机号（按用户序号生成，保证稳定） */
export function mobileOf(userId: string): string {
  const idx = users.findIndex(u => u.userId === userId)
  return `138${String(idx + 1).padStart(8, '0')}`
}

// ==================== 角色 ====================

export interface MockRole {
  id: string
  name: string
  status: number
  menuIdsJSON: string
}

export const roles: MockRole[] = [
  { id: '10086', name: '超级管理员组', status: 1, menuIdsJSON: '["1","3","4","5","6","7"]' },
  { id: '738088897698856960', name: '测试角色', status: 1, menuIdsJSON: '["1","7"]' },
  { id: '740000000000000001', name: '系统管理员', status: 1, menuIdsJSON: '["1","3","4","5","6","7"]' },
  { id: '740000000000000002', name: '普通用户', status: 1, menuIdsJSON: '["1"]' },
  { id: '740000000000000003', name: '访客', status: 0, menuIdsJSON: '["1"]' },
  { id: '740000000000000004', name: '财务专员', status: 1, menuIdsJSON: '["1"]' },
  { id: '740000000000000005', name: '人事专员', status: 1, menuIdsJSON: '["1"]' },
  { id: '740000000000000006', name: '运营专员', status: 0, menuIdsJSON: '["1"]' },
  { id: '740000000000000007', name: '市场专员', status: 1, menuIdsJSON: '["1"]' },
  { id: '740000000000000008', name: '客服专员', status: 1, menuIdsJSON: '["1"]' },
  { id: '740000000000000009', name: '采购专员', status: 0, menuIdsJSON: '["1"]' },
  { id: '740000000000000010', name: '仓储专员', status: 1, menuIdsJSON: '["1"]' },
  { id: '740000000000000011', name: '质检专员', status: 1, menuIdsJSON: '["1"]' },
  { id: '740000000000000012', name: '数据分析师', status: 1, menuIdsJSON: '["1"]' },
  { id: '740000000000000013', name: '内容编辑', status: 1, menuIdsJSON: '["1"]' },
  { id: '740000000000000014', name: '视觉设计师', status: 1, menuIdsJSON: '["1"]' },
  { id: '740000000000000015', name: '前端开发', status: 1, menuIdsJSON: '["1"]' },
  { id: '740000000000000016', name: '后端开发', status: 1, menuIdsJSON: '["1"]' },
  { id: '740000000000000017', name: '测试工程师', status: 1, menuIdsJSON: '["1"]' },
  { id: '740000000000000018', name: '运维工程师', status: 1, menuIdsJSON: '["1"]' },
  { id: '740000000000000019', name: '项目经理', status: 1, menuIdsJSON: '["1"]' },
  { id: '740000000000000020', name: '产品经理', status: 1, menuIdsJSON: '["1"]' },
  { id: '740000000000000021', name: '部门主管', status: 1, menuIdsJSON: '["1","6"]' },
  { id: '740000000000000022', name: '部门经理', status: 1, menuIdsJSON: '["1","5","6"]' },
  { id: '740000000000000023', name: '数据录入员', status: 0, menuIdsJSON: '["1"]' },
  { id: '740000000000000024', name: '培训讲师', status: 1, menuIdsJSON: '["1"]' },
  { id: '740000000000000025', name: '区域负责人', status: 1, menuIdsJSON: '["1","6"]' },
]

export function roleNameOf(id: string): string {
  return roles.find(r => r.id === id)?.name ?? '未知角色'
}

// ==================== 菜单 ====================

export interface MockMenu {
  id: string
  title: string
  path?: string
  icon?: string
  order: number
  createTime: string
  isMenuShow: boolean
  _disabled: boolean
  parentId: string | null
}

export const menus: MockMenu[] = [
  {
    id: '1',
    title: '首页',
    path: 'dashboard',
    icon: 'ad:home-filled',
    order: 1,
    createTime: '2024-07-04 13:49:00',
    isMenuShow: true,
    _disabled: false,
    parentId: null,
  },
  {
    id: '2',
    title: '系统设置',
    icon: 'ad:setting',
    order: 2,
    createTime: '2024-07-04 13:49:00',
    isMenuShow: true,
    _disabled: true,
    parentId: null,
  },
  {
    id: '3',
    title: '菜单管理',
    path: 'sys-menu-list',
    icon: 'ad:menu',
    order: 1,
    createTime: '2024-07-04 13:49:00',
    isMenuShow: true,
    _disabled: true,
    parentId: '2',
  },
  {
    id: '4',
    title: '角色管理',
    path: 'sys-role-list',
    icon: 'ri:shield-user-line',
    order: 2,
    createTime: '2024-07-04 13:49:00',
    isMenuShow: true,
    _disabled: true,
    parentId: '2',
  },
  {
    id: '5',
    title: '账户管理',
    path: 'sys-user-list',
    icon: 'ad:user',
    order: 3,
    createTime: '2024-07-04 13:49:00',
    isMenuShow: true,
    _disabled: true,
    parentId: '2',
  },
  {
    id: '6',
    title: '组织架构',
    path: 'sys-org-list',
    icon: 'ad:list',
    order: 4,
    createTime: '2024-07-04 13:49:00',
    isMenuShow: true,
    _disabled: true,
    parentId: '2',
  },
  {
    id: '7',
    title: '日志管理',
    path: 'sys-log-list',
    icon: 'ad:document',
    order: 5,
    createTime: '2024-07-04 13:49:00',
    isMenuShow: true,
    _disabled: true,
    parentId: '2',
  },
]

// ==================== 日志（随机生成一次，进程内稳定） ====================

const LOG_METHODS = ['GET', 'POST', 'PUT', 'DELETE']
const LOG_ACTIONS = [
  { actionName: '菜单列表', url: '/api/SysMenu/GetMenuList' },
  { actionName: '菜单树', url: '/api/SysMenu/GetMenuTree' },
  { actionName: '角色列表', url: '/api/SysRole/GetRoleList' },
  { actionName: '用户列表', url: '/api/SysUser/GetUserList' },
  { actionName: '组织架构', url: '/api/WxWork/GetOrgTree' },
  { actionName: '请求日志', url: '/api/SysLog/GetHttpLogList' },
  { actionName: '错误日志', url: '/api/SysLog/GetErrorLogList' },
  { actionName: '创建用户', url: '/api/SysUser/CreateUser' },
  { actionName: '更新角色', url: '/api/SysRole/UpdateRole' },
  { actionName: '删除菜单', url: '/api/SysMenu/DeleteMenu' },
]
const LOG_HOSTS = ['43.142.111.195:89', '192.168.1.100', '10.0.0.5', '172.16.0.1']
const LOG_IPS = [
  '::ffff:27.19.162.115',
  '::ffff:10.0.0.8',
  '::ffff:172.16.0.3',
  '::ffff:192.168.1.66',
]
const LOG_USERS = [
  { userId: 'SysAdmin0808', userName: '超级管理员' },
  { userId: 'zhangsan', userName: '张三' },
  { userId: 'lisi', userName: '李四' },
  { userId: 'wangwu', userName: '王五' },
  { userId: 'zhaoliu', userName: '赵六' },
]
const LOG_ERRORS = [
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

function genHttpLogs() {
  const today = new Date()
  return Array.from({ length: 38 }, (_, i) => {
    const action = randomItem(LOG_ACTIONS)
    const user = randomItem(LOG_USERS)
    return {
      id: 800 + i,
      url: action.url,
      method: randomItem(LOG_METHODS),
      actionName: action.actionName,
      statusCode: randomItem([200, 200, 200, 400, 500]),
      ipAddress: randomItem(LOG_IPS),
      userName: user.userName,
      createTime: randomTime(today),
      elapsed: randomInt(5, 2800),
    }
  })
}

function genErrorLogs() {
  const today = new Date()
  return Array.from({ length: 21 }, (_, i) => {
    const action = randomItem(LOG_ACTIONS)
    const user = randomItem(LOG_USERS)
    return {
      id: 500 + i,
      url: action.url,
      method: randomItem(LOG_METHODS),
      actionName: action.actionName,
      statusCode: randomItem([400, 401, 403, 404, 500]),
      message: randomItem(LOG_ERRORS),
      ipAddress: randomItem(LOG_IPS),
      userName: user.userName,
      createTime: randomTime(today),
      elapsed: randomInt(5, 2800),
    }
  })
}

export const httpLogs = genHttpLogs()
export const errorLogs = genErrorLogs()
export { randomItem as randomLogItem, LOG_HOSTS, LOG_USERS }

// ==================== 登录验证码 ====================

export const MOCK_CAPTCHA_KEY = 'mock-captcha-key'

/** 固定验证码图片 base64（内容仅为展示，登录已免校验） */
export const CAPTCHA_BASE64 =
  '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'
