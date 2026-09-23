/**
 * mock 响应助手（vite-plugin-mock-dev-server）
 * ---------------------------------------------
 * 只保留响应结构构造函数；请求上下文类型由插件内置 MockRequest 提供。
 * 注意：db.ts / utils.ts 已在 vite.config 的插件 exclude 中排除，
 * 不会被扫描为 mock 配置（纯数据源 / 工具模块，无 defineMock 默认导出）。
 */

/** 构造标准成功响应（结构对齐 src/types/global.d.ts 的 ApiResponse） */
export function makeResp<T>(payload: T): ApiResponse<T> {
  return { data: payload, code: 0, msg: null, errors: [], success: true }
}

/** 分页成功响应：data 为 { list, total } */
export function makePageResp<T>(list: T[], total: number): ApiResponse<PaginatedData<T>> {
  return makeResp({ list, total })
}

/** 业务错误响应：HTTP 仍为 200，success:false，msg 承载错误文本 */
export function makeErrorResp(msg: string, code = -1): ApiResponse<null> {
  return { data: null, code, msg, errors: [], success: false }
}

/** 内存分页（page 从 1 开始），返回 data 内的 { list, total } */
export function paginate<T>(list: T[], page: number, rows: number): PaginatedData<T> {
  const start = (page - 1) * rows
  return { list: list.slice(start, start + rows), total: list.length }
}
