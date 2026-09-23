/**
 * 菜单树 → antd Menu items 转换
 * ---------------------------------------------
 * 对应 vue3-admin SidebarItem.vue 递归组件：antd Menu 原生递归渲染 items，
 * React 侧改为纯数据转换，语义保持一致：
 * - isMenuShow === false 的节点不渲染
 * - 无可见子级 → 叶子项，key = /${path}（与路由路径一致，点击即导航）
 * - 有可见子级 → 子菜单，key = path || id（父级不承担导航）
 */
import type { ReactNode } from 'react'
import type { MenuProps } from 'antd'
import type { MenuItem } from '@/api/system/auth'
import DynamicIcon from '@/components/DynamicIcon'

export type MenuItems = NonNullable<MenuProps['items']>

export function buildMenuItems(menuTree: MenuItem[]): MenuItems {
  return menuTree
    .filter(item => item.isMenuShow !== false)
    .map(item => {
      const visibleChildren = (item.children ?? []).filter(child => child.isMenuShow !== false)
      const icon: ReactNode = item.icon ? <DynamicIcon name={item.icon} className="text-base" /> : undefined
      if (visibleChildren.length === 0) {
        return { key: `/${item.path}`, icon, label: item.title }
      }
      return {
        key: item.path || item.id,
        icon,
        label: item.title,
        children: buildMenuItems(visibleChildren),
      }
    })
}
