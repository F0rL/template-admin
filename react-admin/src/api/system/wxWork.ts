import { apiGet, apiPost } from '@/utils/http'

// ==================== Types ====================

/** 部门树节点 */
export interface DepartmentTreeNode {
  id: string
  name: string
  children?: DepartmentTreeNode[]
}

/** 组织成员列表项 */
export interface OrgUserItem {
  userid: string
  name: string
  mobile: string
  /** 1 男 0 女 */
  gender: 0 | 1
  genderText: string
  position: string
  department: { id: string; name: string }[]
}

/** 组织成员列表请求参数（分页字段名 row，对齐后端契约） */
export interface OrgUserListParams {
  departmentId: string
  searchKey?: string
  page: number
  row: number
}

// ==================== API Functions ====================

/** 获取部门树（全部一次性返回，POST 对齐后端契约） */
export function fetchDepartmentTree(params?: { type?: number }, signal?: AbortSignal) {
  return apiPost<DepartmentTreeNode[]>('/WxWork/GetTreeDepartmentList', params, { signal })
}

/** 获取部门下的成员列表（分页） */
export function fetchOrgUserList(params: OrgUserListParams, signal?: AbortSignal) {
  return apiGet<{ message: OrgUserItem[]; total: number }>('/WxWork/GetUserList', {
    params,
    signal,
  })
}

/** 刷新组织架构缓存 */
export function refreshOrgUsers() {
  return apiGet<void>('/WxWork/UserRefresh')
}

// ==================== Query Keys ====================

export const orgKeys = {
  all: ['org'] as const,
  departments: () => [...orgKeys.all, 'departments'] as const,
  users: () => [...orgKeys.all, 'users'] as const,
}
