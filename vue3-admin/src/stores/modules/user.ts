import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { LoginPayload, UserInfo } from '@/api/system/auth'
import * as authApi from '@/api/system/auth'
import { encryptPwdRsa } from '@/utils/encrypt'

export const useUserStore = defineStore(
  'user',
  () => {
    const token = ref('')
    const userInfo = ref<UserInfo>({
      id: '',
      name: '',
      avatar: '',
      sysRoleUsers: [],
    })

    const isLoggedIn = computed(() => !!token.value)
    const roles = computed(() => userInfo.value.sysRoleUsers)

    async function login(loginForm: LoginPayload) {
      const password = encryptPwdRsa(loginForm.password)
      const tokenStr = await authApi.fetchToken({ ...loginForm, password })
      token.value = tokenStr
    }

    async function loadUserInfo() {
      const user = await authApi.fetchUserInfo()
      userInfo.value = user
      return user
    }

    async function logout() {
      resetToken()
    }

    function resetToken() {
      token.value = ''
      userInfo.value = {
        id: '',
        name: '',
        avatar: '',
        sysRoleUsers: [],
      }
    }

    return {
      token,
      userInfo,
      isLoggedIn,
      roles,
      login,
      loadUserInfo,
      logout,
      resetToken,
    }
  },
  {
    persist: {
      pick: ['token', 'userInfo'],
    },
  },
)
