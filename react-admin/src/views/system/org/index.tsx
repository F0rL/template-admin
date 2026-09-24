/**
 * 组织架构
 * ---------------------------------------------
 * 对应 vue3-admin views/system/org/index.vue：
 * 左侧部门树（独立滚动，点击切换部门）+ 右侧成员列表（关键字查询 + 刷新缓存 + 分页表格），
 * 外层 h-page flex 满高布局、表格内部滚动。
 *
 * 选中部门以 null 表示「未交互」，未交互时由部门树首个节点派生，避免 effect 内 setState。
 */
import { useState } from 'react'
import type { Key } from 'react'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button, Input, Spin, Tree } from 'antd'
import type { TreeDataNode } from 'antd'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import ProTable from '@/components/ProTable'
import type { ProTableColumn } from '@/components/ProTable'
import DynamicIcon from '@/components/DynamicIcon'
import type { DepartmentTreeNode, OrgUserItem } from '@/api/system/wxWork'
import { fetchDepartmentTree, fetchOrgUserList, orgKeys, refreshOrgUsers } from '@/api/system/wxWork'
import { message, withLoading } from '@/utils/feedback'

/** 部门树节点 → antd Tree 数据（标题带部门图标） */
function toTreeData(nodes: DepartmentTreeNode[]): TreeDataNode[] {
  return nodes.map(node => ({
    key: node.id,
    title: (
      <span className="flex items-center gap-1.5">
        <DynamicIcon name="ri:building-line" />
        {node.name}
      </span>
    ),
    children: node.children ? toTreeData(node.children) : undefined,
  }))
}

export default function SystemOrgListPage() {
  const queryClient = useQueryClient()

  /** 输入框值（未提交） */
  const [keyword, setKeyword] = useState('')
  /** 已提交的查询关键字（入 queryKey） */
  const [searchKey, setSearchKey] = useState('')
  /** 选中部门：null 表示未交互 → 默认取部门树首个节点 */
  const [deptId, setDeptId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const { data: deptTree, isFetching: deptLoading } = useQuery({
    queryKey: orgKeys.departments(),
    queryFn: ({ signal }) => fetchDepartmentTree(undefined, signal),
  })

  const selectedDeptId = deptId ?? deptTree?.[0]?.id ?? ''

  const { data: userRes, isFetching } = useQuery({
    queryKey: [...orgKeys.users(), selectedDeptId, page, pageSize, searchKey],
    queryFn: ({ signal }) =>
      fetchOrgUserList(
        {
          departmentId: selectedDeptId,
          searchKey: searchKey || undefined,
          page,
          row: pageSize,
        },
        signal,
      ),
    placeholderData: keepPreviousData,
    enabled: !!selectedDeptId,
  })

  const tableData = userRes?.message ?? []
  const total = userRes?.total ?? 0

  const columns: ProTableColumn<OrgUserItem>[] = [
    { title: '工号', dataIndex: 'userid', width: 180 },
    { title: '姓名', dataIndex: 'name', width: 100 },
    { title: '部门', dataIndex: 'department', render: (_, row) => row.department[0]?.name ?? '-' },
    { title: '手机号', dataIndex: 'mobile', width: 150 },
    { title: '性别', dataIndex: 'genderText', width: 80, align: 'center' },
    { title: '职务', dataIndex: 'position', width: 140 },
  ]

  /** 切换部门：回到第 1 页 */
  function handleDeptSelect(keys: Key[]) {
    if (!keys.length) return
    setDeptId(String(keys[0]))
    setPage(1)
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

  /** 刷新组织架构缓存（部门树 + 成员列表） */
  async function handleRefresh() {
    await withLoading(refreshOrgUsers(), '刷新中...')
    message.success('缓存刷新成功')
    await queryClient.invalidateQueries({ queryKey: orgKeys.all })
  }

  return (
    <div className="h-page flex gap-4">
      {/* 左侧部门树（独立滚动） */}
      <div className="panel-card flex h-full w-60 shrink-0 flex-col">
        <div className="mb-3 shrink-0 text-sm font-semibold text-text-primary">组织架构</div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {deptTree?.length ? (
            <Tree
              blockNode
              treeData={toTreeData(deptTree)}
              defaultExpandedKeys={[deptTree[0].id]}
              selectedKeys={selectedDeptId ? [selectedDeptId] : []}
              onSelect={handleDeptSelect}
            />
          ) : deptLoading ? (
            <div className="flex justify-center py-6">
              <Spin />
            </div>
          ) : (
            <span className="text-sm text-text-placeholder">暂无部门数据</span>
          )}
        </div>
      </div>

      {/* 右侧成员列表 */}
      <div className="panel-card flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <div className="flex items-center gap-3">
            <Input
              className="w-60"
              placeholder="请输入姓名或工号"
              allowClear
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onPressEnter={handleSearch}
              onClear={handleReset}
            />
            <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
              查询
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              重置
            </Button>
          </div>
          <Button icon={<ReloadOutlined />} onClick={() => void handleRefresh()}>
            刷新缓存
          </Button>
        </div>

        <ProTable<OrgUserItem>
          autoHeight
          rowKey="userid"
          columns={columns}
          dataSource={tableData}
          loading={isFetching}
          scroll={{ x: 800 }}
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
    </div>
  )
}
