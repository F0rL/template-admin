import type { AxiosInstance, AxiosRequestConfig } from 'axios'

/**
 * Signal 取消链路：
 *   useQuery queryFn({ signal }) → fetch* 函数(signal) →
 *   apiGet/apiPost(url, config) 中的 config.signal →
 *   http.get/post(url, { ...config, signal }) → axios 原生消费
 *
 * 组件卸载时 vue-query 自动 abort signal → axios 抛出 CanceledError →
 *   error.ts handleNetworkError 中 axios.isCancel 静默处理
 */

/**
 * 创建 API 请求辅助函数，绑定到指定的 axios 实例
 *
 * 用法：
 *   const { apiGet, apiPost } = createApiHelpers(httpInstance)
 *
 * 多实例场景：
 *   const mainApi = createApiHelpers(http)
 *   const fileApi = createApiHelpers(httpFile)
 */
export function createApiHelpers(http: AxiosInstance) {
  /**
   * GET 请求 — 返回解包后的 data（原样返回，不统一处理分页，由调用方按响应数据结构自行处理）
   */
  async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const { data: res } = await http.get<ApiResponse<T>>(url, config)
    return res.data
  }

  /**
   * POST 请求 — 返回解包后的 data
   */
  async function apiPost<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const { data: res } = await http.post<ApiResponse<T>>(url, data, config)
    return res.data
  }

  return { apiGet, apiPost }
}
