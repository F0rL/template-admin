/**
 * 登录方式切换（账号 / 扫码）
 * ---------------------------------------------
 * 对应 vue3-admin LoginLayout.vue：欢迎语 + useVModel 双向 tab + 滑动背景指示条。
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
    <div className="w-full">
      {/* 欢迎语 */}
      <div className="text-center lg:text-left">
        <h1 className="text-2xl font-bold text-slate-900">欢迎回来</h1>
        <p className="mt-2 text-sm text-slate-500">登录您的账户以继续访问</p>
      </div>

      {/* 切换器：滑动背景指示条（主色块）用 translate-x-full 切到右槽 */}
      <div className="relative mt-8 flex w-full rounded-lg bg-slate-100 p-1">
        <div
          aria-hidden
          className={`absolute top-1 left-1 z-0 h-[calc(100%-8px)] w-[calc(50%-4px)] rounded-lg bg-blue-600 transition-transform duration-300 ease-out ${
            activeTab === 'qrcode' ? 'translate-x-full' : 'translate-x-0'
          }`}
        />
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`relative z-10 flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border-0 bg-transparent text-sm font-medium transition-colors duration-300 select-none ${
              activeTab === key ? 'text-text-inverse' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
