/**
 * 顶部栏
 * ---------------------------------------------
 * 对应 vue3-admin Header.vue：
 * - 折叠按钮（sidebarOpened 三态宽度的开关）+ 面包屑（findMenuTrail）
 * - 右侧用户菜单（Dropdown）：头像 32px（有 avatar 用图片，否则首字母兜底 'U'）
 *   + 修改密码（UpdatePwd 弹窗）/ 退出登录（confirm → logout + resetRoutes → /login）
 */
import { useMemo, useState } from 'react'
import { Avatar, Breadcrumb, Dropdown } from 'antd'
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useLocation, useNavigate } from 'react-router'
import { useAppStore } from '@/stores/modules/app'
import { usePermissionStore } from '@/stores/modules/permission'
import { useUserStore } from '@/stores/modules/user'
import { findMenuTrail } from '@/router/utils/filter'
import { resolveFileUrl } from '@/utils/file'
import { confirm, message } from '@/utils/feedback'
import UpdatePwd from './UpdatePwd'

export default function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const sidebarOpened = useAppStore(s => s.sidebarOpened)
  const toggleSidebar = useAppStore(s => s.toggleSidebar)
  const menuData = usePermissionStore(s => s.menuData)
  const userInfo = useUserStore(s => s.userInfo)
  const [pwdOpen, setPwdOpen] = useState(false)

  /** 面包屑：当前路径在菜单树中的祖先链 */
  const trail = useMemo(
    () => findMenuTrail(menuData, location.pathname),
    [menuData, location.pathname],
  )

  const userMenuItems: MenuProps['items'] = [
    { key: 'updatePwd', label: '修改密码' },
    { type: 'divider' },
    { key: 'logout', label: '退出登录', danger: true },
  ]

  const handleLogout = async () => {
    if (!(await confirm('确定退出登录吗？'))) return
    useUserStore.getState().logout()
    usePermissionStore.getState().resetRoutes()
    navigate('/login', { replace: true })
    message.success('已退出登录')
  }

  const handleUserMenuClick: NonNullable<MenuProps['onClick']> = ({ key }) => {
    if (key === 'updatePwd') {
      setPwdOpen(true)
      return
    }
    if (key === 'logout') void handleLogout()
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-100 bg-white px-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleSidebar}
          title={sidebarOpened ? '收起侧边栏' : '展开侧边栏'}
          className="hover:bg-fill-light flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-gray-600 transition-colors"
        >
          {sidebarOpened ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
        </button>
        <Breadcrumb items={trail.map(item => ({ key: item.id, title: item.title }))} />
      </div>

      <Dropdown
        menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
        placement="bottomRight"
        trigger={['click']}
      >
        <button
          type="button"
          className="hover:bg-fill-light flex cursor-pointer items-center gap-2 rounded-full p-1 transition-colors"
        >
          <Avatar
            size={32}
            src={userInfo.avatar ? resolveFileUrl(userInfo.avatar) : undefined}
            style={{ backgroundColor: 'var(--ant-color-primary)', fontSize: 14 }}
          >
            {userInfo.name.slice(0, 1) || 'U'}
          </Avatar>
          <span className="max-w-30 truncate text-sm text-gray-700">{userInfo.name}</span>
        </button>
      </Dropdown>

      <UpdatePwd open={pwdOpen} onClose={() => setPwdOpen(false)} />
    </header>
  )
}
