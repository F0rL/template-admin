/**
 * 后端接口统一响应结构
 *
 * 所有后端接口均返回此结构，data 承载业务数据：
 * - 登录接口：data 为 JWT Token 字符串
 * - 详情接口：data 为单个对象
 * - 分页列表接口：data 为 { list: [...], total }，total 在 data 内
 * - 业务错误时：data 为 null，msg 为错误提示文本，errors 为校验错误列表
 */
interface ApiResponse<T = unknown> {
  /** 业务数据载体，成功时承载实际返回数据，失败时为 null */
  data: T
  /** 业务状态码（0 表示成功，其余为业务错误码） */
  code: number
  /** 错误消息，成功时为 null/空，失败时包含错误描述 */
  msg: string | null
  /** 错误详情列表（表单校验等场景），无错误时为空数组 */
  errors: string[]
  /** 业务是否成功：true 正常，false 异常（错误原因在 msg，code 为业务错误码） */
  success: boolean
}

/**
 * 分页数据载体（data 内部结构，total 在 data 中）
 */
type PaginatedData<T> = { list: T[]; total: number }
