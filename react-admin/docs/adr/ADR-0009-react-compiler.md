# ADR-0009：启用 React Compiler

- 状态：已接受（2026-09-24 修订：接入方式切换为 oxc 原生路线，见文末「修订」）
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
- **oxc 原生 compiler 路线（`react({ compiler: true })`）**：当时为 plugin-react 6.1 中的实验特性，范本不押注实验路线。（2026-09-24 修订：该路线已稳定并被官方推荐，否决理由失效，由文末「修订」采纳。）

## 修订（2026-09-24）：接入方式切换为 oxc 原生路线

- `@vitejs/plugin-react` 6.1+ 内置 React Compiler 原生支持（基于 `oxc-transform-react`），配置收敛为 `react({ compiler: true })`，该路线已稳定并被官方推荐，原「实验特性」否决理由失效。
- 构建配置移除 Babel 链路：删除 `@rolldown/plugin-babel` + `babel-plugin-react-compiler` 及配套依赖（`@babel/core` / `@babel/plugin-transform-runtime` / `@babel/runtime` / `@types/babel__core`），vite.config 中 babel 插件替换为 `react({ compiler: true })`，dev 冷启动与构建提速、依赖面收窄。
- Compiler 语义与 Babel 路线一致（自动记忆化行为不变），本 ADR 的编码约定（不手写 memo/useMemo/useCallback）与 react-hooks compiler lint 规则不受影响。
- `@babel/runtime` 仍作为 antd（rc-*）的传递依赖存在于产物 ui 分包，分包分组注释不变。
- 新增项目级 `.npmrc`：`auto-install-peers=false`——阻止 pnpm 把 plugin-react 的 optional peers（`@rolldown/plugin-babel`、`babel-plugin-react-compiler`）自动装回 node_modules，保证依赖面与 package.json 一致；派生项目新增依赖时需显式声明所需 peer 包。
