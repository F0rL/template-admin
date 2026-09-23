# ADR-0010：ECharts 自写 hook 封装（Phase 2 实装）

- 状态：已接受
- 日期：2026-09-23
- 关联：ADR-0012

## 背景

vue3-admin 图表方案：`echarts 6` 按需注册（`echarts/core` 的 `use([...])` 集中于 `src/lib/echarts.ts`）+ `vue-echarts` 的 `<VChart autoresize>` 组件。React 生态中 `echarts-for-react` 处于维护停滞（年均 1-2 版），ECharts 官方只维护 vue 封装；社区主流是自写轻量 hook（ResizeObserver + setOption，约 30 行）。

## 决策

- 使用 `echarts ^6.1`（与 vue3-admin 同版本），按需注册集中在 `src/lib/echarts.ts`（新增图表类型时在 `use([...])` 追加 chart/component/renderer，tree-shake 且随页面懒加载）。
- 自写 `useECharts` hook / `<EChart option={...} />` 组件（`src/components/EChart`）：ResizeObserver 自适应、`setOption` 更新；初始化/销毁在 effect 中成对完成（StrictMode 兼容）；option 为普通对象直接传值（React 无 Vue 深响应问题，等价 vue3-admin 用 `shallowRef` 规避的开销）。
- 尺寸约定：外层容器定高（`<div className="h-72">`），图表 100% 填充。
- **实装时机：Phase 2**（随首个真实 dashboard 页面交付，Phase 1 dashboard 为空白占位）。

## 理由

- 自写封装可控、无第三方维护风险；hook 是社区主流方案。
- 与 vue3-admin 同引擎同版本，图表 option 两模板可直接互查。

## 后果

- `lib/echarts.ts` 与 `components/EChart` 由使用图表的第一个页面（Phase 2 dashboard）验证落地。

## 被否决的备选

- **echarts-for-react**：维护停滞，不押注。
- **更换图表库（recharts 等）**：破坏与 vue3-admin 的对等性，echarts 能力覆盖后台场景最全。
