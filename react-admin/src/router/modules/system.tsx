import { lazy } from 'react'
import type { RouteObject } from 'react-router'

/**
 * system 模块路由。
 * path 与后端菜单 path 一致（无前导斜杠），由 permission store 按菜单权限过滤后挂载。
 * declarative mode（useRoutes）不支持 route.lazy，用 React.lazy 分包。
 */
const UserList = lazy(() => import('@/views/system/user/index'))
const LogList = lazy(() => import('@/views/system/log/index'))
const MenuList = lazy(() => import('@/views/system/menu/index'))
const OrgList = lazy(() => import('@/views/system/org/index'))
const RoleList = lazy(() => import('@/views/system/role/index'))

const systemRoutes: RouteObject[] = [
  {
    path: 'sys-user-list',
    element: <UserList />,
    handle: { title: '账户管理' },
  },
  {
    path: 'sys-log-list',
    element: <LogList />,
    handle: { title: '日志管理' },
  },
  {
    path: 'sys-menu-list',
    element: <MenuList />,
    handle: { title: '菜单管理' },
  },
  {
    path: 'sys-org-list',
    element: <OrgList />,
    handle: { title: '组织架构' },
  },
  {
    path: 'sys-role-list',
    element: <RoleList />,
    handle: { title: '角色管理' },
  },
]

export default systemRoutes
