/**
 * 默认布局
 * ---------------------------------------------
 * 对应 vue3-admin layouts/default/index.vue：
 * flex 满高 + 根容器 bg-bg-layout 页面底色（内容区灰底，与 panel-card 白块形成分块对比）
 * + aside 三态宽度（!sidebarOpened → w-0 隐藏；
 * sidebarIconOnly → w-16 图标模式；否则 w-56）+ Header + 内容滚动区。
 * 页面切换动画：<ViewTransition> 激活浏览器原生 View Transition（React 19.3），
 * 动画类 page-fade 定义见 src/styles/components.css（替代 vue3-admin fade-slide transition）。
 * 另承担两件路由元事务：导航后重置内容区滚动（scrollBehavior 等价物）；
 * 按 pathname 匹配权限路由表，取叶子 handle.title 写入 document.title。
 */
import { Suspense, useEffect, useRef, ViewTransition } from 'react'
import { Outlet, useLocation } from 'react-router'
import { useAppStore } from '@/stores/modules/app'
import { usePermissionStore } from '@/stores/modules/permission'
import { findRouteByPathname } from '@/router/utils/filter'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'

/** 路由 handle 元信息形状（由 router/modules/*.tsx 写入） */
type RouteHandle = { title?: string }

export default function DefaultLayout() {
  const sidebarOpened = useAppStore(s => s.sidebarOpened)
  const sidebarIconOnly = useAppStore(s => s.sidebarIconOnly)
  const location = useLocation()
  const permissionRoutes = usePermissionStore(s => s.routes)
  const mainRef = useRef<HTMLElement>(null)

  // 导航后重置内容区滚动位置（对应 vue3-admin 的 scrollBehavior: () => ({ top: 0 })）
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [location.pathname])

  // document.title：declarative mode 无 useMatches（data router 专属 API），
  // 以「权限路由表 + pathname 匹配」求叶子路由的 handle.title（对应 vue-router meta.title 惯例）；
  // 未命中（如 '/' 索引帧）保留 index.html 静态标题
  useEffect(() => {
    const leaf = findRouteByPathname(permissionRoutes, location.pathname)
    const title = (leaf?.handle as RouteHandle | undefined)?.title
    if (title) document.title = title
  }, [permissionRoutes, location.pathname])

  const asideWidthClass = !sidebarOpened ? 'w-0 overflow-hidden' : sidebarIconOnly ? 'w-16' : 'w-56'

  return (
    // 根容器铺页面底色（bg-bg-layout），内容区灰底 + panel-card 白块形成分块对比
    <div className="bg-bg-layout flex h-screen">
      <aside
        className={`${asideWidthClass} shrink-0 border-r border-gray-100 bg-white transition-all duration-300`}
      >
        <Sidebar />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main ref={mainRef} className="flex-1 overflow-auto p-4">
          {/* RR 导航状态更新包在 startTransition 中，路由切换会激活视图过渡；
              权限页为 React.lazy 分包，过渡期间保留旧页，加载完成后交叉淡入（就近承接挂起，避免整布局闪烁） */}
          <ViewTransition default="page-fade">
            <Suspense fallback={null}>
              <Outlet />
            </Suspense>
          </ViewTransition>
        </main>
      </div>
    </div>
  )
}
