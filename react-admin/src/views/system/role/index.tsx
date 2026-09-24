/**
 * 角色管理
 * ---------------------------------------------
 * 对应 vue3-admin views/system/role/index.vue：
 * 单卡片（工具栏 + ProTable + 分页），外层 flex h-page 满高布局、表格满高内部滚动。
 * 超级管理员角色为系统内置，行内编辑/删除禁用。
 */
import { useState } from 'react'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import ProTable from '@/components/ProTable'
import type { ProTableColumn } from '@/components/ProTable'
import type { RoleListItem } from '@/api/system/sysRole'
import { SUPER_ADMIN_ROLE_ID, deleteRole, fetchRoleList, roleKeys } from '@/api/system/sysRole'
import { confirm, message, withLoading } from '@/utils/feedback'
import RoleForm from './components/RoleForm'

export default function SystemRoleListPage() {
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [formOpen, setFormOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<RoleListItem | null>(null)
  /** 每次打开表单自增，作为 RoleForm 的 key 触发重挂载（表单与权限树勾选回到初始态） */
  const [formKey, setFormKey] = useState(0)

  const { data: listRes, isFetching } = useQuery({
    queryKey: [...roleKeys.lists(), page, pageSize],
    queryFn: ({ signal }) => fetchRoleList({ page, rows: pageSize }, signal),
    placeholderData: keepPreviousData,
  })

  const tableData = listRes?.list ?? []
  const total = listRes?.total ?? 0

  const columns: ProTableColumn<RoleListItem>[] = [
    { title: '序号', width: 80, align: 'center', render: (_, __, index) => index + 1 },
    { title: '角色名称', dataIndex: 'name' },
    {
      title: '操作',
      key: 'action',
      width: 160,
      align: 'center',
      fixed: 'right',
      render: (_, row) => (
        <>
          <Button
            type="link"
            size="small"
            disabled={isSystemRole(row.id)}
            onClick={() => handleEdit(row)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            disabled={isSystemRole(row.id)}
            onClick={() => void handleDelete(row)}
          >
            删除
          </Button>
        </>
      ),
    },
  ]

  /** 系统内置角色不可编辑/删除 */
  function isSystemRole(id: string) {
    return id === SUPER_ADMIN_ROLE_ID
  }

  /** 删除角色 */
  async function handleDelete(row: RoleListItem) {
    const ok = await confirm(`确定删除角色「${row.name}」？`, '删除确认', {
      okText: '删除',
      okButtonProps: { danger: true },
    })
    if (!ok) return
    await withLoading(deleteRole({ ids: [row.id] }), '删除中...')
    message.success('删除成功')
    // all 前缀同时失效分页列表与表单的角色下拉选项
    await queryClient.invalidateQueries({ queryKey: roleKeys.all })
  }

  function handleAdd() {
    setEditingRow(null)
    setFormKey(key => key + 1)
    setFormOpen(true)
  }

  function handleEdit(row: RoleListItem) {
    setEditingRow(row)
    setFormKey(key => key + 1)
    setFormOpen(true)
  }

  function handleSuccess() {
    void queryClient.invalidateQueries({ queryKey: roleKeys.all })
  }

  return (
    <div className="h-page flex flex-col">
      <div className="panel-card flex min-h-0 flex-1 flex-col">
        <div className="mb-4 flex shrink-0 items-center">
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增
          </Button>
        </div>

        <ProTable<RoleListItem>
          autoHeight
          columns={columns}
          dataSource={tableData}
          loading={isFetching}
          scroll={{ x: 600 }}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPage)
              setPageSize(nextPageSize)
            },
          }}
        />
      </div>

      <RoleForm
        key={formKey}
        open={formOpen}
        editingRow={editingRow}
        onClose={() => setFormOpen(false)}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
