# ADR-0008：vite-plugin-mock-dev-server Mock 方案

- 状态：已接受
- 日期：2026-09-23
- 关联：ADR-0001

## 背景

vue3-admin 的 mock 采用 vite-plugin-mock-dev-server（dev server 中间件，proxy 之前拦截 `/api/*`）：Network 面板可见请求、生产构建天然无 mock、无需 Service Worker。该插件框架无关，可直接用于 React。

## 决策

- 同方案：`mockDevServerPlugin({ enabled: VITE_APP_USE_MOCK === 'true', dir: 'mock', include: ['**/*.ts'], exclude: ['**/db.ts', '**/utils.ts'] })`。
- 组织方式与 vue3-admin 一致：
  - `mock/utils.ts` — `makeResp` / `makePageResp` / `makeErrorResp` / `paginate` 响应构造器（绑定 ApiResponse / PaginatedData）
  - `mock/db.ts` — 统一数据源（Phase 1 仅最小用户/菜单数据）
  - 每个接口文件默认导出 `defineMock([...])`，`url` + `method`（大写）+ `body: ({ query, body, params, headers }) => resp`
- 业务错误一律 HTTP 200 + `success: false`（`makeErrorResp`），禁止 4xx/5xx。
- 开关：`.env` 的 `VITE_APP_USE_MOCK`（修改需重启 dev server）。

## 覆盖范围（Phase 1）

- `GetLoginVerCode`（固定验证码）、`GetTokenPC`（免校验直接返回 token）、`GetUserInfo`、`GetUserRightMenu`、`UpdatePwd`（假成功）
- 不 mock：`/Auth/logout`（store 本地重置）
- 系统管理域 mock 随 Phase 2/3 页面逐个补齐

## 理由

- 与 vue3-admin 同插件同约定，双栈联调与排查心智一致；MSW 的否决理由（Service Worker 缓存需硬刷新）继续有效。

## 后果

- mock 数据与 handler 需与 API 文件一一同名对应（auth.ts ↔ mock/auth.ts）。
- 未匹配 handler 的请求穿透到 dev proxy / 404，漏配时先比对 URL/method。

## 被否决的备选

- **MSW**：Service Worker 缓存偶发需硬刷新；dev server 中间件方案已满足 Network 可见诉求（vue3-admin 已评估否决，理由延续）。
