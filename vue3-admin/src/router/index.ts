import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
import NProgress from 'nprogress'
import { useUserStore } from '@/stores/modules/user'
import { usePermissionStore } from '@/stores/modules/permission'
import { config } from '@/config'

import dashboardRoutes from './modules/dashboard'
import systemRoutes from './modules/system'

// 只保留顶部进度条，不显示右上角的 loading 转圈图标
NProgress.configure({ showSpinner: false })

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    icon?: string
    hidden?: boolean
    affix?: boolean
    activeMenu?: string
  }
}

export const constantRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { hidden: true, title: '登录' },
  },
  {
    path: '/error',
    name: 'Error',
    component: () => import('@/views/result/error.vue'),
    meta: { hidden: true, title: '错误' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'CatchAll',
    component: () => import('@/views/result/error.vue'),
    meta: { hidden: true },
  },
]

export const asyncRoutes: RouteRecordRaw[] = [...dashboardRoutes, ...systemRoutes]

const router = createRouter({
  history: createWebHistory(config.BASE_URL),
  routes: constantRoutes,
  scrollBehavior: () => ({ top: 0 }),
})

const whiteList = ['/login', '/error']

router.beforeEach(async to => {
  NProgress.start()
  const userStore = useUserStore()
  const permissionStore = usePermissionStore()

  // 白名单静态页（登录页、错误页）直接放行；已登录访问登录页则回首页
  if (whiteList.includes(to.path)) {
    if (to.path === '/login' && userStore.token) return '/'
    return
  }

  if (!userStore.token) {
    return `/login?redirect=${to.path}`
  }

  if (!permissionStore.isRoutesLoaded) {
    // id 由后端生成且非空，作为用户信息已加载的可靠标记
    if (!userStore.userInfo.id) {
      await userStore.loadUserInfo()
    }
    await permissionStore.generateRoutes()
    return { path: to.path, query: to.query, replace: true }
  }
})

router.afterEach(() => {
  NProgress.done()
})

export default router
