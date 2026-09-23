# ADR-0002：Ant Design 6 作为 UI 组件库

- 状态：已接受
- 日期：2026-09-23
- 关联：ADR-0007、ADR-0011

## 背景

范本需要 Element Plus 在 React 生态的对等物，覆盖后台重场景：Table（分页/树形）、Form（校验/布局）、Tree、Upload、Popover、反馈（message/notification/Modal）。访谈第一轮确认。

## 决策

使用 `antd ^6.6`（React 19 兼容，无需 patch 包）+ `@ant-design/icons ^6`。

## 理由

- React 后台事实标准，社区与文档生态最大，派生项目受众最广。
- antd 6 默认 CSS 变量模式，token 可直接映射进 Tailwind `@theme`（见 ADR-0007），比 Element Plus 变量覆盖更直接。
- Table/Form 现成能力使 ProTable 可以做得很薄（见 ADR-0011）。
- `App.useApp()` 提供上下文化的 message/Modal/notification，避免静态 API 的主题丢失问题。

## 后果

- 视觉与 Element Plus 存在差异——范本定位允许，不做像素级对齐。
- 需经 `ConfigProvider` 配置 zhCN locale 与主题 token。
- 图标体系以 @ant-design/icons 为主集合（`ad` 前缀），ri 集经 unplugin-icons 补充（与 vue3-admin 的 ep + ri 双集合同构）。

## 被否决的备选

- **shadcn/ui**：Radix + Tailwind 最新范式，但 Table/Form/Tree/Upload 等后台重基建缺失，ProTable 需大量自研，交付成本高。
- **Arco Design React**：视觉最接近 Element Plus，但社区规模与文档生态明显更小。
