/**
 * 菜单表单（新增 / 编辑抽屉）
 * ---------------------------------------------
 * 对应 vue3-admin views/system/menu/components/MenuForm.vue：
 * 父级菜单 / 菜单标题 / 路由路径 / 侧边栏展示 / 图标（SelectIcon）/ 排序号，
 * 提交走 useDialogForm（成功 toast + 关闭 + 失效菜单缓存）。
 *
 * 与 Vue 版的差异（React 惯用法）：
 * - 父级下拉用 -1 作为「顶级菜单」哨兵值，提交时转 null（对齐后端 parentId 契约）
 * - 「非顶级菜单必填路由路径」由 Form.Item 的 dependencies + validator 表达，
 *   不再在提交回调里手工校验
 * - 父级每次打开通过 key 重挂载本组件，表单回到初始态
 */
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Drawer, Form, Input, InputNumber, Select, Spin, Switch } from 'antd'
import type { MenuPayload, MenuTreeNode } from '@/api/system/sysMenu'
import { createMenu, fetchMenuEntity, fetchParentMenuAll, updateMenu } from '@/api/system/sysMenu'
import SelectIcon from '@/components/SelectIcon'
import { useDialogForm } from '@/hooks/useDialogForm'

/** 顶级菜单在父级下拉中的哨兵值 */
const TOP_LEVEL = '-1'

interface MenuFormValues {
  parentId: string
  title: string
  path?: string
  icon?: string
  order: number
  isMenuShow: boolean
}

interface MenuFormProps {
  open: boolean
  editingRow: MenuTreeNode | null
  onClose: () => void
  onSuccess: () => void
}

export default function MenuForm({ open, editingRow, onClose, onSuccess }: MenuFormProps) {
  /** 父级菜单候选（随抽屉打开请求） */
  const { data: parentList } = useQuery({
    queryKey: ['menuParents'],
    queryFn: ({ signal }) => fetchParentMenuAll(signal),
    enabled: open,
    staleTime: 60 * 1000,
  })

  /** 编辑态打开时拉取实体（新增无请求），加载态由 Spin 承接 */
  const { data: entity, isFetching: entityLoading } = useQuery({
    queryKey: ['menuEntity', editingRow?.id],
    queryFn: ({ signal }) => fetchMenuEntity(editingRow!.id, signal),
    enabled: open && !!editingRow,
  })

  const { form, isEdit, saveMutation, pending } = useDialogForm<MenuFormValues, MenuTreeNode>({
    editingRow,
    submit: (values, editing) => {
      const payload: MenuPayload = {
        title: values.title,
        path: values.path ?? '',
        icon: values.icon ?? '',
        order: values.order,
        isMenuShow: values.isMenuShow,
        parentId: values.parentId === TOP_LEVEL ? null : values.parentId,
      }
      return editing ? updateMenu({ ...payload, id: editing.id }) : createMenu(payload)
    },
    onSuccess: () => {
      onClose()
      onSuccess()
    },
  })

  /** 父级候选排除自身（避免把自己设为自己的父级） */
  const parentOptions = [
    { value: TOP_LEVEL, label: '无（顶级菜单）' },
    ...(parentList ?? [])
      .filter(item => item.id !== editingRow?.id)
      .map(item => ({ value: item.id, label: item.title })),
  ]

  // 实体回填（新增无实体，保持 initialValues）
  useEffect(() => {
    if (!open || !entity) return
    form.setFieldsValue({
      parentId: entity.parent?.id ?? TOP_LEVEL,
      title: entity.title,
      path: entity.path ?? '',
      icon: entity.icon ?? '',
      order: entity.order ?? 99,
      isMenuShow: entity.isMenuShow !== false,
    })
  }, [open, entity, form])

  return (
    <Drawer
      title={isEdit ? '编辑菜单' : '新增菜单'}
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
        <Form<MenuFormValues>
          form={form}
          onFinish={values => saveMutation.mutate(values)}
          initialValues={{ parentId: TOP_LEVEL, icon: 'ad:menu', order: 99, isMenuShow: true }}
          labelCol={{ flex: '0 0 100px' }}
          wrapperCol={{ flex: '1 1 auto' }}
          disabled={pending}
        >
          <Form.Item
            name="parentId"
            label="父级菜单"
            rules={[{ required: true, message: '请选择父级菜单' }]}
          >
            <Select options={parentOptions} />
          </Form.Item>

          <Form.Item
            name="title"
            label="菜单标题"
            rules={[{ required: true, message: '请输入菜单标题' }]}
          >
            <Input placeholder="请输入菜单标题" />
          </Form.Item>

          <Form.Item
            name="path"
            label="路由路径"
            dependencies={['parentId']}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value: string) {
                  if (getFieldValue('parentId') === TOP_LEVEL || value) return Promise.resolve()
                  return Promise.reject(new Error('非顶级菜单请输入路由路径'))
                },
              }),
            ]}
          >
            <Input placeholder="请输入路由路径" />
          </Form.Item>

          <Form.Item name="isMenuShow" label="侧边栏展示" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item name="icon" label="图标">
            <SelectIcon placeholder="请选择图标" />
          </Form.Item>

          <Form.Item
            name="order"
            label="排序号"
            rules={[{ required: true, message: '请输入排序号' }]}
          >
            <InputNumber className="w-full" min={1} max={1000000000} placeholder="请输入排序号" />
          </Form.Item>
        </Form>
      </Spin>
    </Drawer>
  )
}
