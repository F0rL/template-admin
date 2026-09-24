/**
 * 角色表单（新增 / 编辑抽屉）
 * ---------------------------------------------
 * 对应 vue3-admin views/system/role/components/RoleForm.vue：
 * 右侧抽屉，角色名称 + 状态 + 菜单权限树（展开/折叠、全选/全不选），
 * 提交走 useDialogForm（成功 toast + 关闭 + 失效角色缓存）。
 *
 * 与 Vue 版的差异（React 惯用法）：
 * - 权限树勾选/展开态由 antd Tree 受控，半选（父级）id 由 onCheck 的 info 回传
 * - 勾选态以 null 表示「尚未交互」，此时由编辑态实体派生（新增态为空），
 *   避免在 effect 内 setState 造成状态双源
 * - 父级每次打开通过 key 重挂载本组件，表单与树状态自然回到初始态
 */
import { useEffect, useState } from 'react'
import type { Key } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Drawer, Form, Input, Spin, Switch, Tree } from 'antd'
import type { TreeDataNode } from 'antd'
import type { RoleListItem, RolePayload } from '@/api/system/sysRole'
import { createRole, fetchRoleEntity, updateRole } from '@/api/system/sysRole'
import type { MenuTreeNode } from '@/api/system/sysMenu'
import { fetchMenuTree, menuKeys } from '@/api/system/sysMenu'
import { message } from '@/utils/feedback'
import { useDialogForm } from '@/hooks/useDialogForm'

interface RoleFormValues {
  name: string
  status: boolean
}

interface RoleFormProps {
  open: boolean
  editingRow: RoleListItem | null
  onClose: () => void
  onSuccess: () => void
}

/** MenuTreeNode → antd Tree 数据 */
function toTreeData(nodes: MenuTreeNode[]): TreeDataNode[] {
  return nodes.map(node => ({
    title: node.title,
    key: node.id,
    children: node.children ? toTreeData(node.children) : undefined,
  }))
}

/** 菜单树全部节点 id（全选 / 展开全部用） */
function collectKeys(nodes: MenuTreeNode[]): string[] {
  return nodes.flatMap(node => [node.id, ...(node.children ? collectKeys(node.children) : [])])
}

/** 解析实体的已授权菜单 id（JSON 数组字符串，异常时视为空） */
function parseMenuIds(menuIdsJSON?: string): string[] {
  if (!menuIdsJSON) return []
  try {
    const ids: unknown = JSON.parse(menuIdsJSON)
    return Array.isArray(ids) ? ids.map(String) : []
  } catch {
    return []
  }
}

export default function RoleForm({ open, editingRow, onClose, onSuccess }: RoleFormProps) {
  /** 勾选态：null 表示尚未交互，取编辑态实体派生的勾选值（新增态为空） */
  const [checkedKeys, setCheckedKeys] = useState<Key[] | null>(null)
  /** 半选（父级）id，提交时并入 menuIds */
  const [halfCheckedKeys, setHalfCheckedKeys] = useState<Key[]>([])
  /** 展开态：undefined 表示未交互，由 defaultExpandAll 全展开 */
  const [expandedKeys, setExpandedKeys] = useState<Key[] | undefined>(undefined)

  /** 权限树数据（随抽屉打开请求） */
  const { data: menuTree } = useQuery({
    queryKey: menuKeys.trees(),
    queryFn: ({ signal }) => fetchMenuTree(undefined, signal),
    enabled: open,
    staleTime: 60 * 1000,
  })

  /** 编辑态打开时拉取实体（新增无请求），加载态由 Spin 承接 */
  const { data: entity, isFetching: entityLoading } = useQuery({
    queryKey: ['roleEntity', editingRow?.id],
    queryFn: ({ signal }) => fetchRoleEntity(editingRow!.id, signal),
    enabled: open && !!editingRow,
  })

  const { form, isEdit, saveMutation, pending } = useDialogForm<RoleFormValues, RoleListItem>({
    editingRow,
    submit: (values, editing) => {
      const payload: RolePayload = {
        name: values.name,
        status: values.status ? 1 : 0,
        // 半选父级一并提交（后端据此构建菜单树关联）；JSON 仅存完全勾选的 id（回填用）
        menuIds: [...effectiveCheckedKeys, ...halfCheckedKeys].map(String),
        menuIdsJSON: JSON.stringify(effectiveCheckedKeys.map(String)),
      }
      return editing ? updateRole({ ...payload, id: editing.id }) : createRole(payload)
    },
    onSuccess: () => {
      onClose()
      onSuccess()
    },
  })

  const treeData = toTreeData(menuTree ?? [])
  const allMenuKeys = collectKeys(menuTree ?? [])
  const effectiveCheckedKeys = checkedKeys ?? parseMenuIds(entity?.menuIdsJSON)

  // 实体回填（新增无实体，保持初始态）
  useEffect(() => {
    if (!open || !entity) return
    form.setFieldsValue({ name: entity.name, status: entity.status.value === 1 })
  }, [open, entity, form])

  /** 展开/折叠全部（未手动展开过时视为全展开） */
  function handleToggleExpand() {
    const allExpanded = expandedKeys === undefined || expandedKeys.length > 0
    setExpandedKeys(allExpanded ? [] : allMenuKeys)
  }

  /** 全选/全不选 */
  function handleToggleSelectAll() {
    const allSelected = effectiveCheckedKeys.length === allMenuKeys.length
    setCheckedKeys(allSelected ? [] : allMenuKeys)
    setHalfCheckedKeys([])
  }

  /** 提交前校验菜单勾选（校验不通过时 form.submit 会静默返回） */
  function handleSubmit() {
    if (!effectiveCheckedKeys.length) {
      message.error('请选择权限菜单')
      return
    }
    form.submit()
  }

  return (
    <Drawer
      title={isEdit ? '编辑角色' : '新增角色'}
      open={open}
      size={560}
      placement="right"
      mask={{ closable: false }}
      destroyOnHidden
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={pending} onClick={handleSubmit}>
            确定
          </Button>
        </div>
      }
    >
      <Spin spinning={entityLoading}>
        <Form<RoleFormValues>
          form={form}
          onFinish={values => saveMutation.mutate(values)}
          initialValues={{ status: true }}
          labelCol={{ flex: '0 0 100px' }}
          wrapperCol={{ flex: '1 1 auto' }}
          disabled={pending}
        >
          <Form.Item
            name="name"
            label="角色名称"
            rules={[{ required: true, message: '请输入角色名称' }]}
          >
            <Input placeholder="请输入角色名称" />
          </Form.Item>

          <Form.Item name="status" label="状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>

          <Form.Item label="菜单权限">
            <div className="flex flex-col gap-2">
              <div className="flex h-8 items-center gap-2">
                <Button type="link" size="small" onClick={handleToggleExpand}>
                  展开/折叠
                </Button>
                <Button type="link" size="small" onClick={handleToggleSelectAll}>
                  全选/全不选
                </Button>
              </div>
              {treeData.length ? (
                <Tree
                  checkable
                  defaultExpandAll
                  // 未交互时不传 expandedKeys：rc-tree 视「存在但为 undefined」为受控空值，会使 defaultExpandAll 失效
                  {...(expandedKeys === undefined ? {} : { expandedKeys })}
                  onExpand={keys => setExpandedKeys(keys)}
                  checkedKeys={effectiveCheckedKeys}
                  onCheck={(checked, info) => {
                    // 非 checkStrictly 下 checked 恒为数组，对象形态仅为类型兼容
                    setCheckedKeys(Array.isArray(checked) ? checked : checked.checked)
                    setHalfCheckedKeys(info.halfCheckedKeys ?? [])
                  }}
                  treeData={treeData}
                />
              ) : (
                <span className="text-sm text-gray-400">暂无菜单数据</span>
              )}
            </div>
          </Form.Item>
        </Form>
      </Spin>
    </Drawer>
  )
}
