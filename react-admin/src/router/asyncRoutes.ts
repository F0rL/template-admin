import type { RouteObject } from 'react-router'
import dashboardRoutes from './modules/dashboard'
import systemRoutes from './modules/system'

/**
 * 权限路由池：由 permission store 按后端菜单过滤后，
 * 挂到 AppRoutes 中 Layout 路由的 children（useRoutes 状态驱动，无 addRoute 等价物）。
 * 独立成文件以避免 permission store 与 router/index 的模块循环引用。
 */
export const asyncRoutes: RouteObject[] = [...dashboardRoutes, ...systemRoutes]
