import { apiGet, apiPost } from '@/utils/http'

// ==================== Types ====================

/** 用户角色关联（列表返回） */
export interface UserRoleItem {
  roleId: string
  roleName: string
}

/** 列表行数据（id 即登录账号） */
export interface UserListItem {
  _disabled: boolean
  id: string
  name: string
  userId: string | null
  fileId?: string | null
  depId?: string | null
  depName?: string | null
  avatar: string
  wechatWorkUserId?: string | null
  status: number
  statusName: string
  userType: number
  userTypeName: string
  isAssociated: boolean
  sysRoleUsers: UserRoleItem[]
  isDelHandle?: boolean
}

export interface UserListParams {
  page: number
  rows: number
  searchKey?: string
}

export interface UserPayload {
  id?: string
  userId: string
  name: string
  pwd: string | null
  status: number
  avatar: string
  roleIds: string[]
  wechat_UserId?: string | null
  wechat_DepId?: string | null
  wechat_DepName?: string | null
}

export interface UpdatePwdPayload {
  oldPwd: string
  newPwd1: string
  newPwd2: string
}

// ==================== API Functions ====================

export function fetchUserList(params?: UserListParams, signal?: AbortSignal) {
  return apiGet<PaginatedData<UserListItem>>('/SysUser/GetUserList', { params, signal })
}

export function fetchUserEntity(id: string, signal?: AbortSignal) {
  return apiGet<UserListItem>('/SysUser/GetUserEntity', { params: { id }, signal })
}

export function createUser(data: UserPayload) {
  return apiPost('/SysUser/CreateUser', data)
}

export function updateUser(data: UserPayload) {
  return apiPost('/SysUser/UpdateUser', data)
}

export function deleteUser(data: { ids: string[] }) {
  return apiPost('/SysUser/DeleteUser', data)
}

export function resetUserPwd(data: { userId: string }) {
  return apiPost('/SysUser/ResetPwd', data)
}

export function updateUserPwd(data: UpdatePwdPayload) {
  return apiPost('/SysUser/UpdatePwd', data)
}

// ==================== Query Keys ====================

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
}
