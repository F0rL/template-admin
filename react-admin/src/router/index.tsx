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
 * 静态路由：登录页（游客守卫）、错误页。
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
 * 全局路由表：constantRoutes + Layout 守卫路由 + 404 兜底。
 * children = '/' 索引重定向（firstPath）+ 权限路由（状态驱动，加载完成后才匹配）。
 * Suspense 承接静态页（登录/错误）的 React.lazy 挂起；
 * 权限页的挂起由 DefaultLayout 内容区就近承接，避免整布局闪烁。
 */
export function AppRoutes() {
  const permissionRoutes = usePermissionStore(s => s.routes)
  const firstPath = usePermissionStore(s => s.firstPath)

  // 先用 useRoutes 求出 element 再渲染（避免在 JSX 表达式位置调用 hook，可读性更佳）
  const element = useRoutes([
    ...constantRoutes,
    {
      path: '/',
      element: (
        <AuthGuard>
          <DefaultLayout />
        </AuthGuard>
      ),
      children: [
        // '/' 索引重定向（对齐 vue3-admin Layout redirect）：
        // 无可见菜单（firstPath 为空）时兜底到 /error，避免内容区空白
        { index: true, element: <Navigate to={firstPath ? `/${firstPath}` : '/error'} replace /> },
        ...permissionRoutes,
      ],
    },
    {
      // 404 兜底，兼作深链刷新的守卫入口：刷新时权限路由尚未生成（routes 为空），
      // 深链只能命中 splat 分支；由 AuthGuard 触发菜单加载，完成后 useRoutes 重匹配，
      // 权限路由分支得分高于 splat 故优先命中。未登录访问未知路径 → 登录页。
      path: '*',
      element: (
        <AuthGuard>
          <ErrorPage />
        </AuthGuard>
      ),
    },
  ])

  return <Suspense fallback={null}>{element}</Suspense>
}

export default function RouterRoot() {
  return (
    <>
      <NavigateBridge />
      <AppRoutes />
    </>
  )
}
