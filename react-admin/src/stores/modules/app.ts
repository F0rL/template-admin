import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { storageKey } from '@/stores'

interface AppState {
  /** 侧边栏是否展开 */
  sidebarOpened: boolean
  /** 侧边栏图标模式（只显示图标，不显示文字） */
  sidebarIconOnly: boolean
  toggleSidebar: () => void
  closeSidebar: () => void
  toggleSidebarIconOnly: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    set => ({
      sidebarOpened: true,
      sidebarIconOnly: false,

      toggleSidebar: () => set(s => ({ sidebarOpened: !s.sidebarOpened })),
      closeSidebar: () => set({ sidebarOpened: false }),
      toggleSidebarIconOnly: () => set(s => ({ sidebarIconOnly: !s.sidebarIconOnly })),
    }),
    {
      name: storageKey('app'),
      // 仅持久化展开状态；图标模式按会话临态，与 vue3-admin 行为一致
      partialize: s => ({ sidebarOpened: s.sidebarOpened }),
    },
  ),
)
