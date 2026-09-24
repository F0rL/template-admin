/**
 * 日志详情抽屉（请求 / 错误日志共用）
 * ---------------------------------------------
 * 请求日志对接 SysLog/GetHttpLogEntity，错误日志对接 SysLog/GetErrorLogEntity；
 * 日志详情不可变，staleTime: Infinity 让重复查看直接命中缓存。
 */
import { useQuery } from '@tanstack/react-query'
import { Descriptions, Drawer, Empty, Spin, Tag } from 'antd'
import type { DescriptionsProps } from 'antd'
import type { LogRow } from '@/api/system/sysLog'
import { fetchErrorLogDetail, fetchHttpLogDetail, logKeys } from '@/api/system/sysLog'

type LogType = 'http' | 'error'

interface LogDetailDrawerProps {
  open: boolean
  row: LogRow | null
  type: LogType
  onClose: () => void
}

/** 文本块（接口地址 / 请求体等长文本展示） */
function TextBlock({ label, value, danger }: { label: string; value?: string; danger?: boolean }) {
  return (
    <div className="mt-4">
      <div className="mb-1 text-sm font-medium text-text-primary">{label}</div>
      <pre
        className={`max-h-60 overflow-auto rounded px-3 py-2 text-sm break-all whitespace-pre-wrap ${
          danger ? 'bg-danger-bg text-danger' : 'bg-fill-light text-text-primary'
        }`}
      >
        {value || '-'}
      </pre>
    </div>
  )
}

export default function LogDetailDrawer({ open, row, type, onClose }: LogDetailDrawerProps) {
  const isError = type === 'error'

  const { data: detail, isFetching } = useQuery({
    queryKey: isError ? logKeys.errorDetail(row?.id ?? '') : logKeys.httpDetail(row?.id ?? ''),
    queryFn: ({ signal }) =>
      isError ? fetchErrorLogDetail(row!.id, signal) : fetchHttpLogDetail(row!.id, signal),
    enabled: open && !!row,
    staleTime: Infinity,
  })

  const statusOk = detail?.statusCode != null && detail.statusCode >= 200 && detail.statusCode < 300

  const items: DescriptionsProps['items'] = [
    { key: 'actionName', label: '事件名称', children: detail?.actionName || '-' },
    {
      key: 'method',
      label: '请求方式',
      children: <Tag>{detail?.method || '-'}</Tag>,
    },
    {
      key: 'statusCode',
      label: '响应状态',
      children: <Tag color={statusOk ? 'success' : 'error'}>{detail?.statusCode ?? '-'}</Tag>,
    },
    { key: 'elapsed', label: '响应时长', children: `${detail?.elapsed ?? '-'} ms` },
    { key: 'userName', label: '调用人员', children: detail?.userName || '-' },
    { key: 'userId', label: '用户ID', children: detail?.userId || '-' },
    { key: 'ipAddress', label: '请求IP', children: detail?.ipAddress || '-' },
    { key: 'host', label: '请求主机', children: detail?.host || '-' },
    { key: 'controller', label: '控制器', children: detail?.controller || '-' },
    isError
      ? { key: 'userType', label: '用户类型', children: detail?.userType ?? '-' }
      : { key: 'actionType', label: '事件类型', children: detail?.actionType || '-' },
    { key: 'createTime', label: '创建时间', span: 2, children: detail?.createTime || '-' },
    ...(isError
      ? []
      : [
          { key: 'source', label: '来源', span: 2, children: detail?.source || '-' },
          { key: 'userAgent', label: '用户代理(UA)', span: 2, children: detail?.userAgent || '-' },
        ]),
  ]

  return (
    <Drawer
      title={isError ? '错误日志详情' : '请求日志详情'}
      open={open}
      size={620}
      placement="right"
      destroyOnHidden
      onClose={onClose}
    >
      <Spin spinning={isFetching}>
        {detail ? (
          <>
            <Descriptions
              column={2}
              bordered
              size="small"
              items={items}
              styles={{ label: { width: 110, color: 'var(--ant-color-text-secondary)' } }}
            />

            <TextBlock label="接口地址" value={detail.url} />

            {isError ? (
              <TextBlock label="错误信息" value={detail.message} danger />
            ) : (
              <>
                <TextBlock label="请求参数" value={detail.queryString} />
                <TextBlock label="请求体" value={detail.body} />
                <TextBlock label="响应结果" value={detail.message} />
              </>
            )}
          </>
        ) : isFetching ? null : (
          <Empty description="暂无日志数据" />
        )}
      </Spin>
    </Drawer>
  )
}
