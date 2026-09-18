import { apiGet, apiPost } from '@/utils/http'

// ==================== Types ====================

/** 删除请求对象（长整型ID），用于批量删除操作。 */
export interface DeleteRequest {
  ids: number[]
}

/** 上传附件请求参数（multipart/form-data） */
export interface SysFileUploadRequest {
  file?: string
}

/** 上传文件返回实体 */
export interface uploadFileEntity {
  id: string
  newName: string
  oldName: string
  path: string
}

export interface SysFileEntityParams {
  id: number
}

export interface SysFileListParams {
  page: number
  rows: number
  searchKey?: string | null
}

// ==================== API Functions ====================

// TODO: 手动补响应类型
/** 附件-PC 详情 */
export function fetchSysFileEntity(params?: SysFileEntityParams, signal?: AbortSignal) {
  return apiGet<unknown>('/SysFile/GetSysFileEntity', { params, signal })
}

// TODO: 手动补响应类型
/** 附件-PC 列表 */
export function fetchSysFileList(params?: SysFileListParams, signal?: AbortSignal) {
  return apiGet<unknown>('/SysFile/GetSysFileList', { params, signal })
}

/** 附件-PC 删除 */
export function sysFileDel(data: DeleteRequest) {
  return apiPost('/SysFile/SysFileDel', data)
}

/** 附件-PC 上传 */
export function sysFileUpload(data: FormData) {
  return apiPost<uploadFileEntity>('/SysFile/SysFileUpload', data)
}

// ==================== Query Keys ====================

export const sysFileKeys = {
  all: ['sysFile'] as const,
  lists: () => [...sysFileKeys.all, 'list'] as const,
}
