# 架构

## Provider 层级（src/App.tsx）

```
ConfigProvider (antdTheme（src/theme/index.ts） + zhCN)
└─ AntdApp (message/notification maxCount 3)
   ├─ FeedbackBridge        # 注入 feedback 上下文实例
   ├─ QueryClientProvider   # queryClient (src/lib/queryClient.ts)
   │  ├─ BrowserRouter (basename = config.BASE_URL)
   │  │  └─ RouterRoot      # NavigateBridge + AppRoutes
   │  └─ ReactQueryDevtools # 查询调试面板（VITE_APP_ENABLE_DEVTOOLS 控制，默认关闭）
   └─ LoadingHost           # 全屏加载态（独立于路由树）
```

## 目录速览

```
src/
├── api/           # 接口函数 + 类型（见 docs/data-layer.md）
├── components/    # 共享组件（ProTable / DynamicIcon / FeedbackBridge / LoadingHost / PlaceholderPage）
├── config/        # 环境变量唯一出口
├── hooks/         # 共享 hooks（useDialogForm）
├── icons/         # iconMap 注册表（ad.ts + ri.ts）
├── layouts/       # default/ 布局 + components/（Header/Sidebar/Logo/UpdatePwd）
├── lib/           # queryClient
├── router/        # 路由表、守卫、navigate 桥、utils/filter
├── stores/        # zustand modules（user/permission/app）
├── styles/        # index.css（聚合）+ tailwind.css（@theme 映射）+ components.css（antd 覆盖 + ProTable 满高 + 页面切换动画）
├── theme/         # antdTheme：主题 token 唯一来源（见 ADR-0007）
├── types/         # global.d.ts（ApiResponse / PaginatedData）
├── utils/         # feedback/http/encrypt/validate/file/dayjs（见 docs/utils.md、docs/http.md）
└── views/         # 页面（login / dashboard / system/* / result/error）
mock/              # vite mock（见 docs/mock.md）
```

## 路由

### 路由表结构

- `constantRoutes`（router/index.tsx）：`/login`（GuestGuard）、`/error`（公开页，不经守卫）。
- `asyncRoutes`（router/asyncRoutes.ts）= `modules/dashboard.tsx` + `modules/system.tsx`：权限路由池，path 与后端菜单 path 一致（无前导斜杠）。
- AppRoutes 将权限路由作为 Layout 路由 children 挂载（useRoutes 无 addRoute 等价物，**增删路由 = 更新 permission store 的 routes state**）。
- `*` 兜底（404 页）同样包 `AuthGuard`，兼作深链刷新的守卫入口：刷新时权限路由尚未生成（routes 为空），深链只能命中 splat 分支，由守卫触发菜单加载，加载完成后 useRoutes 重匹配到权限路由（splat 得分低于具体路径，不会抢占）。**禁止**把 `*` 放回 constantRoutes，否则深链刷新直接停在 404 且守卫永不执行。
- 页面元信息放 route `handle`（title 等）；DefaultLayout 按权限路由表 + pathname 匹配叶子路由（declarative mode 无 `useMatches`，其为 data router 专属 API），取 handle.title 写入 `document.title`（登录/错误页保留 index.html 静态标题）。

### 权限路由链路

```
AuthGuard（token 存在且 isRoutesLoaded=false 时触发）
→ permission.generateRoutes()（并发去重：模块级 routesLoadedPromise）
   → fetchUserRightMenu() 拉菜单树
   → collectMenuPaths() 收集授权 path
   → filterRoutes(asyncRoutes, allowedPaths) 过滤
   → getFirstVisiblePath() 求 firstPath
→ set({ menuData, routes, firstPath, isRoutesLoaded: true }) → useRoutes 重匹配
```

`firstPath` 承担 `'/'` 索引重定向（index `<Navigate>`，等价 vue3-admin 的 Layout redirect）；`firstPath` 为空（无可见菜单）时兜底跳 `/error`，避免内容区空白。

### 守卫

- `AuthGuard`：无 token → `/login?redirect=<pathname>`；加载中渲染 null；加载失败清会话回登录。
- `GuestGuard`：已登录访问 `/login` → 回 `/`。
- 白名单页（/login、/error）由路由结构保证不经 AuthGuard；未登录访问其他路径（含未知路径）→ 登录页。

### 非组件上下文跳转（router/navigate.ts）

axios 拦截器等非组件上下文经 navigate 桥跳转/读路径；引用由 `<NavigateBridge/>` 挂载时注入。组件内一律用 useNavigate。

## 布局（layouts/default）

- 根容器 `bg-bg-layout`（antd `colorBgLayout`，灰底）：内容区灰底，与 `panel-card` 白块形成分块对比；Header / aside 保持 `bg-white`。
- aside 三态宽度：`!sidebarOpened → w-0` / `sidebarIconOnly → w-16` / `w-56`，transition-all。
- Sidebar 菜单：`buildMenuItems()`（SidebarItem.tsx 纯函数）把后端菜单树转为 antd Menu items——**叶子 key = `/${item.path}`（点击导航），父级 key = path || id（仅展开）**；Menu onClick 中仅 `key.startsWith('/')` 才 navigate。`isMenuShow !== false` 过滤。
- Header：折叠按钮 + 面包屑（`findMenuTrail(menuData, pathname)`）+ 用户下拉（修改密码 / 退出登录）。
- 页面切换动画：内容区以 `<ViewTransition default="page-fade">` 包 `<Suspense><Outlet/></Suspense>`（React 19.3 原生组件；RR 导航状态更新包在 startTransition 中故可激活过渡；动画定义见 `src/styles/components.css`，不支持该 API 的浏览器自动跳过动画）。
- 内容区滚动：导航（pathname 变化）后 `scrollTo({ top: 0 })` 重置滚动位置，对应 vue3-admin 的 `scrollBehavior: () => ({ top: 0 })`。

## Stores（zustand）

| Store      | 持久化           | 关键成员                                                                                   |
| ---------- | ---------------- | ------------------------------------------------------------------------------------------ |
| user       | token + userInfo | login / loadUserInfo / logout / resetToken；selectIsLoggedIn / selectRoles                 |
| permission | 否（会话态）     | menuData / routes / firstPath / isRoutesLoaded；generateRoutes / resetRoutes / refreshMenu |
| app        | sidebarOpened    | sidebarIconOnly（会话临态）/ toggleSidebar / closeSidebar / toggleSidebarIconOnly          |

持久化 key 经 `stores/index.ts` 的 `storageKey(id)` = `${VITE_APP_STORAGE_NS}:${id}`，避免同源多应用冲突。

## 图标（icons/）

- `ri.ts`：Remix Icon 全量登记（unplugin-icons `~icons/ri/*` 生成，compiler jsx）；`ad.ts`：@ant-design/icons。
- `index.ts` 合并为 iconMap（同键 ri 覆盖 ad）；动态渲染用 `<DynamicIcon name>`（无匹配返回 null）。
- **后端菜单的 icon 字段值必须与 iconMap 键完全一致**（如 `ri:user-line`），mock 数据同理。
- 静态场景直接 import 图标组件，不走 iconMap。

## 构建与分包（vite.config.ts）

- base = `VITE_APP_BASE_URL`（/react-admin/）；端口 4001；`/api` 代理到 `VITE_APP_BASE_API`。
- React Compiler 经 `@vitejs/plugin-react` 的 `compiler: true`（oxc 原生路线，见 ADR-0009 修订）启用，无 Babel 转换层。
- rolldown codeSplitting groups 按序：react-vendor（必须最前，依赖递归捕获）→ ui（antd/rc-*/@ant-design）→ react-query → axios → crypto（node-forge/jsencrypt）。
- build target es2022。
