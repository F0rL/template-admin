/**
 * ProTable — antd Table 薄封装
 * ---------------------------------------------
 * 只补齐与 vue3-admin ProTable 对齐的三项能力，其余 props 原样透传 antd Table
 * （scroll / rowSelection / expandable / onChange / dataSource / rowKey 等）：
 *
 * 1. `valueEnum` 字典渲染：字段值 → 文本（`type: 'tag'` 时渲染为 Tag）
 * 2. `autoHeight` 满高：表头固定、表体内部滚动、分页贴底
 * 3. 内置默认 `rowKey="id"`，可被同名 prop 覆盖
 *
 * 选择列 / 展开列沿用 antd 原生 `rowSelection` / `expandable`（React 惯用法，
 * 不另造列语法糖）；分页由本组件渲染（独立于表体的贴底节点，非 antd 内嵌分页）。
 *
 * 用法：
 *   <ProTable
 *     autoHeight
 *     rowSelection={{ selectedRowKeys, onChange }}
 *     columns={[{ title: '状态', dataIndex: 'status', type: 'tag', valueEnum: { 1: { text: '启用', type: 'success' } } }]}
 *     dataSource={list}
 *     loading={isFetching}
 *     pagination={{ current: page, pageSize, total, onChange }}
 *   />
 */
import { Pagination, Table, Tag } from 'antd'
import type { TableColumnType, TableProps } from 'antd'

/** Tag 预设配色 */
export type ProTableTagType = 'success' | 'processing' | 'error' | 'warning' | 'default'

/** 列定义：antd 列 + 字典/标签语法糖 */
export interface ProTableColumn<T> extends TableColumnType<T> {
  /** 'tag'：按 valueEnum 渲染为 Tag（未命中字典时显示默认灰底 Tag） */
  type?: 'tag'
  /** 字典映射：字段原始值 → 显示文本 / 标签配色 */
  valueEnum?: Partial<Record<string | number, { text: string; type?: ProTableTagType }>>
}

/** 分页配置（受控；分页条数变更时自动回到第 1 页） */
export interface ProTablePagination {
  current: number
  pageSize: number
  total: number
  pageSizeOptions?: number[]
  onChange: (page: number, pageSize: number) => void
}

export interface ProTableProps<T> extends Omit<TableProps<T>, 'columns' | 'pagination'> {
  columns: ProTableColumn<T>[]
  /** 分页配置；不传则不渲染分页 */
  pagination?: ProTablePagination
  /** 满高模式：需父容器为 flex 列布局且高度受限（本组件作为 flex-1 项占满剩余高度） */
  autoHeight?: boolean
}

/** ProTableColumn → antd 列：剥离语法糖字段，必要时包一层 render */
function toAntdColumn<T>(col: ProTableColumn<T>): TableColumnType<T> {
  const { valueEnum, type, render, ...rest } = col
  if (!valueEnum && type !== 'tag') return { ...rest, render }

  return {
    ...rest,
    render: (value, record, index) => {
      if (render) return render(value, record, index)
      const item = valueEnum?.[value as string | number]
      const text = item?.text ?? (value === null || value === undefined ? '' : String(value))
      return type === 'tag' ? <Tag color={item?.type ?? 'default'}>{text}</Tag> : text
    },
  }
}

function ProTable<T extends object>(props: ProTableProps<T>) {
  const {
    columns,
    pagination,
    autoHeight = false,
    rowKey,
    scroll,
    className,
    ...rest
  } = props

  const paginationNode = pagination ? (
    <div className={autoHeight ? 'mt-4 flex shrink-0 justify-end' : 'mt-4 flex justify-end'}>
      <Pagination
        current={pagination.current}
        pageSize={pagination.pageSize}
        total={pagination.total}
        pageSizeOptions={pagination.pageSizeOptions ?? [10, 20, 50]}
        showSizeChanger
        showTotal={total => `共 ${total} 条`}
        // 分页条数变更时回到第 1 页（对齐 vue3-admin ProTable 行为）
        onChange={(page, pageSize) =>
          pagination.onChange(pageSize === pagination.pageSize ? page : 1, pageSize)
        }
      />
    </div>
  ) : null

  return (
    <>
      <Table<T>
        // 内置默认行键，可被同名 prop 覆盖（T 未知，故断言）
        rowKey={(rowKey ?? 'id') as TableProps<T>['rowKey']}
        columns={columns.map(col => toAntdColumn(col))}
        pagination={false}
        className={autoHeight ? `pro-table-auto ${className ?? ''}`.trim() : className}
        // autoHeight 用百分比高度让 rc-table 拆出独立表头，实际高度由 CSS flex 撑满
        scroll={autoHeight ? { y: '100%', ...scroll } : scroll}
        {...rest}
      />
      {paginationNode}
    </>
  )
}

export default ProTable
