import { apiGet, apiPost } from '@/utils/http'

// ==================== Types ====================

/** 用户角色关联（列表行） */
export interface UserRoleItem {
  roleId: string
  roleName: string
}

/** 列表行 / 实体数据（id 即登录账号） */
export interface UserListItem {
  /** 是否可操作（true = 可勾选 / 可编辑 / 可删除），后端下发的操作权限标记 */
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
  /** false 时隐藏行内操作按钮（系统内置账号） */
  isDelHandle?: boolean
}

export interface UserListParams {
  page: number
  rows: number
  searchKey?: string
}

/** 新增 / 编辑提交载荷（pwd 为空表示不修改密码） */
export interface UserPayload {
  id?: string
  userId: string
  name: string
  pwd: string | null
  status: number
  avatar: string
  roleIds: string[]
}

/** 修改密码载荷（提交前各字段经 RSA 加密） */
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

/** 修改当前用户密码（oldPwd / newPwd1 / newPwd2 均为 RSA 密文） */
export function updateUserPwd(data: UpdatePwdPayload) {
  return apiPost('/SysUser/UpdatePwd', data)
}

// ==================== Query Keys ====================

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
}
