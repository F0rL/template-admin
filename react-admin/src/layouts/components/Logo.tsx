/**
 * 侧边栏 Logo
 * ---------------------------------------------
 * 对应 vue3-admin Logo.vue：APP_TITLE 首字母渐变方块 + 标题，
 * 图标模式（sidebarIconOnly）下隐藏标题；点击回首页。
 */
import { useNavigate } from 'react-router'
import { config } from '@/config'
import { useAppStore } from '@/stores/modules/app'

export default function Logo() {
  const navigate = useNavigate()
  const sidebarIconOnly = useAppStore(s => s.sidebarIconOnly)

  return (
    <button
      type="button"
      onClick={() => navigate('/')}
      className="flex h-14 w-full shrink-0 cursor-pointer items-center gap-2.5 border-b border-gray-100 px-4"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white">
        {config.APP_TITLE.slice(0, 1)}
      </div>
      {!sidebarIconOnly && <span className="truncate text-base font-bold text-gray-900">{config.APP_TITLE}</span>}
    </button>
  )
}
