# 共享组件

| 组件          | 文件                                | 用途                                                                                                    |
| ------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------- |
| ProTable      | `src/components/ProTable/index.tsx` | antd Table 薄封装：valueEnum 字典渲染、tag 列、autoHeight 满高、默认 `rowKey="id"`；其余 props 原样透传 |
| useDialogForm | `src/hooks/useDialogForm.ts`        | 抽屉/弹窗表单骨架：Form 实例、编辑态判定、保存 mutation（成功 toast + onSuccess）                       |

> SelectIcon 设计见 ADR-0011，本期（账户管理页）无使用场景，未落地。

## ProTable

antd Table 原生能力（筛选/排序/树形展开/虚拟滚动）直接可用，ProTable 只补三项与 vue3-admin 版对齐的能力：

| 能力              | 说明                                                                                                                                                     |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `valueEnum` 字典  | 列上声明 `valueEnum: { 1: { text: '启用', type: 'success' } }`，字段值 → 文本；配 `type: 'tag'` 渲染为 Tag（未命中字典时原样显示字段值，tag 态用默认灰） |
| `autoHeight` 满高 | 表头固定、表体内部滚动、分页贴底（依赖下方「满高布局的 CSS 前提」）                                                                                      |
| 默认 `rowKey`     | 内置 `rowKey="id"`，可被同名 prop 覆盖                                                                                                                   |

- **选择列 / 展开列沿用 antd 原生** `rowSelection` / `expandable`（不另造 `selection` / `expand` 列语法糖）。
- **分页由本组件渲染**（`pagination` 受控：`{ current, pageSize, total, onChange }`），是表格外的独立节点而非 antd 内嵌分页，因此能随 `autoHeight` 贴在卡片底部；`pageSize` 变更时自动回到第 1 页，`showTotal` 固定「共 N 条」。不传 `pagination` 则不渲染分页。
- 其余未声明 props（`scroll`、`loading`、`onChange`、`dataSource` 等）原样透传 antd Table。
- `ProTableColumn<T>` = antd `TableColumnType<T>` + `type` / `valueEnum`；`render` 优先于字典渲染。

```tsx
<ProTable<UserListItem>
  autoHeight
  rowSelection={{ selectedRowKeys, onChange: (keys, rows) => {...} }}
  columns={[
    { title: '姓名', dataIndex: 'name' },
    { title: '状态', dataIndex: 'status', type: 'tag', valueEnum: { 1: { text: '启用', type: 'success' } } },
  ]}
  dataSource={list}
  loading={isFetching}
  scroll={{ x: 900 }}
  pagination={{ current: page, pageSize, total, onChange }}
/>
```

### 满高布局的 CSS 前提

`autoHeight` 只做两件事：给 Table 传 `scroll={{ y: '100%' }}`（rc-table 仅在存在 `scroll.y` 时才拆出独立的 `.ant-table-header` / `.ant-table-body`）并挂 `.pro-table-auto` 类。真正的满高由 `src/styles/components.css` 的 flex 链实现：

```
.pro-table-auto.ant-table-wrapper → .ant-spin(-nested-loading/-container)
  → .ant-table → .ant-table-container  （均为 display:flex + flex:1 + min-height:0）
.ant-table-header { flex: none }        .ant-table-body { flex:1; overflow-y:auto !important }
```

- **`.ant-spin` 层必须一并透传**：antd Table 内置 Spin 包裹层默认 `display:block`，不改为 flex 会按内容撑高，满高失效（页面出现整页滚动）。
- 表体的 `overflow-y` / `max-height` 由 rc-table 以内联样式下发，故用 `!important` 覆盖为按需滚动。
- 使用方只需保证父容器是**高度受限的 flex 列容器**（见 `docs/page-conventions.md` 的列表页高度布局）。

## useDialogForm

```ts
const { form, isEdit, saveMutation, pending } = useDialogForm<UserFormValues, UserListItem>({
  editingRow,                                                   // null = 新增
  submit: (values, editing) => (editing ? updateUser(...) : createUser(...)),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.lists() }),
})
```

| 返回           | 说明                                                                                                                                    |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `form`         | antd Form 实例（`<Form form={form} onFinish={values => saveMutation.mutate(values)}>`）                                                 |
| `isEdit`       | `!!editingRow`                                                                                                                          |
| `saveMutation` | `useMutation`，`mutationFn = values => submit(values, editingRow)`；`onSuccess` 统一 `message.success('保存成功')` + 调用方 `onSuccess` |
| `pending`      | `saveMutation.isPending`（提交按钮 loading）                                                                                            |

- **弹窗开关与编辑行由调用方以 props 受控**（React 惯用法，不反向暴露 `open` / `close` 命令）。
- **打开时的数据回填由调用方自理**：各表单加载契约不同（如账户表单编辑态经 `useQuery` 拉实体后 `setFieldsValue`）。
- **`onFinish` 必须显式绑定**：提交按钮走 `form.submit()`（而非 `htmlType="submit"`）时，antd 校验通过后只调用 `Form` 的 `onFinish`；漏绑则校验通过后静默无响应（校验不通过时仍会显示错误，容易掩盖该问题）。
- 调用方一般在 `onSuccess` 内 `onClose()` + 失效列表缓存。
