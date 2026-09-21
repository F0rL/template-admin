# Mock

Mock 由 **vite-plugin-mock-dev-server**（devDependencies，2.4.x）实现：`vite.config.ts` 中 `mockDevServerPlugin({ enabled: env.VITE_APP_USE_MOCK === 'true', dir: 'mock', include: ['**/*.ts'], exclude: ['**/db.ts', '**/utils.ts'] })`，以 dev server 中间件在 proxy 之前拦截 `/api/*` 请求（插件自动读取 `server.proxy` 的前缀）。

- **开关**：`.env` 的 `VITE_APP_USE_MOCK`（`true`/`false`），修改后需重启 dev server。
- **生效范围**：仅 dev server；生产构建/`vite preview` 天然无 mock，无需 tree-shake 机制。
- **网络可见**：请求真实发出到 dev server，Network 面板可见请求/响应。

## 组织（controller 镜像）

```
mock/                  # 根目录，插件 dir
├── utils.ts           # makeResp<T>/makePageResp/makeErrorResp/paginate（响应结构构造器）
├── db.ts              # 统一数据源（部门树/用户/角色/菜单/日志/验证码）
├── auth.ts / sysUser.ts / sysRole.ts / sysMenu.ts
├── sysLog.ts / sysFile.ts / wxWork.ts   # 与 src/api/system/*.ts 一一同名对应
```

- 每个接口文件默认导出 `defineMock([...])`（自 `vite-plugin-mock-dev-server` 具名导入），插件自动聚合目录内全部文件（无 `index.ts`）；`db.ts`/`utils.ts` 是纯数据源/工具模块（无 `defineMock` 导出），必须通过 `exclude` 排除——若被 `include` 扫到，插件会将其命名导出误当作 mock 配置产生幽灵项，遮蔽后续 handler（表现为空响应）。
- 接口项声明：`url` + `method`（**大写** `'GET' | 'POST'`，默认同时允许 GET+POST）+ `body: ({ query, body, params, headers }) => ResponseBody`（上下文为插件内置 `MockRequest`）；插件的 `response` 字段是低层 middleware，常规 JSON 响应一律用 `body`。
- 响应必须经 `utils.ts` 构造器绑定 API 层类型（`ApiResponse<T>` / `PaginatedData<T>`，见 `src/types/global.d.ts`）；业务错误一律 HTTP 200 + `success:false`（`makeErrorResp`），禁止 4xx/5xx。
- `db.ts` 以部门树为规范源，用户/角色/菜单/日志实体集中维护；新增 mock 数据先进 db，再由 handler 取用。

## 覆盖范围

- **登录链路**：`GetLoginVerCode`（固定验证码）、`GetTokenPC`（**免校验**——不校验账号密码/验证码，任意参数直接返回 token）、`GetUserInfo`、`GetUserRightMenu`（GET）。
- **查询接口**：全部 `fetch*` 列表/树/详情，返回完整结构化数据；分页按 `page`/`rows` 参数切片（WxWork 为 `row`）。
- **写操作**：create/update/delete/reset/Upload/UpdatePwd **假成功**——返回成功结构但不改 db 数据，刷新后回到初始态（预期行为，不是 bug）。
- **不 mock**：`/Auth/logout`（store 本地重置）；SysFile 的 List/Entity/Del（响应类型未定型）。

## 排查

未匹配 handler 的请求会穿透到 dev proxy/404，无显式报错；mock 漏配时先比对 URL/method 与 `mock/*.ts` 中的 handler 定义（注意 method 为大写）。
