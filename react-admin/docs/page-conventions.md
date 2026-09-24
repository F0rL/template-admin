# 页面代码规范

## 代码排列顺序

```
imports（第三方 → 内部 → 同目录子组件）→ 类型/接口 → 模块级常量 →
无状态依赖 hooks（useQueryClient / store selector）→ useState →
useQuery / useMutation → 派生值（tableData / columns）→ 事件处理函数 → JSX
```

- 事件处理用 `function` 声明（函数提升），因此可以定义在 `columns` 之后，被上方的列渲染引用（如操作列的 `handleEdit` / `handleDelete`）。
- `useQuery` 内联写在页面/组件内，queryKey 与 queryFn 同处可见（见 `docs/data-layer.md`）。

## 注释

仅在关键交互入口（打开抽屉、删除确认、查询/重置、提交组装）加短注释，内部辅助函数不加——函数名表达用途。

## loading 选择

- 全局遮罩 → `withLoading(promise, '文案')`（一次性命令式请求，如删除/重置密码）
- 按钮/表单内联 → `mutation.isPending`（弹窗表单提交，经 `useDialogForm` 的 `pending`）
- 列表刷新 → ProTable 的 `loading={isFetching}`（保留旧数据，不闪白）

## 筛选区样式

- 页面主体分为两个独立内容块：**筛选区** 与 **表格区**，各用一个 `panel-card` 包裹；外层容器 `flex h-page flex-col`，筛选区用 `mb-4 shrink-0` 与表格区分隔。
- 筛选区整体用一个 `<Form labelCol={{ flex: '0 0 80px' }} wrapperCol={{ flex: '1 1 0%' }}>` 包裹（对齐 vue3-admin 的 `el-form.g-filter-form` + `label-width="80px"`），内层**仅用一个** `div.grid grid-cols-3 gap-x-4 gap-y-4`（对齐 `el-row :gutter="16" class="gap-y-4"`）：一行固定三列，**每个筛选条件占 1/3**；条件超过三列自动换行，`gap-y-4` 提供换行后的纵向间距，禁止拆成多个 grid。
- `wrapperCol` 必须用 `flex: '1 1 0%'`（basis 0，等价 EP 的 `.el-form-item__content { flex: 1 }`）：antd 的 Form.Item 行是 `flex-wrap: wrap` 的 antd Row，basis 取 `auto` 时会以控件固有宽度（Input 约 180px）参与计算，窄列下 `label + 控件` 超过列宽即把 label 挤到上一行。
- 每个筛选条件用 `<Form.Item label="关键字" className="!mb-0">`（label 2-4 字，`!mb-0` 去掉 Form.Item 默认底间距，对齐 `g-filter-form` 的覆盖）；**控件须显式 `className="w-full"`**——antd 6 的 Input 在 Form.Item 内不自动撑满（对齐 vue3-admin 的 `!w-full`）。
- **查询、重置按钮组占一列**（同样 1/3），落在筛选条件之后的列内、右对齐：`<Form.Item className="col-start-3 !mb-0">`（`col-start-3` 等价 vue3-admin 用 `:offset` 把按钮列补齐到第三列，使行末对齐）内放 `<div className="flex justify-end gap-3">`。
- 关键字输入框 `onPressEnter` 触发查询、`allowClear` + `onClear` 触发重置。
- 导出、导入、批量操作等数据处理按钮与表格数据放在同一内容块（表格区），不放入筛选区。

## 列表页高度布局（表格满高、内部滚动）

列表页不整页滚动，表格固定占满剩余高度，表体内部滚动（`h-page` = 视窗高 − header − 内容区 padding，定义见 `src/styles/tailwind.css`）：

- **筛选区 + 表格区**（标准结构）：外层容器 `flex h-page flex-col`；筛选区卡片 `mb-4 shrink-0`；表格区卡片 `flex min-h-0 flex-1 flex-col`，卡内工具栏 `mb-4 shrink-0`，ProTable 加 `autoHeight`。
- **左树 + 右表格**：根 `h-page flex gap-4`，左树 `h-full overflow-y-auto` 独立滚动；右侧主列 `flex flex-col`，其内同上套用。
- **单卡片页**（工具栏与表格同卡片）：根卡片 `flex h-page flex-col`，卡内非表格区域加 `shrink-0`。
- ProTable 的 `autoHeight` 让表格容器链变 flex 列（CSS 见 `docs/components.md`），表头固定、表体内部滚动、分页贴底。
- 内容块卡片一律使用通用样式类 `panel-card`（圆角 + 白底 + 内边距 + 轻阴影），不得再内联 `rounded bg-white ... shadow-sm` 组合；需要 flex 布局时在其基础上追加对应类。

## 弹窗表单（抽屉 / 对话框）

- 结构：`Drawer`（`size={560}` / `mask={{ closable: false }}` / `destroyOnHidden`）或 `Modal`，footer 为「取消 + 确定」，确定按钮 `onClick={() => form.submit()}`、`loading={pending}`。
- **打开时重置**：父级维护自增 `key`（`formKey`）传给表单组件，每次打开重挂载，表单与本地状态自然回到初始态（等价 Vue 版 `open` 时 `reset()`）；`open` + `editingRow` 仍以 props 受控。
- **编辑态回填**：`useQuery`（`enabled: open && !!editingRow`）拉实体后 `setFieldsValue`；加载态用 `<Spin>` 包 `<Form>`（antd 6 的 Form 无 `loading` prop）。新增态不发实体请求。
- 表单提交与缓存失效统一走 `useDialogForm`（见 `docs/components.md`）。
- 表单状态全部收敛在 antd Form 内（含 Upload 的 fileList，经 `valuePropName="fileList"` + `getValueFromEvent` 映射）；上传响应由 `customRequest` 的 `onSuccess` 写回 `file.response`，提交时从 `values.xxx[0].response` 取服务端字段。**禁止**为表单字段另建 `useState` 再在 effect 内同步（触发 react-hooks/set-state-in-effect 且状态双源）。
