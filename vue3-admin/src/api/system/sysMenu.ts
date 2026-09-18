import { apiGet, apiPost } from '@/utils/http'

// ==================== Types ====================

export interface MenuTreeNode {
  id: string
  title: string
  path?: string
  icon?: string
  order?: number
  createTime?: string
  isMenuShow?: boolean
  _disabled?: boolean
  parent?: { id: string } | null
  sysFile?: { sysFileId: string; url: string }
  children?: MenuTreeNode[]
}

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

export function fetchUserRightMenu() {
  return apiGet<MenuTreeNode[]>('/SysMenu/GetUserRightMenu')
}

export function fetchMenuList(params?: { searchKey?: string }, signal?: AbortSignal) {
  return apiGet<PaginatedData<MenuTreeNode>>('/SysMenu/GetMenuList', { params, signal })
}

export function fetchMenuTree(params?: { searchKey?: string }, signal?: AbortSignal) {
  return apiGet<MenuTreeNode[]>('/SysMenu/GetMenuTree', { params, signal })
}

export function fetchMenuEntity(id: string, signal?: AbortSignal) {
  return apiGet<MenuTreeNode>('/SysMenu/GetMenuEntity', { params: { id }, signal })
}

export function fetchParentMenuAll(signal?: AbortSignal) {
  return apiGet<MenuTreeNode[]>('/SysMenu/GetParentMenuAll', { signal })
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
  list: () => [...menuKeys.all, 'list'] as const,
  trees: () => [...menuKeys.all, 'tree'] as const,
}
