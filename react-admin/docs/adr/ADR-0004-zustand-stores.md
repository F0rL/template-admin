# ADR-0004：Zustand 全局状态与 Store/Query 边界

- 状态：已接受
- 日期：2026-09-23
- 关联：ADR-0003、ADR-0005

## 背景

全局状态为三块跨页面单例：用户会话（token / userInfo / roles）、权限路由（菜单树 / 动态路由）、应用布局（侧栏折叠 / device / size）。需要在非组件上下文（axios 拦截器）读写，且 token 需持久化。访谈第一轮确认。

## 决策

- 使用 `zustand ^5.0`，内置 `persist` 中间件持久化。
- Store 拆分与 vue3-admin 一致（`stores/modules/`）：
  - **user** — `token`、`userInfo`、`roles`、`login / loadUserInfo / logout / resetToken`；persist `['token', 'userInfo']`
  - **permission** — `menuData`（后端菜单树）、`routes`（过滤后的 RouteObject[]）、`isRoutesLoaded`、`generateRoutes / resetRoutes`；不 persist
  - **app** — `sidebarOpened`、`device`、`size` 及切换器；persist `['sidebarOpened', 'size']`
- persist storage key 统一格式 `${config.STORAGE_NS}:${storeId}`（`react-admin:` 前缀，避免与同源部署的 vue3-admin 串值），实现在 `stores/index.ts`。
- 非组件上下文用 `useUserStore.getState()/setState()`（等价 vue3-admin 在拦截器中导入 pinia 实例的用法）。

## 理由

- Zustand 为 React 生态当前事实标准：轻量、无 Provider、persist 内置。
- Store 定义形态与 Pinia setup store 心智对齐，两模板互查成本低。

## 后果

- **边界约定**（同 vue3-admin）：Store 只持有跨页面应用状态；服务端数据（列表/详情）一律进 TanStack Query 缓存，不进 Store。
- 一次性命令式操作（login / generateRoutes）直接调 API 函数，不进查询缓存。

## 被否决的备选

- **Redux Toolkit**：最成熟但样板重，与 vue3-admin 轻量 store 风格不对等。
- **Jotai**：原子化适合细粒度状态，管理全局单例反而绕。
- **Context + useReducer**：无持久化、非组件上下文不可用、re-render 面大。
