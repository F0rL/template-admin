/**
 * 构造标准 ApiResponse：
 * - 失败（code≠0）：data 为 null，msg 为错误文本
 * - 成功 + total 参数：data 为 { list, total }（分页）
 * - 成功无 total 参数：data 为原始载荷
 */
export function makeResp(payload: unknown, code = 0, total?: number): object {
  if (code !== 0) {
    return {
      data: null,
      code,
      msg: String(payload),
      errors: [],
      success: false,
    }
  }
  const data = total === undefined ? payload : { list: payload, total }
  return {
    data,
    code,
    msg: null,
    errors: [],
    success: true,
  }
}
