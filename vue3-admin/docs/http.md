# HTTP 层

`src/utils/http/` 结构：

```
├── index.ts        # axios 实例 + 拦截器（token 注入、业务错误统一处理、HTTP 错误处理），默认导出 http，并导出 apiGet/apiPost
├── apiHelpers.ts   # createApiHelpers(http) 响应解包工厂（apiGet/apiPost，原样返回 data）
└── error.ts        # isSuccess / handleBusinessError(业务错误) / handleNetworkError(网络错误) / handleUnauthorized(401 重置并跳登录) / BusinessError
```

- 默认实例：`baseURL: config.API_BASE_URL`、`timeout: 15000`，请求拦截器注入 `Authorization: Bearer <token>`。
- `apiGet`/`apiPost` 绑定默认实例；多实例场景使用 `createApiHelpers(新实例)` 工厂。
- 后端响应约定：接口能响应时 `success: true` 业务正常，`false` 异常（错误原因在 `msg`，`code` 为业务错误码）。
- 业务错误（`success === false`）由响应拦截器统一调用 `handleBusinessError` 处理：`code === 401` 且不在 `/login` 路由时 `handleUnauthorized` 清缓存跳登录；其余 `message.error(msg)` toast。随后以 `BusinessError` reject（`handleNetworkError` 见 `BusinessError` 直接放行，避免重复 toast），调用方无需重复判断。
- 网络错误/HTTP 错误（无响应体或 HTTP 非 200）由 `error.ts` 的 `handleNetworkError` 统一处理。
- `apiGet`/`apiPost` 只做 `ApiResponse` 解包、原样返回 `data`，不再统一处理分页；分页响应（`data` 为 `{ list, total }`）由 API 函数/调用方按响应数据结构自行处理。
