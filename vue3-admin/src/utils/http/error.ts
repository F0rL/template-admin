import axios from 'axios'
import { message } from '@/utils/feedback'
import pinia from '@/stores'
import { useUserStore } from '@/stores/modules/user'
import { usePermissionStore } from '@/stores/modules/permission'
import router from '@/router'

const HTTP_STATUS_MESSAGES: Record<number, string> = {
  400: '请求参数有误',
  401: '登录已过期，请重新登录',
  403: '没有操作权限',
  404: '请求的资源不存在',
  405: '请求方法不允许',
  408: '请求超时',
  500: '服务器内部错误',
  502: '网关错误',
  503: '服务不可用',
  504: '网关超时',
}

let isReLogging = false

/**
 * 业务错误（success === false）经响应拦截器统一处理后抛出的标记。
 * handleNetworkError 见到它直接放行，避免重复 toast。
 */
export class BusinessError extends Error {
  /** 后端业务码（HTTP 200 但 success:false 时的 code，如 401 鉴权失效）；declare 避免类字段降级生成共享 helper，把懒加载 chunk 拖进首屏 */
  declare code?: number
  constructor(message = '请求失败', code?: number) {
    super(message)
    this.name = 'BusinessError'
    this.code = code
  }
}

export function isSuccess(res: ApiResponse<unknown>): boolean {
  // 后端约定：接口能响应时 success:true 业务正常，false 异常（错误原因在 msg，code 为业务错误码）
  return res.success === true
}

/** 情况②：有响应体，success === false，业务错误（错误原因在 msg，code 为业务错误码） */
export function handleBusinessError(res: ApiResponse<unknown>) {
  // 401 鉴权失效：非登录页时清缓存跳登录；登录接口凭据错误等（已在登录页）仍走普通 toast
  if (res.code === 401 && router.currentRoute.value.path !== '/login') {
    handleUnauthorized(String(res.msg || '登录已过期，请重新登录'))
    return
  }
  const detail = res.errors?.length ? `：${res.errors.join('；')}` : ''
  message.error(`${res.msg ? String(res.msg) : '请求失败'}${detail}`)
}

/** 401 鉴权失效：清缓存 + 跳登录页，带防重入锁 */
function handleUnauthorized(msg = '登录已过期，请重新登录') {
  if (isReLogging) return
  isReLogging = true

  const userStore = useUserStore(pinia)
  const permissionStore = usePermissionStore(pinia)
  userStore.resetToken()
  permissionStore.resetRoutes()
  message.error(msg)
  router.push('/login').finally(() => {
    isReLogging = false
  })
}

/**
 * 情况①：无响应体（HTTP 非 200、网络异常、请求取消）。
 * 仅负责副作用（toast / 401 跳转）；调用方（拦截器）始终 reject，让业务层感知失败以关闭 loading 等。
 */
export function handleNetworkError(error: unknown): void {
  // 请求取消（vue-query 组件卸载时自动 abort signal → axios CanceledError）
  // 静默处理，不弹 toast
  if (axios.isCancel(error)) return
  // 业务错误已由响应拦截器统一处理，放行即可
  if (error instanceof BusinessError) return

  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    if (status === 401) {
      handleUnauthorized()
      return
    }
    const serverMsg = (error.response?.data as { msg?: string } | undefined)?.msg
    const msg =
      (serverMsg && String(serverMsg)) ||
      (status ? HTTP_STATUS_MESSAGES[status] : '') ||
      (status ? `请求失败 (${status})` : '网络连接失败，请检查网络')
    message.error(msg)
    return
  }

  message.error('网络连接失败，请检查网络')
}
