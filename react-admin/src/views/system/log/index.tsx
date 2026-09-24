/**
 * 日志管理
 * ---------------------------------------------
 * 对应 vue3-admin views/system/log/index.vue：
 * 筛选卡片（日志类型 / 关键字 / 日期范围）+ 表格卡片（ProTable + 详情抽屉）；
 * 请求日志与错误日志共用表格与抽屉，仅错误日志多一列「错误信息」。
 *
 * 筛选条件以「已提交值」入 queryKey（输入框值不入），查询/重置同时回到第 1 页。
 */
import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Button, DatePicker, Form, Input, Select, Tag } from 'antd'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import type { Dayjs } from 'dayjs'
import ProTable from '@/components/ProTable'
import type { ProTableColumn } from '@/components/ProTable'
import type { LogListParams, LogRow } from '@/api/system/sysLog'
import { fetchErrorLogList, fetchHttpLogList, logKeys } from '@/api/system/sysLog'
import LogDetailDrawer from './LogDetailDrawer'

type LogType = 'http' | 'error'

const LOG_TYPE_OPTIONS = [
  { value: 'http', label: '请求日志' },
  { value: 'error', label: '错误日志' },
]

function isSuccessStatus(statusCode: number | null) {
  return statusCode != null && statusCode >= 200 && statusCode < 300
}

/** 列定义：错误日志在「客户端IP」后插入「错误信息」列（对齐 vue3-admin） */
function buildColumns(
  type: LogType,
  onView: (row: LogRow) => void,
): ProTableColumn<LogRow>[] {
  const columns: ProTableColumn<LogRow>[] = [
    { title: '操作名称', dataIndex: 'actionName', width: 140 },
    { title: '接口地址', dataIndex: 'url', width: 240 },
    { title: '请求类型', dataIndex: 'method', width: 100, align: 'center' },
    {
      title: '状态码',
      dataIndex: 'statusCode',
      width: 90,
      align: 'center',
      render: (_, row) => (
        <Tag color={isSuccessStatus(row.statusCode) ? 'success' : 'error'}>
          {row.statusCode ?? '-'}
        </Tag>
      ),
    },
    { title: '客户端IP', dataIndex: 'ipAddress', width: 170 },
    { title: '调用人员', dataIndex: 'userName', width: 110, align: 'center' },
    { title: '请求时间', dataIndex: 'createTime', width: 170, align: 'center' },
    { title: '响应时长(ms)', dataIndex: 'elapsed', width: 120, align: 'center' },
    {
      title: '操作',
      key: 'action',
      width: 90,
      align: 'center',
      fixed: 'right',
      render: (_, row) => (
        <Button type="link" size="small" onClick={() => onView(row)}>
          查看
        </Button>
      ),
    },
  ]
  if (type === 'error') {
    columns.splice(5, 0, { title: '错误信息', dataIndex: 'message', width: 220 })
  }
  return columns
}

export default function SystemLogListPage() {
  const [logType, setLogType] = useState<LogType>('http')
  /** 输入框值（未提交） */
  const [keyword, setKeyword] = useState('')
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  /** 已提交的查询条件（入 queryKey） */
  const [query, setQuery] = useState<{ searchKey: string; startTime?: string; endTime?: string }>({
    searchKey: '',
  })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [detailOpen, setDetailOpen] = useState(false)
  const [currentRow, setCurrentRow] = useState<LogRow | null>(null)

  const { data: listRes, isFetching } = useQuery({
    queryKey: [
      ...logKeys.all,
      logType,
      page,
      pageSize,
      query.searchKey,
      query.startTime,
      query.endTime,
    ],
    queryFn: ({ signal }) => {
      const params: LogListParams = {
        page,
        rows: pageSize,
        searchKey: query.searchKey || undefined,
        startTime: query.startTime,
        endTime: query.endTime,
      }
      return logType === 'http'
        ? fetchHttpLogList(params, signal)
        : fetchErrorLogList(params, signal)
    },
    placeholderData: keepPreviousData,
  })

  const tableData = listRes?.list ?? []
  const total = listRes?.total ?? 0
  const columns = buildColumns(logType, handleOpenDetail)

  /** 切换日志类型：回到第 1 页 */
  function handleTypeChange(value: LogType) {
    setLogType(value)
    setPage(1)
  }

  /** 查询：提交筛选条件并回到第 1 页 */
  function handleSearch() {
    setQuery({
      searchKey: keyword,
      startTime: dateRange?.[0]?.format('YYYY-MM-DD'),
      endTime: dateRange?.[1]?.format('YYYY-MM-DD'),
    })
    setPage(1)
  }

  function handleReset() {
    setKeyword('')
    setDateRange(null)
    setQuery({ searchKey: '' })
    setPage(1)
  }

  function handleOpenDetail(row: LogRow) {
    setCurrentRow(row)
    setDetailOpen(true)
  }

  return (
    <div className="h-page flex flex-col">
      <div className="panel-card mb-4 shrink-0">
        {/* 筛选区：一行三列（每项占 1/3），按钮组换行后落在第三列右对齐 */}
        <Form labelCol={{ flex: '0 0 80px' }} wrapperCol={{ flex: '1 1 0%' }}>
          <div className="grid grid-cols-3 gap-x-4 gap-y-4">
            <Form.Item label="日志类型" className="!mb-0">
              <Select
                className="w-full"
                options={LOG_TYPE_OPTIONS}
                value={logType}
                onChange={handleTypeChange}
              />
            </Form.Item>
            <Form.Item label="关键字" className="!mb-0">
              <Input
                className="w-full"
                placeholder="请输入地址、人员或IP"
                allowClear
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                onPressEnter={handleSearch}
                onClear={handleReset}
              />
            </Form.Item>
            <Form.Item label="日期范围" className="!mb-0">
              <DatePicker.RangePicker
                className="w-full"
                value={dateRange}
                onChange={dates => setDateRange(dates)}
                disabledDate={date => date.valueOf() > Date.now()}
              />
            </Form.Item>
            <Form.Item className="col-start-3 !mb-0">
              <div className="flex justify-end gap-3">
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
        <ProTable<LogRow>
          autoHeight
          columns={columns}
          dataSource={tableData}
          loading={isFetching}
          scroll={{ x: 1200 }}
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

      <LogDetailDrawer
        open={detailOpen}
        row={currentRow}
        type={logType}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  )
}
