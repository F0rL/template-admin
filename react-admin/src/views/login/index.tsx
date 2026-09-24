/**
 * 登录页
 * ---------------------------------------------
 * 对应 vue3-admin views/login/index.vue：
 * 双栏布局（左品牌区大屏可见 + 右表单区，大屏右栏白底带阴影）、
 * 渐变底色 + 网格背景 + 模糊色块装饰；tab 双面板用 React 19 Activity 保活切换
 * （隐藏面板 display:none，容器固定高度，切换不重挂载、不重拉验证码）。
 */
import { Activity, useState } from 'react'
import { config } from '@/config'
import AccountLogin from './components/AccountLogin'
import LoginLayout, { type LoginTab } from './components/LoginLayout'
import QrcodeLogin from './components/QrcodeLogin'

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<LoginTab>('account')

  return (
    <div className="relative h-screen w-full overflow-hidden bg-linear-to-br from-blue-50 via-white to-slate-50 lg:flex">
      {/* 装饰层：网格背景 + 两团模糊色块（大屏下衬托品牌区） */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(color-mix(in_srgb,var(--ant-color-primary)_4%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_srgb,var(--ant-color-primary)_4%,transparent)_1px,transparent_1px)] bg-[length:48px_48px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/4 -left-32 h-125 w-125 -translate-y-1/2 rounded-full bg-blue-500/10 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -bottom-32 h-100 w-100 rounded-full bg-cyan-400/10 blur-[100px]"
      />

      {/* 左侧品牌区（大屏可见） */}
      <section className="relative z-10 hidden h-full flex-col justify-between px-16 py-10 lg:flex lg:flex-1">
        <div className="flex items-center gap-3">
          <div className="text-text-inverse flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-lg font-bold shadow-lg shadow-blue-600/20">
            {config.APP_TITLE.slice(0, 1)}
          </div>
          <span className="text-lg font-semibold text-slate-900">{config.APP_TITLE}管理后台</span>
        </div>

        <div className="max-w-md">
          <h1 className="text-[40px] leading-[1.15] font-bold tracking-tight text-slate-900">
            高效管理
            <span className="text-blue-600">后台系统</span>
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-500">
            一站式管理平台，涵盖用户、权限、数据看板等功能模块，助力团队高效协作。
          </p>
        </div>

        <div className="flex items-center gap-6 text-sm text-slate-400">
          <span>&copy; {new Date().getFullYear()}</span>
          <span className="h-3 w-px bg-slate-200" />
        </div>
      </section>

      {/* 右侧表单区（大屏白底带阴影） */}
      <section className="relative z-10 flex items-center justify-center py-8 lg:w-160 lg:bg-white lg:shadow">
        <div className="w-full max-w-120">
          <LoginLayout activeTab={activeTab} onChange={setActiveTab} />

          {/* 双面板用 React 19 Activity 保活切换：隐藏面板 display:none（不参与
              transition，无 visibility 被 antd transition:all 拖慢的问题）、
              保留组件状态与验证码缓存、隐藏时卸载 effects（倒计时暂停）；
              容器固定最小高度（取两面板较大值）→ 切换 tab 卡片宽高与位置不变 */}
          <div className="relative min-h-100">
            <Activity mode={activeTab === 'account' ? 'visible' : 'hidden'}>
              <AccountLogin />
            </Activity>
            <Activity mode={activeTab === 'qrcode' ? 'visible' : 'hidden'}>
              <QrcodeLogin onBack={() => setActiveTab('account')} />
            </Activity>
          </div>
        </div>
      </section>
    </div>
  )
}
