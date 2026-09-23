/**
 * 登录方式切换（账号 / 扫码）
 * ---------------------------------------------
 * 对应 vue3-admin LoginLayout.vue：useVModel 双向 tab + 滑动背景指示条。
 * React 版改为受控 props（activeTab / onChange），指示条用 translate-x-full 切换。
 */
import type { ComponentType, CSSProperties } from 'react'
import RiQrCodeLine from '~icons/ri/qr-code-line'
import RiUser3Line from '~icons/ri/user-3-line'

export type LoginTab = 'account' | 'qrcode'

interface LoginLayoutProps {
  activeTab: LoginTab
  onChange: (tab: LoginTab) => void
}

const TABS: {
  key: LoginTab
  label: string
  Icon: ComponentType<{ className?: string; style?: CSSProperties }>
}[] = [
  { key: 'account', label: '账号登录', Icon: RiUser3Line },
  { key: 'qrcode', label: '扫码登录', Icon: RiQrCodeLine },
]

export default function LoginLayout({ activeTab, onChange }: LoginLayoutProps) {
  return (
    <div className="relative flex rounded-lg bg-gray-100 p-1 text-sm">
      {/* 滑动背景指示条：宽度为半槽（减去两侧内边距），translate-x-full 切到右槽 */}
      <div
        aria-hidden
        className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-md bg-white shadow transition-transform duration-300 ${
          activeTab === 'qrcode' ? 'translate-x-full' : ''
        }`}
      />
      {TABS.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`relative z-1 flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md py-2 transition-colors ${
            activeTab === key ? 'font-medium text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Icon className="text-base" />
          {label}
        </button>
      ))}
    </div>
  )
}
