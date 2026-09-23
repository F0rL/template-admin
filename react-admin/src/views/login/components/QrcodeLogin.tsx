/**
 * 扫码登录（占位）
 * ---------------------------------------------
 * 对应 vue3-admin QrcodeLogin.vue：qrcode-placeholder 图形 + 返回账号登录。
 * 图形由 components.css 的 .qrcode-placeholder 提供（纯 CSS），
 * 接入真实二维码服务时替换为 img / canvas 组件即可。
 */
import { Button } from 'antd'

interface QrcodeLoginProps {
  onBack: () => void
}

export default function QrcodeLogin({ onBack }: QrcodeLoginProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div className="w-48">
        <div className="qrcode-placeholder" />
      </div>
      <p className="text-sm text-gray-500">使用 App 扫码登录（占位，待接入二维码服务）</p>
      <Button type="link" onClick={onBack}>
        返回账号登录
      </Button>
    </div>
  )
}
