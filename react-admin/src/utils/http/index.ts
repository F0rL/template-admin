import axios from 'axios'
import { useUserStore } from '@/stores/modules/user'
import { isSuccess, handleBusinessError, handleNetworkError, BusinessError } from './error'
import { config } from '@/config'
import { createApiHelpers } from './apiHelpers'

const http = axios.create({
  baseURL: config.API_BASE_URL,
  timeout: 15000,
})

// Token 注入（Zustand 组件外读取：useUserStore.getState()）
http.interceptors.request.use(reqConfig => {
  const { token } = useUserStore.getState()
  if (token) {
    reqConfig.headers.Authorization = `Bearer ${token}`
  }
  return reqConfig
})

// 响应拦截：业务错误（success === false）统一在此处理，不再下沉到 apiGet/apiPost
http.interceptors.response.use(
  response => {
    const res = response.data as ApiResponse<unknown>
    if (!isSuccess(res)) {
      handleBusinessError(res)
      return Promise.reject(new BusinessError(String(res.msg || '请求失败'), res.code))
    }
    return response
  },
  error => {
    // handleNetworkError 内部决定是否弹 toast（取消静默、401 跳转等）
    handleNetworkError(error)
    return Promise.reject(error)
  },
)

// 导出默认 axios 实例 + 预配置的 API 辅助函数
export default http
export const { apiGet, apiPost } = createApiHelpers(http)
