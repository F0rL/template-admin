/**
 * 扫码登录（占位）
 * ---------------------------------------------
 * 对应 vue3-admin QrcodeLogin.vue：qrcode-placeholder 图形 + 返回账号登录。
 * 图形由 components.css 的 .qrcode-placeholder 提供（纯 CSS），
 * 接入真实二维码服务时替换为 img / canvas 组件即可。
 */
import RiArrowLeftLine from '~icons/ri/arrow-left-line'

interface QrcodeLoginProps {
  onBack: () => void
}

export default function QrcodeLogin({ onBack }: QrcodeLoginProps) {
  return (
    <div className="mt-6">
      <div className="mx-auto flex aspect-square w-full max-w-55 items-center justify-center rounded-2xl bg-slate-50 p-5">
        <div className="qrcode-placeholder" />
      </div>

      <p className="mt-5 text-center text-sm text-slate-400">打开企业微信或移动端管理应用扫码</p>

      <div className="mt-8 text-center">
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-1.5 border-0 bg-transparent text-sm font-medium text-blue-600 transition hover:text-blue-700"
          onClick={onBack}
        >
          <RiArrowLeftLine className="h-4 w-4" />
          返回账号登录
        </button>
      </div>
    </div>
  )
}
