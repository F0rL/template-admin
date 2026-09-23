/**
 * 侧边栏
 * ---------------------------------------------
 * 对应 vue3-admin Sidebar.vue：
 * - el-scrollbar → overflow-y-auto 容器
 * - el-menu router 模式 + collapse → antd Menu inline + inlineCollapsed，
 *   点击叶子 key（/path）导航，父级 key 仅做展开
 * - activeMenu = route.meta?.activeMenu || route.path → selectedKeys=[pathname]
 *   （占位阶段无详情页，activeMenu 随 Phase 2 需要 via route handle 补充）
 * - 底部折叠切换按钮 → toggleSidebarIconOnly
 */
import { useMemo } from 'react'
import { Menu } from 'antd'
import { useLocation, useNavigate } from 'react-router'
import RiArrowLeftSLine from '~icons/ri/arrow-left-s-line'
import RiArrowRightSLine from '~icons/ri/arrow-right-s-line'
import { useAppStore } from '@/stores/modules/app'
import { usePermissionStore } from '@/stores/modules/permission'
import Logo from './Logo'
import { buildMenuItems } from './SidebarItem'

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const menuData = usePermissionStore(s => s.menuData)
  const sidebarIconOnly = useAppStore(s => s.sidebarIconOnly)
  const toggleSidebarIconOnly = useAppStore(s => s.toggleSidebarIconOnly)

  const items = useMemo(() => buildMenuItems(menuData), [menuData])

  return (
    <div className="flex h-full flex-col">
      <Logo />
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <Menu
          className="sidebar-menu"
          mode="inline"
          inlineCollapsed={sidebarIconOnly}
          selectedKeys={[location.pathname]}
          items={items}
          onClick={({ key }) => {
            // 叶子 key 以 / 开头（路由路径），父级 key（path||id）不导航
            if (key.startsWith('/')) navigate(key)
          }}
          style={{ borderInlineEnd: 'none' }}
        />
      </div>
      <button
        type="button"
        onClick={toggleSidebarIconOnly}
        title={sidebarIconOnly ? '展开菜单' : '收起为图标模式'}
        className="flex h-10 w-full shrink-0 cursor-pointer items-center justify-center border-t border-gray-100 text-gray-500 transition-colors hover:text-gray-900"
      >
        {sidebarIconOnly ? <RiArrowRightSLine className="text-base" /> : <RiArrowLeftSLine className="text-base" />}
      </button>
    </div>
  )
}
