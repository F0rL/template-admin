import { create } from 'zustand'
import type { RouteObject } from 'react-router'
import type { MenuItem } from '@/api/system/auth'
import { fetchUserRightMenu } from '@/api/system/auth'
import { asyncRoutes } from '@/router/asyncRoutes'
import { collectMenuPaths, filterRoutes, getFirstVisiblePath } from '@/router/utils/filter'

interface PermissionState {
  /** 后端菜单树（Sidebar 渲染数据源） */
  menuData: MenuItem[]
  /** 动态路由是否已加载（AuthGuard 判断依据） */
  isRoutesLoaded: boolean
  /**
   * 过滤后的权限路由：作为响应式 state 由 AppRoutes 挂到 Layout children
   * （React Router useRoutes 无 addRoute 等价物，增删路由 = 更新 state）
   */
  routes: RouteObject[]
  /** 首个可见菜单 path（'/' 索引重定向目标，空串表示无可见菜单） */
  firstPath: string
  /** 拉取菜单并生成权限路由（并发去重；已加载后幂等） */
  generateRoutes: () => Promise<void>
  /** 清空动态路由与菜单（登出 / 401 / 加载失败时调用） */
  resetRoutes: () => void
  /** 重新拉取菜单并重建路由（权限变更场景） */
  refreshMenu: () => Promise<void>
}

/** 并发去重：多个调用方共享同一次加载（对齐 vue3-admin routesLoadedPromise 语义） */
let routesLoadedPromise: Promise<void> | null = null

export const usePermissionStore = create<PermissionState>()((set, get) => ({
  menuData: [],
  isRoutesLoaded: false,
  routes: [],
  firstPath: '',

  async generateRoutes() {
    if (get().isRoutesLoaded) return
    if (!routesLoadedPromise) {
      routesLoadedPromise = (async () => {
        const menus = await fetchUserRightMenu()
        const allowedPaths = collectMenuPaths(menus)
        const routes = filterRoutes(asyncRoutes, allowedPaths)
        const firstPath = getFirstVisiblePath(menus) ?? ''
        set({ menuData: menus, routes, firstPath, isRoutesLoaded: true })
      })().finally(() => {
        routesLoadedPromise = null
      })
    }
    await routesLoadedPromise
  },

  resetRoutes() {
    set({ menuData: [], routes: [], firstPath: '', isRoutesLoaded: false })
    routesLoadedPromise = null
  },

  async refreshMenu() {
    get().resetRoutes()
    await get().generateRoutes()
  },
}))
