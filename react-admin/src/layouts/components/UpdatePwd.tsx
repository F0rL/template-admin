/**
 * 修改密码弹窗（Header 用户菜单入口）
 * ---------------------------------------------
 * 对应 vue3-admin UpdatePwd.vue：
 * - 三字段（原密码 / 新密码 / 确认密码），新密码正则「至少 6 位且含 1 个特殊字符」
 * - 提交前三字段各自 encryptPwdRsa；成功后退出会话并跳登录页
 * React 版改为受控 props（open / onClose）；footer=null + 表单内提交按钮，
 * 避开 useForm 与 Modal 懒渲染/销毁的连接时序问题；destroyOnHidden 保证
 * 每次打开表单为初始态。
 */
import { useNavigate } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { Button, Form, Input, Modal } from 'antd'
import { updateUserPwd } from '@/api/system/sysUser'
import { usePermissionStore } from '@/stores/modules/permission'
import { useUserStore } from '@/stores/modules/user'
import { encryptPwdRsa } from '@/utils/encrypt'
import { message } from '@/utils/feedback'

/** 新密码规则：至少 6 位且包含 1 个特殊字符（与 vue3-admin 一致） */
const PWD_PATTERN = /^(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{6,}$/

interface UpdatePwdValues {
  oldPwd: string
  newPwd1: string
  newPwd2: string
}

interface UpdatePwdProps {
  open: boolean
  onClose: () => void
}

export default function UpdatePwd({ open, onClose }: UpdatePwdProps) {
  const navigate = useNavigate()

  const { mutate, isPending } = useMutation({
    mutationFn: (values: UpdatePwdValues) =>
      updateUserPwd({
        oldPwd: encryptPwdRsa(values.oldPwd),
        newPwd1: encryptPwdRsa(values.newPwd1),
        newPwd2: encryptPwdRsa(values.newPwd2),
      }),
    onSuccess: () => {
      message.success('密码修改成功，请重新登录')
      onClose()
      useUserStore.getState().resetToken()
      usePermissionStore.getState().resetRoutes()
      navigate('/login', { replace: true })
    },
  })

  return (
    <Modal
      title="修改密码"
      open={open}
      width={420}
      centered
      mask={{ closable: false }}
      footer={null}
      destroyOnHidden
      onCancel={onClose}
    >
      <Form<UpdatePwdValues> className="pt-2" onFinish={values => mutate(values)} requiredMark={false}>
        <Form.Item name="oldPwd" label="原密码" rules={[{ required: true, message: '请输入原密码' }]}>
          <Input.Password autoComplete="old-password" placeholder="请输入原密码" />
        </Form.Item>
        <Form.Item
          name="newPwd1"
          label="新密码"
          rules={[
            { required: true, message: '请输入新密码' },
            { pattern: PWD_PATTERN, message: '至少 6 位且包含 1 个特殊字符（!@#$%^&*）' },
          ]}
        >
          <Input.Password autoComplete="new-password" placeholder="至少 6 位且含 1 个特殊字符" />
        </Form.Item>
        <Form.Item
          name="newPwd2"
          label="确认新密码"
          dependencies={['newPwd1']}
          rules={[
            { required: true, message: '请再次输入新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPwd1') === value) return Promise.resolve()
                return Promise.reject(new Error('两次输入的密码不一致'))
              },
            }),
          ]}
        >
          <Input.Password autoComplete="new-password" placeholder="请再次输入新密码" />
        </Form.Item>
        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" htmlType="submit" loading={isPending}>
            确定
          </Button>
        </div>
      </Form>
    </Modal>
  )
}
