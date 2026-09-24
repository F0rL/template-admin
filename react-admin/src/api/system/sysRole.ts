import { apiGet, apiPost } from '@/utils/http'

// ==================== Constants ====================

/** 超级管理员角色 id（系统内置角色，不可编辑/删除） */
export const SUPER_ADMIN_ROLE_ID = '10086'

// ==================== Types ====================

export interface RoleListItem {
  id: string
  name: string
}

export interface RoleListParams {
  page: number
  rows: number
}

/** 角色实体（编辑态回填用） */
export interface RoleEntity {
  id: string
  name: string
  isDelHandle?: boolean
  status: { value: number; text: string }
  /** 已授权菜单（按 menuIdsJSON 解析） */
  menuList: { id: string; title: string }[]
  localUser: { id: string; name: string }[]
  workUser: { id: string; name: string }[]
  /** 已授权菜单 id 的 JSON 数组字符串（仅完全勾选，用于树回填） */
  menuIdsJSON?: string
}

/** 新增 / 编辑提交载荷 */
export interface RolePayload {
  id?: string
  name: string
  status: number
  /** 完全勾选 + 半选（父级）的菜单 id，后端据此构建菜单树关联 */
  menuIds: string[]
  /** 仅完全勾选的菜单 id（JSON 数组字符串，回填用） */
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
  /** 角色下拉选项（表单用，独立于分页列表的数据形状） */
  options: () => [...roleKeys.all, 'options'] as const,
}
