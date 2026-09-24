import { apiPost } from '@/utils/http'

// ==================== Types ====================

/** 附件上传返回实体（path 为后端相对路径，展示时经 resolveFileUrl 拼接） */
export interface UploadFileEntity {
  id: string
  newName: string
  oldName: string
  path: string
}

// ==================== API Functions ====================

/** 附件上传（multipart/form-data，字段名 File 与后端 IFormFile 对齐） */
export function sysFileUpload(data: FormData) {
  return apiPost<UploadFileEntity>('/SysFile/SysFileUpload', data)
}
