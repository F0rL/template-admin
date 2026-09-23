# 架构

## Provider 层级（src/App.tsx）

```
ConfigProvider (主题 token + zhCN)
└─ AntdApp (message/notification maxCount 3)
   ├─ FeedbackBridge        # 注入 feedback 上下文实例
   ├─ QueryClientProvider   # queryClient (src/lib/queryClient.ts)
   │  └─ BrowserRouter (basename = config.BASE_URL)
   │     └─ RouterRoot      # NavigateBridge + AppRoutes
   └─ LoadingHost           # 全屏加载态（独立于路由树）
```

## 目录速览

```
src/
├── api/           # 接口函数 + 类型（见 docs/data-layer.md）
├── components/    # 共享组件（DynamicIcon / FeedbackBridge / LoadingHost）
├── config/        # 环境变量唯一出口
├── icons/         # iconMap 注册表（ad.ts + ri.ts）
├── layouts/       # default/ 布局 + components/（Header/Sidebar/Logo/UpdatePwd）
├── lib/           # queryClient
├── router/        # 路由表、守卫、navigate 桥、utils/filter
├── stores/        # zustand modules（user/permission/app）
├── styles/        # index.css (Tailwind) + components.css（antd 覆盖）
├── types/         # global.d.ts（ApiResponse / PaginatedData）
├── utils/         # feedback/http/encrypt/validate/file/dayjs（见 docs/utils.md、docs/http.md）
└── views/         # 页面（login / dashboard / system/* / result/error）
mock/              # vite mock（见 docs/mock.md）
```

## 路由

### 路由表结构

- `constantRoutes`（router/index.tsx）：`/login`（GuestGuard）、`/error`、`*` 兜底。
- `asyncRoutes`（router/asyncRoutes.ts）= `modules/dashboard.tsx` + `modules/system.tsx`：权限路由池，path 与后端菜单 path 一致（无前导斜杠）。
- AppRoutes 将权限路由作为 Layout 路由 children 挂载（useRoutes 无 addRoute 等价物，**增删路由 = 更新 permission store 的 routes state**）。
- 页面元信息放 route `handle`（title 等）。

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

`firstPath` 承担 `'/'` 索引重定向（index `<Navigate>`，等价 vue3-admin 的 Layout redirect）。

### 守卫

- `AuthGuard`：无 token → `/login?redirect=<pathname>`；加载中渲染 null；加载失败清会话回登录。NProgress 在此 start/done。
- `GuestGuard`：已登录访问 `/login` → 回 `/`。
- 白名单页（/login、/error）由路由结构保证不经 AuthGuard。

### 非组件上下文跳转（router/navigate.ts）

axios 拦截器等非组件上下文经 navigate 桥跳转/读路径；引用由 `<NavigateBridge/>` 挂载时注入。组件内一律用 useNavigate。

## 布局（layouts/default）

- aside 三态宽度：`!sidebarOpened → w-0` / `sidebarIconOnly → w-16` / `w-56`，transition-all。
- Sidebar 菜单：`buildMenuItems()`（SidebarItem.tsx 纯函数）把后端菜单树转为 antd Menu items——**叶子 key = `/${item.path}`（点击导航），父级 key = path || id（仅展开）**；Menu onClick 中仅 `key.startsWith('/')` 才 navigate。`isMenuShow !== false` 过滤。
- Header：折叠按钮 + 面包屑（`findMenuTrail(menuData, pathname)`）+ 用户下拉（修改密码 / 退出登录）。
- 页面切换动画：内容区 `<div key={location.pathname} className="animate-page-enter">` 包 `<Suspense><Outlet/></Suspense>`，key 变化触发重挂载播放动画。

## Stores（zustand）

| Store      | 持久化                | 关键成员                                                                 |
| ---------- | --------------------- | ------------------------------------------------------------------------ |
| user       | token + userInfo      | login / loadUserInfo / logout / resetToken；selectIsLoggedIn / selectRoles |
| permission | 否（会话态）          | menuData / routes / firstPath / isRoutesLoaded；generateRoutes / resetRoutes / refreshMenu |
| app        | sidebarOpened         | sidebarIconOnly（会话临态）/ toggleSidebar / closeSidebar / toggleSidebarIconOnly |

持久化 key 经 `stores/index.ts` 的 `storageKey(id)` = `${VITE_APP_STORAGE_NS}:${id}`，避免同源多应用冲突。

## 图标（icons/）

- `ri.ts`：Remix Icon 全量登记（unplugin-icons `~icons/ri/*` 生成，compiler jsx）；`ad.ts`：@ant-design/icons。
- `index.ts` 合并为 iconMap（同键 ri 覆盖 ad）；动态渲染用 `<DynamicIcon name>`（无匹配返回 null）。
- **后端菜单的 icon 字段值必须与 iconMap 键完全一致**（如 `ri:user-line`），mock 数据同理。
- 静态场景直接 import 图标组件，不走 iconMap。

## 构建与分包（vite.config.ts）

- base = `VITE_APP_BASE_URL`（/react-admin/）；端口 4001；`/api` 代理到 `VITE_APP_BASE_API`。
- React Compiler babel 仅 include `src/**`；React 插件负责其余转换。
- rolldown codeSplitting groups 按序：react-vendor（必须最前，依赖递归捕获）→ ui（antd/rc-*/@ant-design）→ react-query → axios → crypto（node-forge/jsencrypt）。
- build target es2022。
