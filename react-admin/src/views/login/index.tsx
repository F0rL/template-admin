/**
 * 登录页
 * ---------------------------------------------
 * 对应 vue3-admin views/login/index.vue：
 * 双栏布局（左品牌区大屏可见 + 右表单区）、网格背景 + 模糊色块装饰、
 * APP_TITLE 首字母徽标；tab 双面板用 React 19 Activity 保活切换
 * （隐藏面板 display:none，容器固定高度，切换不重挂载、不重拉验证码）。
 */
import { Activity, useState } from 'react'
import { config } from '@/config'
import AccountLogin from './components/AccountLogin'
import LoginLayout, { type LoginTab } from './components/LoginLayout'
import QrcodeLogin from './components/QrcodeLogin'

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<LoginTab>('account')
  const logoChar = config.APP_TITLE.slice(0, 1)

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-gray-50">
      {/* 装饰层：网格背景 + 两团模糊色块（大屏下衬托品牌区） */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.04)_1px,transparent_1px)] bg-[size:36px_36px]"
      />
      <div
        aria-hidden
        className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-blue-300/30 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute right-0 -bottom-24 h-80 w-80 rounded-full bg-indigo-300/30 blur-3xl"
      />

      {/* 左侧品牌区（大屏可见） */}
      <div className="relative z-1 hidden flex-1 flex-col justify-center px-16 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-2xl font-bold text-white">
            {logoChar}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{config.APP_TITLE}</h1>
        </div>
        <p className="mt-6 max-w-md text-base leading-7 text-gray-500">
          基于 React 19 + Vite + Ant Design 6 的后台管理骨架：登录鉴权、动态路由、权限菜单开箱即用。
        </p>
      </div>

      {/* 右侧表单区 */}
      <div className="relative z-1 flex w-full items-center justify-center px-6 lg:w-160">
        <div className="w-full max-w-100 rounded-2xl bg-white/80 p-10 shadow-xl backdrop-blur-sm">
          {/* 小屏品牌行 */}
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-base font-bold text-white">
              {logoChar}
            </div>
            <span className="text-lg font-bold text-gray-900">{config.APP_TITLE}</span>
          </div>

          <LoginLayout activeTab={activeTab} onChange={setActiveTab} />

          {/* 双面板用 React 19 Activity 保活切换：隐藏面板 display:none（不参与
              transition，无 visibility 被 antd transition:all 拖慢的问题）、
              保留组件状态与验证码缓存、隐藏时卸载 effects（倒计时暂停）；
              容器固定最小高度（取两面板较大值）→ 切换 tab 卡片宽高与位置不变 */}
          <div className="mt-6 min-h-77">
            <Activity mode={activeTab === 'account' ? 'visible' : 'hidden'}>
              <AccountLogin />
            </Activity>
            <Activity mode={activeTab === 'qrcode' ? 'visible' : 'hidden'}>
              <QrcodeLogin onBack={() => setActiveTab('account')} />
            </Activity>
          </div>
        </div>
      </div>
    </div>
  )
}
