# ADR-0009：启用 React Compiler

- 状态：已接受
- 日期：2026-09-23
- 关联：ADR-0013

## 背景

React Compiler（`babel-plugin-react-compiler`）于 2025-10 发布 1.0 稳定版，GA 已近一年，是 React 官方当前的推荐实践：自动记忆化组件与值，消除大部分手写 `memo` / `useMemo` / `useCallback`。用户访谈第二轮确认启用。antd 6 兼容 React 19、无需 patch 包。

## 决策

- 启用 React Compiler，接入方式采用 **babel 稳定路线**：`@vitejs/plugin-react` 6 已移除内建 babel 选项，按 Vite 8 官方推荐接法（`react()` + `@rolldown/plugin-babel` + babel-plugin-react-compiler 的官方 preset，preset 自带 filter 只编译命中模块，避免全量 babel 开销）。实施时以 Vite 官方文档接线为准。
- 同步启用 `eslint-plugin-react-hooks ^7` 的 **compiler lint 规则**（React 官方将 lint 作为采用流程的一部分）。
- **编码约定**：组件内默认不手写 `memo`/`useMemo`/`useCallback`（由 Compiler 负责）；lint 会指出违反纯函数/不可变约定的写法。

## 理由

- 范本定位「当前成熟且最新的 React 架构 + 最佳实践」，Compiler 1.0 已稳定一年，是当前标准写法。
- 减少样板代码，代码更接近直觉心智模型。

## 后果

- 构建链多一层 babel preset（filter 限定命中范围，开发模式开销可控）。
- 个别第三方组件或违规写法导致编译失败时，Compiler 会自动跳过该组件（运行时降级为未优化），必要时以官方 escape hatch 排除。
- StrictMode 开启，配合 Compiler 的 lint 规则保证副作用规范。

## 被否决的备选

- **暂缓（手动记忆化）**：手动 memo/useCallback 属于过时实践，范本不应示范。
- **oxc 原生 compiler 路线（`react({ compiler: true })`）**：plugin-react 6.1 中的实验特性，范本不押注实验路线。
