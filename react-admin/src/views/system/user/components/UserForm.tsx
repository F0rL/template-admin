/**
 * 账户表单（新增 / 编辑抽屉）
 * ---------------------------------------------
 * 对应 vue3-admin views/system/user/components/UserForm.vue：
 * 右侧 560px 抽屉，基本信息（姓名/账号/密码/头像）+ 权限配置（角色/状态），
 * 超管编辑态可重置密码；提交走 useDialogForm（成功 toast + 关闭 + 失效列表缓存）。
 *
 * 与 Vue 版的差异（React 惯用法）：
 * - 表单状态全部收敛在 antd Form 内（含头像 fileList，经 valuePropName/getValueFromEvent 映射），
 *   父级每次打开通过 key 重挂载本组件，表单自然回到初始态（等价 Vue 版 open 时的 reset）
 * - 编辑态打开后由 useQuery 拉取实体回填，加载态由 Spin 承接
 */
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Drawer, Form, Input, Select, Spin, Switch, Upload } from 'antd'
import type { UploadFile, UploadProps } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { UserListItem, UserPayload } from '@/api/system/sysUser'
import { createUser, fetchUserEntity, resetUserPwd, updateUser } from '@/api/system/sysUser'
import { SUPER_ADMIN_ROLE_ID, fetchRoleList, roleKeys } from '@/api/system/sysRole'
import type { UploadFileEntity } from '@/api/system/sysFile'
import { sysFileUpload } from '@/api/system/sysFile'
import { selectRoles, useUserStore } from '@/stores/modules/user'
import { confirm, message, notify, withLoading } from '@/utils/feedback'
import { md5Hash } from '@/utils/encrypt'
import { resolveFileUrl, validateImageFile } from '@/utils/file'
import { useDialogForm } from '@/hooks/useDialogForm'

/** 密码规则：至少 6 位且包含 1 个特殊字符（与 vue3-admin 一致） */
const PWD_PATTERN = /^(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{6,}$/

/** 上传响应中表单实际消费的字段（antd 把 customRequest 的 onSuccess 入参写入 file.response） */
type UploadResponse = Pick<UploadFileEntity, 'path'>

interface UserFormValues {
  name: string
  userId: string
  pwd?: string
  pwd1?: string
  status: boolean
  roleIds: string[]
  avatar: UploadFile[]
}

interface UserFormProps {
  open: boolean
  editingRow: UserListItem | null
  onClose: () => void
  onSuccess: () => void
}

export default function UserForm({ open, editingRow, onClose, onSuccess }: UserFormProps) {
  const currentRoles = useUserStore(selectRoles)
  const isSuperAdmin = currentRoles.some(role => role.id === SUPER_ADMIN_ROLE_ID)

  /** 角色下拉选项（独立 options 键；缓存 1 分钟，避免每次打开抽屉重新请求） */
  const { data: roleOptions } = useQuery({
    queryKey: roleKeys.options(),
    queryFn: ({ signal }) =>
      fetchRoleList({ page: 1, rows: 999 }, signal).then(res => res.list ?? []),
    staleTime: 60 * 1000,
  })

  /** 编辑态打开时拉取实体（新增无请求），加载态由 Spin 承接 */
  const { data: entity, isFetching: entityLoading } = useQuery({
    queryKey: ['userEntity', editingRow?.id],
    queryFn: ({ signal }) => fetchUserEntity(editingRow!.id, signal),
    enabled: open && !!editingRow,
  })

  const { form, isEdit, saveMutation, pending } = useDialogForm<UserFormValues, UserListItem>({
    editingRow,
    submit: (values, editing) => {
      const payload: UserPayload = {
        userId: values.userId,
        name: values.name,
        // 编辑态不改密码
        pwd: !editing && values.pwd ? md5Hash(values.pwd) : null,
        status: values.status ? 1 : -1,
        // 上传成功时 antd 会把 customRequest 的响应写回 file.response
        avatar: (values.avatar?.[0]?.response as UploadResponse | undefined)?.path ?? '',
        roleIds: values.roleIds,
      }
      return editing ? updateUser({ ...payload, id: editing.id }) : createUser(payload)
    },
    onSuccess: () => {
      onClose()
      onSuccess()
    },
  })

  const avatarFiles = Form.useWatch('avatar', form) ?? []

  // 实体回填（新增无实体，保持初始态）
  useEffect(() => {
    if (!open || !entity) return
    form.setFieldsValue({
      name: entity.name,
      userId: entity.id,
      roleIds: entity.sysRoleUsers.map(role => role.roleId),
      status: entity.status === 1,
      avatar: entity.avatar
        ? [
            {
              uid: '-1',
              name: 'avatar',
              status: 'done',
              url: resolveFileUrl(entity.avatar),
              // 与上传成功后的 file.response 结构保持一致，提交时统一取 path
              response: { path: entity.avatar } satisfies UploadResponse,
            },
          ]
        : [],
    })
  }, [open, entity, form])

  function handleBeforeUpload(file: File) {
    return validateImageFile(file)
  }

  async function handleUpload(options: Parameters<NonNullable<UploadProps['customRequest']>>[0]) {
    const formData = new FormData()
    // 后端 SysFileUploadRequest.File（IFormFile）— 字段名精确匹配首字母大写
    formData.append('File', options.file as File)
    try {
      const res = await sysFileUpload(formData)
      options.onSuccess?.(res)
    } catch {
      message.error('上传失败')
      options.onError?.(new Error('上传失败'))
    }
  }

  /** 重置账号密码 */
  async function handleResetPwd() {
    const ok = await confirm('确认重置此账号密码？', '提示')
    if (!ok) return
    await withLoading(resetUserPwd({ userId: editingRow!.id }), '重置中...')
    notify.success('重置成功，新密码为: 账号 + @258   （示例: user@258）')
  }

  return (
    <Drawer
      title={isEdit ? '编辑账户' : '新增账户'}
      open={open}
      size={560}
      placement="right"
      mask={{ closable: false }}
      destroyOnHidden
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={pending} onClick={() => form.submit()}>
            确定
          </Button>
        </div>
      }
    >
      <Spin spinning={entityLoading}>
        <Form<UserFormValues>
          form={form}
          onFinish={values => saveMutation.mutate(values)}
          initialValues={{ status: true }}
          labelCol={{ flex: '0 0 100px' }}
          wrapperCol={{ flex: '1 1 auto' }}
          disabled={pending}
        >
          <div className="mb-3 text-base font-bold">基本信息</div>

          <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
            <Input placeholder="请输入姓名" />
          </Form.Item>

          <Form.Item name="userId" label="账号" rules={[{ required: true, message: '请输入账号' }]}>
            <Input placeholder="请输入账号" disabled={isEdit} />
          </Form.Item>

          {!isEdit && (
            <>
              <Form.Item
                name="pwd"
                label="密码"
                rules={[
                  { required: true, message: '请输入密码' },
                  {
                    pattern: PWD_PATTERN,
                    message: '至少6位，且至少包含1个特殊字符（! @ # $ % ^ & *）',
                  },
                ]}
              >
                <Input.Password placeholder="请输入密码" autoComplete="new-password" />
              </Form.Item>

              <Form.Item
                name="pwd1"
                label="确认密码"
                dependencies={['pwd']}
                rules={[
                  { required: true, message: '请再次输入密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('pwd') === value) return Promise.resolve()
                      return Promise.reject(new Error('两次输入的密码不一致'))
                    },
                  }),
                ]}
              >
                <Input.Password placeholder="请再次输入密码" autoComplete="new-password" />
              </Form.Item>
            </>
          )}

          {isSuperAdmin && isEdit && (
            <Form.Item label="重置密码">
              <Button color="orange" onClick={() => void handleResetPwd()}>
                重置密码
              </Button>
            </Form.Item>
          )}

          <Form.Item
            name="avatar"
            label="头像"
            valuePropName="fileList"
            getValueFromEvent={({ fileList }: { fileList: UploadFile[] }) => fileList}
            rules={[{ required: true, type: 'array', message: '请上传头像' }]}
          >
            <Upload
              listType="picture-card"
              maxCount={1}
              beforeUpload={handleBeforeUpload}
              customRequest={options => void handleUpload(options)}
            >
              {avatarFiles.length < 1 && <PlusOutlined />}
            </Upload>
          </Form.Item>

          <div className="mt-6 mb-3 text-base font-bold">权限配置</div>

          <Form.Item
            name="roleIds"
            label="角色"
            rules={[{ required: true, type: 'array', message: '请选择角色' }]}
          >
            <Select
              mode="multiple"
              placeholder="请选择角色"
              options={roleOptions?.map(role => ({ value: role.id, label: role.name }))}
            />
          </Form.Item>

          <Form.Item name="status" label="状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Spin>
    </Drawer>
  )
}
