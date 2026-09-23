import { lazy, Suspense, useEffect } from 'react'
import { Navigate, useLocation, useNavigate, useRoutes, type RouteObject } from 'react-router'
import { usePermissionStore } from '@/stores/modules/permission'
import { setNavigateBridge, syncLocation } from './navigate'
import { AuthGuard, GuestGuard } from './AuthGuard'
import DefaultLayout from '@/layouts/default'

/**
 * 页面级代码分割：declarative mode（useRoutes）不支持 route.lazy，
 * 用 React.lazy + Suspense 实现等价分包（Suspense 见 AppRoutes / DefaultLayout）。
 */
const LoginPage = lazy(() => import('@/views/login/index'))
const ErrorPage = lazy(() => import('@/views/result/error'))

/**
 * 静态路由：登录页（游客守卫）、错误页、404 兜底。
 * 动态权限路由见 asyncRoutes.ts（由 permission store 过滤后经 AppRoutes 挂载）。
 */
const constantRoutes: RouteObject[] = [
  {
    path: '/login',
    element: (
      <GuestGuard>
        <LoginPage />
      </GuestGuard>
    ),
  },
  {
    path: '/error',
    element: <ErrorPage />,
  },
  {
    path: '*',
    element: <ErrorPage />,
  },
]

/**
 * 非组件上下文桥：挂载时注入 navigate 引用并同步 location，
 * 供 axios 拦截器 401 跳转（navigate）与路径判断（getPathname）使用。
 */
function NavigateBridge() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    setNavigateBridge(navigate)
    return () => setNavigateBridge(null)
  }, [navigate])

  useEffect(() => {
    syncLocation(location)
  }, [location])

  return null
}

/**
 * 全局路由表：constantRoutes + Layout 守卫路由。
 * children = '/' 索引重定向（firstPath）+ 权限路由（状态驱动，加载完成后才匹配）。
 * Suspense 承接静态页（登录/错误）的 React.lazy 挂起；
 * 权限页的挂起由 DefaultLayout 内容区就近承接，避免整布局闪烁。
 */
export function AppRoutes() {
  const permissionRoutes = usePermissionStore(s => s.routes)
  const firstPath = usePermissionStore(s => s.firstPath)

  return (
    <Suspense fallback={null}>
      {useRoutes([
        ...constantRoutes,
        {
          path: '/',
          element: (
            <AuthGuard>
              <DefaultLayout />
            </AuthGuard>
          ),
          children: [
            // '/' 跳首个可见菜单（对齐 vue3-admin Layout redirect）
            ...(firstPath ? [{ index: true, element: <Navigate to={`/${firstPath}`} replace /> }] : []),
            ...permissionRoutes,
          ],
        },
      ])}
    </Suspense>
  )
}

export default function RouterRoot() {
  return (
    <>
      <NavigateBridge />
      <AppRoutes />
    </>
  )
}
