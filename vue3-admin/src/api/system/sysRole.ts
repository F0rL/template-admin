import { apiGet, apiPost } from '@/utils/http'

// ==================== Constants ====================

/** 超级管理员角色 id（系统内置角色，不可编辑/删除） */
export const SUPER_ADMIN_ROLE_ID = '10086'

// ==================== Types ====================

export interface RoleEntity {
  id: string
  name: string
  isDelHandle?: boolean
  status: { value: number; text: string }
  menuList: { id: string; title: string }[]
  localUser: { id: string; name: string }[]
  workUser: { id: string; name: string }[]
  menuIdsJSON?: string
}

export interface RoleListItem {
  id: string
  name: string
}

export interface RoleListParams {
  page: number
  rows: number
}

export interface RolePayload {
  id?: string
  name: string
  status: number
  menuIds: string[]
  menuIdsJSON: string
}

// ==================== API Functions ====================

export function fetchRoleList(params?: RoleListParams, signal?: AbortSignal) {
  return apiGet<PaginatedData<RoleListItem>>('/SysRole/GetRoleList', { params, signal })
}

export function fetchRoleEntity(id: string, signal?: AbortSignal) {
  return apiGet<RoleEntity>('/SysRole/GetRoleEntity', { params: { id }, signal })
}

export function createRole(data: RolePayload) {
  return apiPost('/SysRole/CreateRole', data)
}

export function updateRole(data: RolePayload) {
  return apiPost('/SysRole/UpdateRole', data)
}

export function deleteRole(data: { ids: string[] }) {
  return apiPost('/SysRole/DeleteRole', data)
}

// ==================== Query Keys ====================

export const roleKeys = {
  all: ['roles'] as const,
  lists: () => [...roleKeys.all, 'list'] as const,
}
