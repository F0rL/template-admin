import { lazy } from 'react'
import type { RouteObject } from 'react-router'

/**
 * dashboard 模块路由。
 * path 为相对 Layout 的子路径（与后端菜单 path 一致，无前导斜杠）；
 * 展示元信息放 handle（title / icon），DefaultLayout 按 pathname 匹配路由表读取叶子 title 写入 document.title。
 * declarative mode（useRoutes）不支持 route.lazy，用 React.lazy 分包。
 */
const Dashboard = lazy(() => import('@/views/dashboard/index'))

const dashboardRoutes: RouteObject[] = [
  {
    path: 'dashboard',
    element: <Dashboard />,
    handle: { title: '首页' },
  },
]

export default dashboardRoutes
