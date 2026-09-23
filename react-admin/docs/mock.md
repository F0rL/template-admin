# Mock

Mock 由 **vite-plugin-mock-dev-server** 实现：`vite.config.ts` 中

```ts
mockDevServerPlugin({
  enabled: env.VITE_APP_USE_MOCK === 'true',
  dir: 'mock',
  include: ['**/*.ts'],
  exclude: ['**/db.ts', '**/utils.ts'],
})
```

以 dev server 中间件在 proxy 之前拦截 `/api/*` 请求。

- **开关**：`.env.development` 的 `VITE_APP_USE_MOCK`（`true`/`false`），修改后需重启 dev server。
- **切换真实后端**：`VITE_APP_USE_MOCK=false` 后 `/api` 请求穿透到 `server.proxy`，转发至 `VITE_APP_BASE_API`。
- **生效范围**：仅 dev server；生产构建/`vite preview` 天然无 mock，无需 tree-shake 机制。
- **网络可见**：请求真实发出到 dev server，Network 面板可见请求/响应。
- **include/exclude 说明**：插件默认 include 仅匹配 `*.mock.ts` 等带 `.mock.` 的文件名，本项目沿用原文件名故显式放开；`db.ts`/`utils.ts` 是纯数据源/工具模块（无 `defineMock` 默认导出），必须 exclude——若被扫到，插件会把其命名导出误当作 mock 配置产生幽灵项，遮蔽后续 handler（表现为空响应）。

## 组织（三件套）

```
mock/
├── auth.ts    # defineMock：登录链路 5 个端点的 handler
├── db.ts      # 统一数据源：CAPTCHA_BASE64 / MOCK_CAPTCHA_KEY / mockUser / userMenus
└── utils.ts   # makeResp / makePageResp / makeErrorResp / paginate（响应结构构造器）
```

- 每个接口文件默认导出 `defineMock([...])`（自 `vite-plugin-mock-dev-server` 具名导入），插件自动聚合目录内全部文件（无 index.ts）；新增 mock 数据先进 `db.ts`，再由 handler 取用。
- 接口项声明：`url`（**必须带 `/api` 前缀**，与 `config.API_BASE_URL` 对齐）+ `method`（**大写** `'GET' | 'POST'`）+ `body: () => ResponseBody`（常规 JSON 响应用 `body`，不用低层 `response` 字段）。
- 响应必须经 `utils.ts` 构造器绑定 API 层类型（`ApiResponse<T>` / `PaginatedData<T>`，见 `src/types/global.d.ts`）；业务错误一律 HTTP 200 + `success:false`（`makeErrorResp`），禁止 4xx/5xx。
- `db.ts` 的菜单树 `userMenus`：`path` 与 `src/router/modules/` 的路由 path 对齐，`icon` 键名与 `src/icons` 的 iconMap 对齐（均无前导斜杠）。

## 覆盖范围（Phase 1 仅 auth）

对齐 `src/api/system/auth.ts` 的五个端点：

- `GetLoginVerCode`：固定验证码（base64 图片 + key）。
- `GetTokenPC`：**免校验**——不校验账号密码/验证码，任意参数直接返回 `mock-token-${Date.now()}`（浏览器验收时任意输入可登录，OTP 输满自动提交）。
- `GetUserInfo` / `GetUserRightMenu`（GET）：静态数据（db.ts）。
- `SysUser/UpdatePwd`：**假成功**——返回成功结构但前端随即 resetToken + 跳 `/login`，属预期行为。

**硬约束**：Phase 1 仅 auth 模块带 mock；新业务模块默认不使用 mock，直接联调真实后端。

## 排查

未匹配 handler 的请求会穿透到 dev proxy/404，无显式报错；mock 漏配时先比对 URL（注意 `/api` 前缀）与 method（大写）和 `mock/*.ts` 中的 handler 定义。
