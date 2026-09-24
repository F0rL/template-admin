/**
 * 默认布局
 * ---------------------------------------------
 * 对应 vue3-admin layouts/default/index.vue：
 * flex 满高 + 根容器 bg-bg-layout 页面底色（内容区灰底，与 panel-card 白块形成分块对比）
 * + aside 三态宽度（!sidebarOpened → w-0 隐藏；
 * sidebarIconOnly → w-16 图标模式；否则 w-56）+ Header + 内容滚动区。
 * 页面切换动画：<ViewTransition> 激活浏览器原生 View Transition（React 19.3），
 * 动画类 page-fade 定义见 src/styles/components.css（替代 vue3-admin fade-slide transition）。
 */
import { Suspense, ViewTransition } from 'react'
import { Outlet } from 'react-router'
import { useAppStore } from '@/stores/modules/app'
import Header from '../components/Header'
import Sidebar from '../components/Sidebar'

export default function DefaultLayout() {
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
