/**
 * 默认布局
 * ---------------------------------------------
 * 对应 vue3-admin layouts/default/index.vue：
 * flex 满高 + 根容器 bg-bg-layout 页面底色（内容区灰底，与 panel-card 白块形成分块对比）
 * + aside 三态宽度（!sidebarOpened → w-0 隐藏；
 * sidebarIconOnly → w-16 图标模式；否则 w-56）+ Header + 内容滚动区。
 * 页面切换动画：key={pathname} 重挂载触发 animate-page-enter
 * （替代 vue3-admin fade-slide transition）。
 */
import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router'
import { useAppStore } from '@/stores/modules/app'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'

export default function DefaultLayout() {
  const location = useLocation()
  const sidebarOpened = useAppStore(s => s.sidebarOpened)
  const sidebarIconOnly = useAppStore(s => s.sidebarIconOnly)

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
        <main className="flex-1 overflow-auto p-4">
          <div key={location.pathname} className="animate-page-enter">
            {/* 权限页为 React.lazy 分包，就近承接挂起，避免整布局闪烁 */}
            <Suspense fallback={null}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}
