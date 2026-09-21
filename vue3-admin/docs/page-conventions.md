# 页面代码规范

## 方法排列顺序

```
imports → defineProps/defineEmits → composables（无状态依赖） → ref/reactive →
computed → composables（依赖状态，如 useQuery/useMutation）→ 共享辅助函数 →
事件处理（按界面区域分组）→ defineExpose
```

无状态依赖的 composables（`useQueryClient`、`useStore`）前置；依赖本地 ref 的 `useQuery`/`useMutation` 后置。不需要分块注释标记。

## 注释

仅在关键交互入口（打开抽屉、删除确认、切换状态）添加 JSDoc 风格短注释。内部辅助函数不加注释——函数名表达用途。

## loading 选择

- 全局遮罩 → `withLoading(promise, '文案')`
- 按钮/表单内联 → `mutation.isPending`

二选一，不混用。

## 筛选区样式

- 页面主体分为两个独立内容块：**筛选区** 与 **表格区**，各用一个 `panel-card` 包裹，外层容器用 `flex h-page flex-col` 满屏布局，筛选区用 `mb-4 shrink-0` 与表格区分隔（详见下方「列表页高度布局」）。
- 筛选区整体用 `el-form class="g-filter-form" label-width="80px"` 包裹，内层**仅用一个** `el-row :gutter="16" class="gap-y-4"` 栅格排布，一行固定三列（`span="8"`）；每个筛选条件用 `el-form-item` + 短 label（2-4 字）呈现，控件在列内撑满宽度（`!w-full`）。条件超过三列自动换行，`gap-y-4` 提供换行后的纵向间距，禁止拆成多个 `el-row`。
- 搜索、重置按钮占用一列：`el-col` 内 `el-form-item` + `flex justify-end` 右对齐，紧随筛选条件之后，行末若不满三列用 `:offset` 补齐（如 `:offset="8"` 使按钮列落在第三列）。
- 导出、导入、批量操作等数据处理按钮与表格数据放在同一内容块（表格区），不放入筛选区。

## 列表页高度布局（表格满高、内部滚动）

列表页不整页滚动，表格固定占满剩余高度，表体内部滚动（`h-page` = 视窗高 - header - 内容区 padding，定义见 `src/styles/tailwind.css`）：

- **筛选区 + 表格区**（标准结构）：外层容器 `flex h-page flex-col`；筛选区卡片 `mb-4 shrink-0`；表格区卡片 `flex min-h-0 flex-1 flex-col`，ProTable 加 `auto-height`。
- **左树 + 右表格**：根 `h-page flex gap-4`，左树 `h-full overflow-y-auto` 独立滚动；右侧主列 `flex flex-col`，其内同上套用（表格卡片前的工具栏/筛选卡片加 `shrink-0`）。
- **单卡片页**（工具栏与表格同卡片）：根卡片 `flex h-page flex-col`，卡内非表格区域（工具栏、tabs、筛选行）加 `shrink-0`。
- ProTable 的 `auto-height` 会让 el-table 挂 `flex-1 min-h-0`，占满 flex 列容器剩余空间，表头固定、表体内部滚动、分页贴底；数据少时表格不收缩。
- 内容块卡片一律使用通用样式类 `panel-card`（圆角 + 白底 + 内边距 + 轻阴影，定义见 `src/styles/tailwind.css`），不得再内联 `rounded bg-white ... shadow-sm` 组合，也不得使用 `el-card`；需要 flex 布局时在其基础上追加对应类。
