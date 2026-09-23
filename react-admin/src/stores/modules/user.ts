import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LoginPayload, UserInfo } from '@/api/system/auth'
import * as authApi from '@/api/system/auth'
import { encryptPwdRsa } from '@/utils/encrypt'
import { storageKey } from '@/stores'

const EMPTY_USER: UserInfo = {
  id: '',
  name: '',
  avatar: '',
  sysRoleUsers: [],
}

interface UserState {
  token: string
  userInfo: UserInfo
  /** 登录：密码 RSA 加密后换取 token */
  login: (loginForm: LoginPayload) => Promise<void>
  /** 拉取并写入用户信息（AuthGuard 首载用，userInfo.id 为已加载标记） */
  loadUserInfo: () => Promise<UserInfo>
  /** 登出：清空会话（token + userInfo） */
  logout: () => void
  /** 清空会话（登录过期 / 加载失败时由 AuthGuard、http 401 调用） */
  resetToken: () => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      token: '',
      userInfo: EMPTY_USER,

      async login(loginForm) {
        const password = encryptPwdRsa(loginForm.password)
        const tokenStr = await authApi.fetchToken({ ...loginForm, password })
        set({ token: tokenStr })
      },

      async loadUserInfo() {
        const user = await authApi.fetchUserInfo()
        set({ userInfo: user })
        return user
      },

      logout() {
        get().resetToken()
      },

      resetToken() {
        set({ token: '', userInfo: EMPTY_USER })
      },
    }),
    {
      name: storageKey('user'),
      // 仅持久化会话数据，action 不落盘
      partialize: s => ({ token: s.token, userInfo: s.userInfo }),
    },
  ),
)

/** 派生选择器：是否已登录（组件内 useUserStore(selectIsLoggedIn)） */
export const selectIsLoggedIn = (s: UserState) => !!s.token

/** 派生选择器：当前用户角色列表 */
export const selectRoles = (s: UserState) => s.userInfo.sysRoleUsers
