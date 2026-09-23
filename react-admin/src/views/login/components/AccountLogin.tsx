/**
 * 账号密码登录
 * ---------------------------------------------
 * 对应 vue3-admin AccountLogin.vue：
 * - username ≥3 位 / password ≥6 位 / 验证码必填
 * - 验证码原文大写后 md5Hash 作 verifyCode，fetchCaptcha 的 key 作 verifyKey
 * - 登录成功 → loadUserInfo → redirect 校验（startsWith('/') 且非 '//'）跳转
 * - 失败 → 刷新验证码并清空已输验证码（错误 toast 由 http 层统一弹出，不重复提示）
 * 验证码用 react-query 管理（挂载自动拉取、invalidate 即刷新）；
 * OTP 输入用 antd Input.OTP 替代 el-input-otp（design.md 开放问题 #4）。
 */
import { useState } from 'react'
import { Button, Form, Input } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchCaptcha } from '@/api/system/auth'
import { useUserStore } from '@/stores/modules/user'
import { md5Hash } from '@/utils/encrypt'

interface AccountLoginValues {
  username: string
  password: string
  captchaCode: string
}

export default function AccountLogin() {
  const [form] = Form.useForm<AccountLoginValues>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const [submitting, setSubmitting] = useState(false)

  /** 验证码：base64 图片 + key（作为 verifyKey 随登录提交） */
  const { data: captcha } = useQuery({
    queryKey: ['captcha'],
    // signal 透传：组件卸载时 react-query 自动 abort，请求取消
    queryFn: ({ signal }) => fetchCaptcha(signal),
  })
  const refreshCaptcha = () => void queryClient.invalidateQueries({ queryKey: ['captcha'] })

  const handleFinish = async ({ username, password, captchaCode }: AccountLoginValues) => {
    setSubmitting(true)
    try {
      await useUserStore.getState().login({
        username,
        password,
        // 后端约定：验证码原文大写后取 md5
        verifyCode: md5Hash(captchaCode.toUpperCase()),
        verifyKey: captcha?.key ?? '',
      })
      // 与 vue3-admin 一致：登录成功后补拉用户信息再跳转
      await useUserStore.getState().loadUserInfo()
      const redirect = searchParams.get('redirect')
      const target =
        redirect && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/'
      navigate(target, { replace: true })
    } catch {
      // 失败：刷新验证码并清空已输验证码
      refreshCaptcha()
      form.setFieldValue('captchaCode', '')
    } finally {
      setSubmitting(false)
    }
  }

  const captchaImg = captcha ? `data:image/png;base64,${captcha.base64}` : ''

  return (
    <Form<AccountLoginValues> form={form} size="large" onFinish={handleFinish} requiredMark={false}>
      <Form.Item
        name="username"
        rules={[
          { required: true, message: '请输入用户名' },
          { min: 3, message: '用户名至少 3 位' },
        ]}
      >
        <Input
          prefix={<UserOutlined className="text-gray-400" />}
          placeholder="用户名"
          autoComplete="username"
        />
      </Form.Item>
      <Form.Item
        name="password"
        rules={[
          { required: true, message: '请输入密码' },
          { min: 6, message: '密码至少 6 位' },
        ]}
      >
        <Input.Password
          prefix={<LockOutlined className="text-gray-400" />}
          placeholder="密码"
          autoComplete="current-password"
        />
      </Form.Item>
      <div className="mb-6 flex items-center gap-2">
        <Form.Item
          className="mb-0! min-w-0 flex-1"
          name="captchaCode"
          rules={[{ required: true, message: '请输入验证码' }]}
        >
          <Input.OTP
            length={4}
            formatter={value => value.replace(/[^0-9a-zA-Z]/g, '')}
            onChange={value => {
              // 输满 4 位自动提交（对齐 vue3-admin 的 @finish 行为）
              if (value.length === 4) form.submit()
            }}
          />
        </Form.Item>
        {captchaImg ? (
          <img
            src={captchaImg}
            alt="验证码"
            title="点击刷新"
            className="h-10 w-28 shrink-0 cursor-pointer rounded-md"
            onClick={refreshCaptcha}
          />
        ) : (
          <div
            className="flex h-10 w-28 shrink-0 cursor-pointer items-center justify-center rounded-md bg-gray-100 text-xs text-gray-400"
            onClick={refreshCaptcha}
          >
            点击加载
          </div>
        )}
      </div>
      <Button className="mt-4" type="primary" htmlType="submit" block loading={submitting}>
        登录
      </Button>
    </Form>
  )
}
