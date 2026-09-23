# ADR-0011：ProTable 薄封装与共享组件落地节奏（Phase 2）

- 状态：已接受
- 日期：2026-09-23
- 关联：ADR-0002、ADR-0012

## 背景

vue3-admin 的 ProTable 是对 el-table 的配置驱动泛型封装（valueEnum 字典、selection/expand/tag 列、auto-height 满高、默认样式），是列表页模板的核心资产。React 侧 antd Table 原生能力更强（内置 filter/sorter/pagination/树形展开），重复建设无收益。

## 决策

- **ProTable = antd Table 的薄封装**，只补齐与 vue3-admin 版的行为对齐项：
  - `valueEnum` 字典渲染（value → label/tag）
  - `selection` / `expand` / `tag` 列语法糖
  - `auto-height` 满高模式（占满 flex 剩余高度，表体内部滚动、分页贴底）
  - 内置默认 `rowKey="id"`，可被同名 prop 覆盖
  - 其余未声明 props 原样透传 antd Table（`scroll`、`border`、`expandable`、`onChange` 等）
- **SelectIcon**：Popover + 双标签页（antd icons / ri）图标选择器，受控 `value: string`，结构对齐 vue3-admin 版。
- **useDialogForm**：弹窗表单 hook（open / close / pending / onSuccess 回调），承接 vue3-admin composable 的职责。
- **落地节奏：Phase 2 随首个模板页一起交付**——先实现真实页面，再以页面需求校准组件边界（先页面后组件，防止无人使用的抽象）。`docs/components.md` 与 `docs/page-conventions.md` 同步于 Phase 2 落地。

## 理由

- antd 6 已内置 el-table 需要封装才能获得的大部分能力，薄封装即够。
- 范本要求「与 vue3-admin 的组件心智对应」，派生项目应有统一的表格/图标选择用法，不能裸散用。

## 后果

- Phase 1 空白页不依赖 ProTable，不交付；Phase 2 交付后即成为列表页模板的固定拼图。

## 被否决的备选

- **不封装、直用 antd Table**：与 vue3-admin 范式不对应，派生项目无统一表格心智。
- **厚封装（照搬 vue3-admin ProTable 全量配置面）**：antd 6 已内置能力重复建设，维护负担大。
- **Phase 1 先行封装 ProTable**：无真实页面验证封装度，容易盲封返工。
