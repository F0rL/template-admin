/**
 * 菜单管理
 * ---------------------------------------------
 * 对应 vue3-admin views/system/menu/index.vue：
 * 筛选卡片（关键字）+ 表格卡片（新增 / 展开全部 / 收起全部 + 树形 ProTable），
 * 侧边栏展示列内联 Switch 直接切换；任何变更后刷新侧边栏导航并失效菜单缓存。
 */
import { useState } from 'react'
import type { Key } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Form, Input, Switch } from 'antd'
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import ProTable from '@/components/ProTable'
import type { ProTableColumn } from '@/components/ProTable'
import DynamicIcon from '@/components/DynamicIcon'
import type { MenuTreeNode } from '@/api/system/sysMenu'
import {
  deleteMenu,
  fetchMenuEntity,
  fetchMenuTree,
  menuKeys,
  updateMenu,
} from '@/api/system/sysMenu'
import { usePermissionStore } from '@/stores/modules/permission'
import { confirm, message, withLoading } from '@/utils/feedback'
import MenuForm from './components/MenuForm'

/** 树形数据全部节点 id（展开全部用） */
function collectKeys(nodes: MenuTreeNode[]): Key[] {
  return nodes.flatMap(node => [node.id, ...(node.children ? collectKeys(node.children) : [])])
}

export default function SystemMenuListPage() {
  const queryClient = useQueryClient()
  const refreshMenu = usePermissionStore(s => s.refreshMenu)

  /** 输入框值（未提交） */
  const [keyword, setKeyword] = useState('')
  /** 已提交的查询关键字（入 queryKey） */
  const [searchKey, setSearchKey] = useState('')
  /** 展开态：null 表示未交互 → 默认全部展开 */
  const [expandedKeys, setExpandedKeys] = useState<Key[] | null>(null)
  const [switchingId, setSwitchingId] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<MenuTreeNode | null>(null)
  /** 每次打开表单自增，作为 MenuForm 的 key 触发重挂载（表单回到初始态） */
  const [formKey, setFormKey] = useState(0)

  const { data, isFetching } = useQuery({
    queryKey: [...menuKeys.trees(), searchKey],
    queryFn: ({ signal }) => fetchMenuTree({ searchKey: searchKey || undefined }, signal),
  })

  const treeData = data ?? []
  const effectiveExpandedKeys = expandedKeys ?? collectKeys(treeData)

  const columns: ProTableColumn<MenuTreeNode>[] = [
    { title: '菜单标题', dataIndex: 'title', width: 200 },
    { title: '路由路径', dataIndex: 'path', width: 180 },
    {
      title: '图标',
      dataIndex: 'icon',
      width: 80,
      align: 'center',
      render: (_, row) => <DynamicIcon name={row.icon} className="text-lg" />,
    },
    {
      title: '侧边栏展示',
      dataIndex: 'isMenuShow',
      width: 130,
      align: 'center',
      render: (_, row) => (
        <Switch
          size="small"
          checked={row.isMenuShow !== false}
          loading={switchingId === row.id}
          onChange={checked => handleToggleShow(row, checked)}
        />
      ),
    },
    { title: '排序号', dataIndex: 'order', width: 90, align: 'center' },
    {
      title: '操作',
      key: 'action',
      width: 160,
      align: 'center',
      fixed: 'right',
      render: (_, row) => (
        <>
          <Button type="link" size="small" onClick={() => handleEdit(row)}>
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            disabled={row._disabled}
            onClick={() => void handleDelete(row)}
          >
            删除
          </Button>
        </>
      ),
    },
  ]

  /** 侧边栏展示开关：先取实体再整体提交（对齐 UpdateMenu 契约，避免只传增量字段） */
  const toggleShowMutation = useMutation({
    mutationFn: async ({ rowId, isMenuShow }: { rowId: string; isMenuShow: boolean }) => {
      const entity = await fetchMenuEntity(rowId)
      await updateMenu({
        id: rowId,
        title: entity.title,
        path: entity.path ?? '',
        icon: entity.icon ?? '',
        order: entity.order ?? 99,
        isMenuShow,
        parentId: entity.parent?.id ?? null,
      })
    },
    onMutate: ({ rowId }) => setSwitchingId(rowId),
    onSuccess: () => handleChanged(),
    onError: () => message.error('操作失败'),
    onSettled: () => setSwitchingId(''),
  })

  /** 菜单数据变更后：刷新侧边栏导航 + 失效菜单缓存 */
  async function handleChanged() {
    await refreshMenu()
    await queryClient.invalidateQueries({ queryKey: menuKeys.trees() })
  }

  /** 查询：提交关键字（树结构变化后回到全展开） */
  function handleSearch() {
    setSearchKey(keyword)
    setExpandedKeys(null)
  }

  function handleReset() {
    setKeyword('')
    setSearchKey('')
    setExpandedKeys(null)
  }

  function handleAdd() {
    setEditingRow(null)
    setFormKey(key => key + 1)
    setFormOpen(true)
  }

  function handleEdit(row: MenuTreeNode) {
    setEditingRow(row)
    setFormKey(key => key + 1)
    setFormOpen(true)
  }

  function handleExpandAll() {
    setExpandedKeys(collectKeys(treeData))
  }

  function handleCollapseAll() {
    setExpandedKeys([])
  }

  function handleToggleShow(row: MenuTreeNode, isMenuShow: boolean) {
    toggleShowMutation.mutate({ rowId: row.id, isMenuShow })
  }

  /** 删除菜单（系统内置菜单不可删除，按钮已禁用） */
  async function handleDelete(row: MenuTreeNode) {
    const ok = await confirm(`确定删除菜单「${row.title}」？`, '删除确认', {
      okText: '删除',
      okButtonProps: { danger: true },
    })
    if (!ok) return
    await withLoading(deleteMenu({ ids: [row.id] }), '删除中...')
    message.success('删除成功')
    await handleChanged()
  }

  function handleSuccess() {
    void handleChanged()
  }

  return (
    <div className="h-page flex flex-col">
      <div className="panel-card mb-4 shrink-0">
        {/* 筛选区：一行三列（每项占 1/3），按钮组落在筛选条件之后的列内右对齐 */}
        <Form labelCol={{ flex: '0 0 80px' }} wrapperCol={{ flex: '1 1 0%' }}>
          <div className="grid grid-cols-3 gap-x-4 gap-y-4">
            <Form.Item label="关键字" className="!mb-0">
              <Input
                className="w-full"
                placeholder="请输入菜单名称或路由"
                allowClear
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                onPressEnter={handleSearch}
                onClear={handleReset}
              />
            </Form.Item>
            <Form.Item className="col-start-2 !mb-0">
              <div className="flex gap-3">
                <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                  查询
                </Button>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  重置
                </Button>
              </div>
            </Form.Item>
          </div>
        </Form>
      </div>

      <div className="panel-card flex min-h-0 flex-1 flex-col">
        <div className="mb-4 flex shrink-0 items-center gap-3">
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增
          </Button>
          <Button onClick={handleExpandAll}>展开全部</Button>
          <Button onClick={handleCollapseAll}>收起全部</Button>
        </div>

        <ProTable<MenuTreeNode>
          autoHeight
          columns={columns}
          dataSource={treeData}
          loading={isFetching}
          scroll={{ x: 900 }}
          expandable={{
            expandedRowKeys: effectiveExpandedKeys,
            onExpandedRowsChange: keys => setExpandedKeys([...keys]),
          }}
        />
      </div>

      <MenuForm
        key={formKey}
        open={formOpen}
        editingRow={editingRow}
        onClose={() => setFormOpen(false)}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
