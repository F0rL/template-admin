# ADR-0003：React Router 8 库模式与菜单驱动动态路由

- 状态：已接受
- 日期：2026-09-23
- 关联：ADR-0004、ADR-0006

## 背景

路由需求与 vue3-admin 对齐：后端菜单过滤本地 `asyncRoutes` + 动态注册 + 登录守卫 + NProgress。用户访谈第一轮明确选择 React Router 8（v8 为当前主线，ESM-only，要求 Vite 7+ / React 19+，v7 的非破坏演进）。

## 决策

- 使用 `react-router ^8.4` **库模式**：`<BrowserRouter basename={config.BASE_URL}>` + `useRoutes` 声明式渲染。
- 路由分两层：`constantRoutes`（login / error / catchAll，静态）+ 布局路由 `{ path: '/', element: <AuthGuard><DefaultLayout/></AuthGuard>, children: permissionStore.routes }`——**动态子路由由 permission store 状态派生**。
- `AuthGuard` 组件承担 vue-router `beforeEach` 的职责：无 token 重定向登录、已登录访问 /login 回首页、首次进入加载 userInfo + generateRoutes、失败清会话回登录。
- 非组件上下文（axios 401）经 `router/navigate.ts` 桥跳转：`<NavigateBridge/>` 挂载时注入 `useNavigate` 引用。
- NProgress：AuthGuard 异步段手动 start/done；路由切换由 location effect 收尾。
- 页面标题/图标置于 `route.handle`（RR8 扩展点，对应 vue-router 的 `meta`）。

## 理由

- `useRoutes` 依据每次 render 的 routes 数组匹配——菜单加载完成/登出清空后状态更新即重新匹配，**天然支持路由增删**，是 React Router 官方支持的动态渲染方式，无需 addRoute 等价物。
- 数据路由（`createBrowserRouter` 的 loader/action）与本范本「数据获取一律 TanStack Query」的边界冲突（见 ADR-0005）。
- 与 vue-router 心智对齐（守卫逻辑、constant/async 分层、模块化注册），派生项目可平滑理解。

## 后果

- 不使用 RR data APIs（loader / action / defer / `useNavigation`）。
- 动态路由的挂载时机取决于 store 状态更新，AuthGuard 需保证首载期间渲染 `null`（等价 NProgress + 空白帧）。

## 被否决的备选

- **createBrowserRouter + `patchRoutesOnNavigation`**：面向框架模式按导航补丁懒加载；登出清空路由不友好，且引入数据 API 与 Query 边界冲突。
- **`router.routes` 原地变异 + 重新导航**：非官方支持用法。
- **TanStack Router**：参数/搜索 100% 类型安全，但类型层复杂、与 vue3-admin 范式差异大，菜单动态注册心智成本高（用户访谈亦未选择）。
