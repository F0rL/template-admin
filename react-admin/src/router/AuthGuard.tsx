import { useEffect, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useUserStore } from '@/stores/modules/user'
import { usePermissionStore } from '@/stores/modules/permission'
import { navigate } from './navigate'

/**
 * 受保护路由守卫（对齐 vue3-admin beforeEach 的非白名单分支）：
 * - 无 token → 跳登录页（携带 redirect）
 * - 已登录但动态路由未加载 → 拉用户信息 + 生成权限路由，期间渲染 null
 *   （菜单就绪后 store 更新触发 re-render，useRoutes 重新匹配目标路径）
 * - 加载失败 → 清会话回登录页（避免守卫异常白屏）
 * 白名单（/login、/error）由路由结构保证不经此守卫。
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const location = useLocation()
  const token = useUserStore(s => s.token)
  const isRoutesLoaded = usePermissionStore(s => s.isRoutesLoaded)

  const needRedirectLogin = !token
  const needLoad = !!token && !isRoutesLoaded

  useEffect(() => {
    if (!needLoad) return
    void (async () => {
      try {
        // id 由后端生成且非空，作为用户信息已加载的可靠标记
        if (!useUserStore.getState().userInfo.id) {
          await useUserStore.getState().loadUserInfo()
        }
        await usePermissionStore.getState().generateRoutes()
      } catch {
        // 用户信息 / 动态路由加载失败（鉴权失效、网络异常等）：清会话回登录页
        useUserStore.getState().resetToken()
        usePermissionStore.getState().resetRoutes()
        navigate(`/login?redirect=${location.pathname}`, { replace: true })
      }
    })()
  }, [needLoad, location.pathname])

  if (needRedirectLogin) {
    return <Navigate to={`/login?redirect=${location.pathname}`} replace />
  }
  if (needLoad) return null
  return <>{children}</>
}

/** 游客守卫：已登录访问登录页 → 回首页（对齐 vue3-admin 白名单分支） */
export function GuestGuard({ children }: { children: ReactNode }) {
  const token = useUserStore(s => s.token)
  if (token) return <Navigate to="/" replace />
  return <>{children}</>
}
