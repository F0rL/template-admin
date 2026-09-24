/**
 * 账户管理
 * ---------------------------------------------
 * 对应 vue3-admin views/system/user/index.vue：
 * 筛选卡片（账号/姓名关键字）+ 表格卡片（批量删除 / 新增 + ProTable + 分页），
 * 外层 flex h-page 满高布局、表格满高内部滚动。
 *
 * 筛选条件以「已提交值」入 queryKey（输入框值不入），查询/重置同时回到第 1 页，
 * 既避免逐字触发请求，也避免 refetch 闭包读到旧值。
 */
import { useState } from 'react'
import type { Key } from 'react'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { Avatar, Button, Form, Input, Tag } from 'antd'
import {
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons'
import ProTable from '@/components/ProTable'
import type { ProTableColumn } from '@/components/ProTable'
import type { UserListItem } from '@/api/system/sysUser'
import { deleteUser, fetchUserList, userKeys } from '@/api/system/sysUser'
import { confirm, message, withLoading } from '@/utils/feedback'
import { resolveFileUrl } from '@/utils/file'
import UserForm from './components/UserForm'

export default function SystemUserListPage() {
  const queryClient = useQueryClient()

  /** 输入框值（未提交） */
  const [keyword, setKeyword] = useState('')
  /** 已提交的查询关键字（入 queryKey） */
  const [searchKey, setSearchKey] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [selectedRows, setSelectedRows] = useState<UserListItem[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<UserListItem | null>(null)
  /** 每次打开表单自增，作为 UserForm 的 key 触发重挂载（表单与本地状态回到初始态） */
  const [formKey, setFormKey] = useState(0)

  const { data: listRes, isFetching } = useQuery({
    queryKey: [...userKeys.lists(), page, pageSize, searchKey],
    queryFn: ({ signal }) =>
      fetchUserList({ page, rows: pageSize, searchKey: searchKey || undefined }, signal),
    placeholderData: keepPreviousData,
  })

  const tableData = listRes?.list ?? []
  const total = listRes?.total ?? 0

  const columns: ProTableColumn<UserListItem>[] = [
    { title: '姓名', dataIndex: 'name' },
    { title: '账号', dataIndex: 'id' },
    {
      title: '头像',
      dataIndex: 'avatar',
      width: 90,
      align: 'center',
      render: (_, row) => (
        <Avatar size={34} src={resolveFileUrl(row.avatar) || undefined} icon={<UserOutlined />} />
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      align: 'center',
      type: 'tag',
      valueEnum: {
        1: { text: '启用', type: 'success' },
        [-1]: { text: '禁用', type: 'error' },
      },
    },
    {
      title: '角色',
      dataIndex: 'sysRoleUsers',
      render: (_, row) =>
        row.sysRoleUsers.map(role => <Tag key={role.roleId}>{role.roleName}</Tag>),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      align: 'center',
      fixed: 'right',
      render: (_, row) =>
        row.isDelHandle === false ? null : (
          <>
            <Button
              type="link"
              size="small"
              disabled={!row._disabled}
              onClick={() => handleEdit(row)}
            >
              编辑
            </Button>
            <Button
              type="link"
              size="small"
              danger
              disabled={!row._disabled}
              onClick={() => void handleDelete([row.id], row.name)}
            >
              删除
            </Button>
          </>
        ),
    },
  ]

  /** 删除单个或批量账户 */
  async function handleDelete(ids: string[], name?: string) {
    const tip = name ? `确定删除账户「${name}」？` : `确定删除选中的 ${ids.length} 个账户？`
    const ok = await confirm(tip, '删除确认', {
      okText: '删除',
      okButtonProps: { danger: true },
    })
    if (!ok) return
    await withLoading(deleteUser({ ids }), '删除中...')
    message.success('删除成功')
    await queryClient.invalidateQueries({ queryKey: userKeys.lists() })
    setSelectedRowKeys([])
    setSelectedRows([])
  }

  /** 查询：提交关键字并回到第 1 页 */
  function handleSearch() {
    setSearchKey(keyword)
    setPage(1)
  }

  function handleReset() {
    setKeyword('')
    setSearchKey('')
    setPage(1)
  }

  function handleAdd() {
    setEditingRow(null)
    setFormKey(key => key + 1)
    setFormOpen(true)
  }

  function handleEdit(row: UserListItem) {
    setEditingRow(row)
    setFormKey(key => key + 1)
    setFormOpen(true)
  }

  /** 批量删除账户 */
  function handleBatchDelete() {
    if (!selectedRows.length) {
      message.warning('请先勾选要删除的账户')
      return
    }
    void handleDelete(selectedRows.map(row => row.id))
  }

  function handleSuccess() {
    void queryClient.invalidateQueries({ queryKey: userKeys.lists() })
  }

  return (
    <div className="h-page flex flex-col">
      <div className="panel-card mb-4 shrink-0">
        {/* 筛选区：一行三列（每项占 1/3），按钮组落在第三列右对齐 */}
        <Form labelCol={{ flex: '0 0 80px' }} wrapperCol={{ flex: '1 1 0%' }}>
          <div className="grid grid-cols-3 gap-x-4 gap-y-4">
            <Form.Item label="关键字" className="!mb-0">
              <Input
                className="w-full"
                placeholder="请输入账号或姓名"
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
          <Button
            danger
            icon={<DeleteOutlined />}
            disabled={!selectedRows.length}
            onClick={handleBatchDelete}
          >
            批量删除
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增
          </Button>
        </div>

        <ProTable<UserListItem>
          autoHeight
          rowSelection={{
            selectedRowKeys,
            onChange: (keys, rows) => {
              setSelectedRowKeys(keys)
              setSelectedRows(rows)
            },
            getCheckboxProps: row => ({ disabled: !row._disabled }),
          }}
          columns={columns}
          dataSource={tableData}
          loading={isFetching}
          scroll={{ x: 900 }}
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

      <UserForm
        key={formKey}
        open={formOpen}
        editingRow={editingRow}
        onClose={() => setFormOpen(false)}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
