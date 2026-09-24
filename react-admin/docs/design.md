# react-admin 总体设计

> 状态：**待用户确认**，确认后进入 Phase 1 实施。
> 逐项决策依据见 `docs/adr/`，术语定义见 `docs/glossary.md`。

## 1. 定位与目标

react-admin 是 React 后台管理**范本**（react-admin-template）：与 vue3-admin（admin-template）互为独立对等物——目录、代码、文档完全独立，不共享任何文件。架构与能力对等，但内部写法完全遵循 React 惯用法，不逐行翻译 Vue 代码。

派生新 React 后台项目时，复制本目录起步；不含业务模块。

## 2. 决策一览（访谈结论）

| #   | 决策点    | 结论                                                              | ADR      |
| --- | --------- | ----------------------------------------------------------------- | -------- |
| 1   | 构建形态  | Vite 8 + React 19 SPA（与 vue3-admin 形态对等）                   | ADR-0001 |
| 2   | UI 组件库 | Ant Design 6（+ @ant-design/icons 6）                             | ADR-0002 |
| 3   | 路由      | React Router 8 库模式（BrowserRouter + useRoutes）                | ADR-0003 |
| 4   | 状态管理  | Zustand 5（persist 中间件）                                       | ADR-0004 |
| 5   | 数据层    | @tanstack/react-query 5                                           | ADR-0005 |
| 6   | HTTP      | axios + ApiResponse 解包 + 401 统一处理                           | ADR-0006 |
| 7   | 样式      | Tailwind 4 + antd token（ConfigProvider + @theme 映射）           | ADR-0007 |
| 8   | Mock      | vite-plugin-mock-dev-server（与 vue3-admin 同方案）               | ADR-0008 |
| 9   | Compiler  | React Compiler 启用（oxc 原生路线）                               | ADR-0009 |
| 10  | 图表      | echarts 6 + 自写 useECharts（Phase 2 实装）                       | ADR-0010 |
| 11  | 共享组件  | ProTable（antd Table 薄封装，已落地）+ SelectIcon（待菜单管理页） | ADR-0011 |
| 12  | 交付策略  | 骨架先行；dashboard/系统管理空白占位；先做一个模板页定调          | ADR-0012 |
| 13  | 工具链    | pnpm 10 + ESLint 10 flat + TS ~6.0 strict + Prettier              | ADR-0013 |
| 14  | gen:api   | 暂缓，API 文件手写                                                | —        |
| 15  | 端口/base | dev 4001 + BASE_URL `/react-admin/`，STORAGE_NS 独立              | —        |

## 3. 技术栈与版本（2026-09 基线）

运行时依赖：

| 依赖                      | 版本                | 用途                                                       |
| ------------------------- | ------------------- | ---------------------------------------------------------- |
| react / react-dom         | ^19.3               | UI 框架                                                    |
| antd / @ant-design/icons  | ^6.6 / ^6           | 组件库与图标（v6 默认 CSS 变量，兼容 React 19 无需 patch） |
| react-router              | ^8.4                | 路由（v7 起合并 react-router-dom）                         |
| @tanstack/react-query     | ^5.103              | 服务端状态（devtools 面板由 VITE_APP_ENABLE_DEVTOOLS 控制） |
| zustand                   | ^5.0                | 全局状态（persist 内置）                                   |
| axios / dayjs             | ^1.7 / ^1.11        | HTTP / 日期（同 vue3-admin）                               |
| jsencrypt + node-forge    | ^3.5 / ^1.4         | 改密 RSA / AES 工具（同 vue3-admin）                       |

开发依赖：

| 依赖                                                              | 版本               | 用途                              |
| ----------------------------------------------------------------- | ------------------ | --------------------------------- |
| vite / @vitejs/plugin-react                                       | ^8.1 / ^6.1        | 构建（Oxc React Refresh）+ Compiler 接入 |
| typescript                                                        | ~6.0               | 类型（strict）                    |
| tailwindcss + @tailwindcss/vite                                   | ^4.3               | 样式（CSS-first，无 config 文件） |
| eslint / typescript-eslint / react-hooks                          | ^10 / ^8.70 / ^7.1 | Lint（含 Compiler 规则）          |
| prettier + prettier-plugin-tailwindcss                            | ^3.9 / ^0.8        | 格式化与类名排序                  |
| unplugin-icons + @svgr/core + @svgr/plugin-jsx + @iconify-json/ri | ^24                | 静态图标组件（ri 集）             |
| vite-plugin-mock-dev-server                                       | ^2.4               | Mock（框架无关）                  |

## 4. 分期计划

### Phase 1：骨架（本次确认后实施）

- 工程初始化：Vite 8 + React 19 + TS strict + Tailwind 4 + antd 6 + ESLint/Prettier + React Compiler
- **完整登录链路**：登录页（账号密码 + 验证码 md5Hash；二维码登录占位）、AuthGuard 守卫、动态路由（后端菜单过滤 asyncRoutes）、UpdatePwd 改密（RSA，Header 用户菜单内）
- 布局：Header / Logo / Sidebar / SidebarItem（antd Menu 渲染后端菜单树）
- 共享层：config、http（axios + ApiResponse 解包 + 401）、queryClient、stores（user/permission/app）、utils（feedback/encrypt/validate/file/dayjs）、icons（iconMap）
- API 层：仅 `api/system/auth.ts`（GetLoginVerCode / GetTokenPC / GetUserInfo / GetUserRightMenu / UpdatePwd）
- Mock：auth 完整链路 + db（最小用户/菜单数据）
- dashboard 与 system/* 页面：**空白占位页（仅展示页面名）**
- 错误页（404/异常）
- 文档：AGENTS.md + docs/{commands, principles, architecture, data-layer, http, utils, mock, git}.md

### Phase 2：模板页定调（进行中）

- 首个系统管理页面定为 `system/user`（筛选 + 分页表格 + 抽屉表单 + 上传，覆盖面最全），**已完成**：`views/system/user/index.tsx` + `components/UserForm.tsx`，配套 `api/system/{sysUser,sysRole,sysFile}.ts` 与对应 mock
- 随之落地（**已完成**）：ProTable、useDialogForm、`docs/{components, page-conventions}.md`
- SelectIcon 与 ECharts 均已在 Phase 3 落地（菜单管理页图标选择器、dashboard 图表）

### Phase 3：逐页完善（已完成）

- 按 Phase 2 定下的模板逐个补齐 role / menu / org / log / dashboard 真实页面与对应 API + mock，**全部落地**
- `/sys-role-list`（角色管理）——单卡片列表（新增 / 编辑 / 删除，系统内置角色禁用操作）+ 抽屉表单（角色名称 / 状态 / 菜单权限树，含展开折叠与全选）；配套 `api/system/{sysRole,sysMenu}.ts` 与 `mock/{sysRole,sysMenu}.ts`（菜单树复用 db 的 `userMenus`）
- `/sys-menu-list`（菜单管理）——树形表格（展开/收起全部）+ 抽屉表单（含 SelectIcon 图标选择器）；配套 `mock/sysMenu.ts` 扩充（实体/父级菜单/增删改假成功）
- `/sys-org-list`（组织架构）——左侧部门树（antd Tree）+ 右侧成员分页表格（筛选/缓存刷新联动）；配套 `api/system/wxWork.ts` 与 `mock/wxWork.ts`
- `/sys-log-list`（日志管理）——请求/错误日志双 tab 列表 + 详情抽屉；配套 `api/system/sysLog.ts` 与 `mock/sysLog.ts`
- `/`（dashboard）——统计卡片 + ECharts 图表示例（`components/EChart` + `@/lib/echarts` 按需注册）

## 5. 目录结构（Phase 1 完成形态）

```
react-admin/
├── docs/                      # 设计资产（本目录）+ AGENTS 索引的主题文档
│   ├── design.md              # 总体设计（本文件）
│   ├── glossary.md            # 术语表
│   └── adr/                   # 架构决策记录
├── mock/                      # auth.ts / db.ts / utils.ts（Phase 2 起随页面扩充）
├── public/
├── src/
│   ├── api/
│   │   └── system/auth.ts     # 命名空间导入约定（同 vue3-admin data-layer）
│   ├── config/index.ts        # 类型化 config（BASE_URL / API_BASE_URL / FILE_BASE_URL / APP_TITLE / STORAGE_NS）
│   ├── icons/                 # ad.ts / ri.ts / index.ts（默认导出 iconMap）
│   ├── layouts/
│   │   ├── components/        # Header / Logo / Sidebar / SidebarItem / UpdatePwd
│   │   └── default/           # DefaultLayout（h-page 满高布局）
│   ├── lib/queryClient.ts     # 共享 QueryClient（staleTime 0 / gcTime 5min / retry 0）
│   ├── router/
│   │   ├── index.tsx          # constantRoutes / asyncRoutes / AppRoutes（useRoutes）
│   │   ├── AuthGuard.tsx      # 守卫：token 校验 → 首载用户信息与菜单
│   │   ├── navigate.ts        # 非组件上下文跳转桥（http 401 用）
│   │   └── modules/           # dashboard.tsx / system.tsx
│   ├── stores/
│   │   ├── index.ts           # persist storage key 命名空间（react-admin:${storeId}）
│   │   └── modules/           # user.ts / permission.ts / app.ts
│   ├── styles/                # theme.css（antd token 基准）/ tailwind.css（@theme 映射）/ index.css（聚合）
│   ├── types/                 # global.d.ts（ApiResponse / PaginatedData）/ vite-env.d.ts / node-forge.d.ts
│   ├── utils/
│   │   ├── http/              # index.ts / apiHelpers.ts / error.ts
│   │   └── dayjs.ts / encrypt.ts / feedback.ts / validate.ts / file.ts
│   ├── views/
│   │   ├── login/             # index.tsx + components/（AccountLogin / QrcodeLogin 占位 / LoginLayout）
│   │   ├── dashboard/         # 空白占位
│   │   ├── system/            # user / role / menu / org / log —— 空白占位
│   │   └── result/error.tsx
│   ├── App.tsx                # Provider 层级 + AppRoutes
│   └── main.tsx
├── .env / .env.development / .env.production
├── eslint.config.js / .prettierrc / tsconfig.json / vite.config.ts / index.html
└── AGENTS.md                  # Phase 1 收尾时生成（硬约束 + docs 索引）
```

## 6. 核心设计

### 6.1 Provider 层级（App.tsx）

```
<StrictMode>
  <ConfigProvider theme={antdTheme} locale={zhCN}>   ← 主题 token 唯一来源（antd 6 CSS 变量模式）
    <AntdApp>                                        ← antd message/notification 上下文（App.useApp）
      <QueryClientProvider client={queryClient}>
        <BrowserRouter basename={config.BASE_URL}>
          <AppRoutes />                              ← useRoutes + AuthGuard + NavigateBridge
```

主题 token 经 `ConfigProvider theme.token` 配置（antd 6 默认 CSS 变量模式），不再用 `:root` 覆盖 CSS 变量；`tailwind.css` 的 `@theme` 将 `--color-primary` 等映射到 antd 运行时变量，保证 `bg-primary` 等工具类与主题同步（与 vue3-admin 的 theme.css → @theme 思路一致，token 源头改为 ConfigProvider）。

### 6.2 认证与动态路由

对齐 vue3-admin 守卫逻辑，React 化为组件：

1. `AppRoutes` 用 `useRoutes` 声明：constantRoutes（login / error / catchAll）+ `{ path: '/', element: <AuthGuard><DefaultLayout/></AuthGuard>, children: permissionStore.routes }`
2. `AuthGuard`（白名单由结构保证：login / error 不在守卫之下）：
   - 无 token → `<Navigate to="/login?redirect=..." replace />`；已登录访问 /login → 回首页
   - `!isRoutesLoaded` 首次进入 → `loadUserInfo()`（userInfo.id 为已加载标记）→ `generateRoutes()`（fetchUserRightMenu → 过滤 asyncRoutes）；加载期间渲染 `null`，菜单就绪后 re-render，`useRoutes` 重新匹配目标路径
   - 失败 → resetToken + resetRoutes → 跳 login（对齐 vue3-admin 防守卫 reject 白屏的策略）
3. `permissionStore.routes` 由后端菜单树收集允许路径过滤 `asyncRoutes` 生成，`route.handle` 携带 title/icon
4. logout / 401：清 store + 跳 login；`useRoutes` 状态驱动天然支持路由增删，无需 addRoute 等价物

非组件上下文（axios 401）跳转经 `router/navigate.ts` 桥（由 `<NavigateBridge/>` 挂载时注入 useNavigate 引用）。

### 6.3 HTTP 层与数据层

契约与 vue3-admin 完全一致（同一 fastify 后端）：

- `ApiResponse<T> = { data, code, msg, errors, success }`；`PaginatedData<T> = { list, total }`
- axios 默认实例：baseURL = `config.API_BASE_URL`、timeout 15s；请求拦截注入 `Authorization: Bearer <token>`
- `apiGet` / `apiPost` 只解包返回 data；业务错误（`success === false`）由拦截器统一处理：`code === 401` → 清会话跳登录（经 navigate 桥），其余 toast，以 `BusinessError` reject
- API 函数为纯异步函数；`fetch*` 末位 `signal?: AbortSignal` 透传；组件内 `useQuery` 内联并解构 signal；queryKey 工厂置于 API 文件末尾
- 写操作 `useMutation`，生命周期内完成缓存失效与提示；一次性命令（login / generateRoutes）直接调 API 函数，不进缓存
- 列表筛选不进 queryKey；查询/重置走「回第 1 页触发请求」

### 6.4 样式体系

- Tailwind 工具类优先；antd 组件定制用 ConfigProvider components token，必要时少量全局覆盖放 `styles/`（按主题拆文件、index.css 聚合）
- 保留两个核心 utility（与 vue3-admin 同名同义）：`h-page`（视窗高 − header − 内容 padding，列表满高布局基准）、`panel-card`（内容块卡片）
- 不引入 SCSS；`prettier-plugin-tailwindcss` 维护类名顺序

### 6.5 Mock 策略

同方案同约定：`vite-plugin-mock-dev-server` + `.env` 的 `VITE_APP_USE_MOCK` 开关（改后重启 dev server）；`mock/utils.ts` 构造 `ApiResponse` / `PaginatedData`；业务错误 HTTP 200 + `success: false`；`mock/db.ts` 最小数据源（db/utils 通过 exclude 排除）。

Phase 1 覆盖：`GetLoginVerCode`（固定验证码）、`GetTokenPC`（免校验直接发 token）、`GetUserInfo`、`GetUserRightMenu`；UpdatePwd 假成功。系统管理域 mock 随 Phase 2/3 页面补齐。

### 6.6 图标体系

- 静态：`@ant-design/icons` 直接 import + unplugin-icons（compiler: 'jsx'）生成 `IconRiXxx` 组件
- 动态（菜单/SelectIcon）：`src/icons/index.ts` 默认导出 `iconMap`（字符串 → 组件），`<DynamicIcon name />` 渲染；新增菜单图标在 ad.ts / ri.ts 同步映射（同 vue3-admin 机制）

### 6.7 共享组件（Phase 2 已落地，细则见 docs/components.md）

- **ProTable**：antd Table 薄封装——补齐 valueEnum 字典渲染（`type: 'tag'` 渲染 Tag）、`autoHeight` 满高（`scroll.y` 触发 rc-table 拆表头 + CSS flex 链 + 分页独立节点贴底）、默认 `rowKey="id"`；选择列/展开列沿用 antd 原生 `rowSelection` / `expandable`，其余 props 原样透传
- **useDialogForm**：弹窗表单 hook——`{ form, isEdit, saveMutation, pending }`；弹窗开关与编辑行由调用方 props 受控，成功统一 toast + `onSuccess` 失效缓存
- **SelectIcon**：Popover + 双标签页（antd icons / ri）图标选择器，受控 value 为字符串——待菜单管理页落地

## 7. 页面清单与占位策略（Phase 1）

| 路由        | 页面          | Phase 1 形态                    |
| ----------- | ------------- | ------------------------------- |
| /login      | 登录          | 完整（账号+验证码；二维码占位） |
| /           | dashboard     | 空白占位（仅展示页面名）        |
| /system/*   | 系统管理 5 页 | 空白占位（仅展示页面名）        |
| /error、404 | 错误页        | 完整                            |
| Header 内   | UpdatePwd     | 完整（用户菜单弹窗）            |

占位页统一形制：`<PlaceholderPage title="用户管理" />`（panel-card 内居中标题）；Phase 2/3 逐个替换页面体，**路由与菜单不动**。

Phase 2 已替换：`/sys-user-list`（账户管理）——列表页模板（筛选卡片 + 表格卡片 + 抽屉表单），页面结构与高度布局规范见 `docs/page-conventions.md`。

Phase 3 已替换：`/sys-role-list`（角色管理）、`/sys-menu-list`（菜单管理）、`/sys-org-list`（组织架构）、`/sys-log-list`（日志管理）、`/`（dashboard）——系统管理域与 dashboard 均为真实页面，占位策略不再使用。

## 8. 质量基线

- 验证：`pnpm lint` + `pnpm typecheck`（tsc --noEmit）双绿；浏览器验收 `http://localhost:4001/react-admin/`
- ESLint flat config：@eslint/js + typescript-eslint（非 type-checked 档）+ eslint-plugin-react-hooks v7（含 compiler 规则）+ react-refresh
- React 19 StrictMode 开启；React Compiler 经 @vitejs/plugin-react `compiler: true`（oxc 原生路线）启用

## 9. 文档体系

与 vue3-admin 同构的三级文档：根 AGENTS.md（导航）→ 本项目 AGENTS.md（硬约束 + 规则索引）→ docs/*.md（主题细则）。设计资产（adr/ + design.md + glossary.md）常驻 `react-admin/docs/`。

- Phase 1 落地：AGENTS.md、commands / principles / architecture / data-layer / http / utils / mock / git
- Phase 2 落地：components / page-conventions

## 10. 开放问题

1. ~~首个模板页选哪个~~ —— 已定 `system/user`（Phase 2 已交付）。
2. antd 6 CSS 变量与 Tailwind 4 preflight 的优先级细节——实施时以最小覆盖验证
3. 密码传输契约（登录 md5 / 改密 RSA）沿袭 vue3-admin 现状，fastify 定稿后两模板一并评估
4. 登录页 OTP 安全输入组件（vue3-admin 的 ImeSafeInputOtp）是否需要 1:1 复刻，还是以 antd Input 等价实现——实施登录页时按实际交互决定
