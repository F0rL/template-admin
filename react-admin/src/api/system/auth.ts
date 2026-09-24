import { apiGet, apiPost } from '@/utils/http'

// ==================== Types ====================

/** PC 端账号密码登录表单 */
export interface LoginPayload {
  username: string
  password: string
  verifyCode: string
  verifyKey: string
}

export interface UserInfo {
  id: string
  name: string
  avatar: string
  sysRoleUsers: { id: string; name: string }[]
}

// ==================== API Functions ====================

/** 获取登录验证码（base64 图片 + verifyKey） */
export function fetchCaptcha(signal?: AbortSignal) {
  return apiGet<{ base64: string; key: string }>('/Auth/GetLoginVerCode', { signal })
}

/** 账号密码登录，返回 token */
export function fetchToken(data: LoginPayload) {
  return apiPost<string>('/Auth/GetTokenPC', data)
}

/** 当前登录用户信息 */
export function fetchUserInfo() {
  return apiGet<UserInfo>('/Auth/GetUserInfo')
}
