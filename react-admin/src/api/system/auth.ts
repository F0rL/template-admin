import { apiGet, apiPost } from '@/utils/http'

// ==================== Types ====================

/** PC 端账号密码登录表单 */
export interface LoginPayload {
  username: string
  password: string
  verifyCode: string
  verifyKey: string
}

export interface UserInfo {
  id: string
  name: string
  avatar: string
  sysRoleUsers: { id: string; name: string }[]
}

/** 后端下发的菜单树节点（GetUserRightMenu），Sidebar 渲染与路由过滤的数据源 */
export interface MenuItem {
  id: string
  title: string
  icon?: string
  path?: string
  status?: number
  isMenuShow?: boolean
  children?: MenuItem[]
}

/** 修改密码载荷（提交前各字段经 RSA 加密） */
export interface UpdatePwdPayload {
  oldPwd: string
  newPwd1: string
  newPwd2: string
}

// ==================== API Functions ====================

/** 获取登录验证码（base64 图片 + verifyKey） */
export function fetchCaptcha(signal?: AbortSignal) {
  return apiGet<{ base64: string; key: string }>('/Auth/GetLoginVerCode', { signal })
}

/** 账号密码登录，返回 token */
export function fetchToken(data: LoginPayload) {
  return apiPost<string>('/Auth/GetTokenPC', data)
}

/** 当前登录用户信息 */
export function fetchUserInfo() {
  return apiGet<UserInfo>('/Auth/GetUserInfo')
}

/** 当前用户可见菜单树（权限路由过滤依据） */
export function fetchUserRightMenu() {
  return apiGet<MenuItem[]>('/SysMenu/GetUserRightMenu')
}

/** 修改当前用户密码（oldPwd / newPwd1 / newPwd2 均为 RSA 密文） */
export function updateUserPwd(data: UpdatePwdPayload) {
  return apiPost('/SysUser/UpdatePwd', data)
}
