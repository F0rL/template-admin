import { apiGet, apiPost } from '@/utils/http'

// ==================== Types ====================

/** 菜单树节点（树表 / 权限树 / 表单回填共用） */
export interface MenuTreeNode {
  id: string
  title: string
  path?: string
  icon?: string
  order?: number
  isMenuShow?: boolean
  /** 系统内置菜单（不可删除） */
  _disabled?: boolean
  parent?: { id: string } | null
  children?: MenuTreeNode[]
}

/** 新增 / 编辑提交载荷 */
export interface MenuPayload {
  id?: string
  title: string
  path?: string
  icon?: string
  order: number
  isMenuShow: boolean
  parentId: string | null
}

// ==================== API Functions ====================

export function fetchMenuTree(params?: { searchKey?: string }, signal?: AbortSignal) {
  return apiGet<MenuTreeNode[]>('/SysMenu/GetMenuTree', { params, signal })
}

export function fetchMenuEntity(id: string, signal?: AbortSignal) {
  return apiGet<MenuTreeNode>('/SysMenu/GetMenuEntity', { params: { id }, signal })
}

/** 父级菜单候选（扁平列表，菜单表单用） */
export function fetchParentMenuAll(signal?: AbortSignal) {
  return apiGet<{ id: string; title: string }[]>('/SysMenu/GetParentMenuAll', { signal })
}

export function createMenu(data: MenuPayload) {
  return apiPost('/SysMenu/CreateMenu', data)
}

export function updateMenu(data: MenuPayload) {
  return apiPost('/SysMenu/UpdateMenu', data)
}

export function deleteMenu(data: { ids: string[] }) {
  return apiPost('/SysMenu/DeleteMenu', data)
}

// ==================== Query Keys ====================

export const menuKeys = {
  all: ['menus'] as const,
  trees: () => [...menuKeys.all, 'tree'] as const,
}
