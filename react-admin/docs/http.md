# HTTP 层

`src/utils/http/` 结构：

```
├── index.ts        # axios 实例 + 拦截器（token 注入、业务错误统一处理、HTTP 错误处理），默认导出 http，并导出 apiGet/apiPost
├── apiHelpers.ts   # createApiHelpers(http) 响应解包工厂（apiGet/apiPost，原样返回 data）
└── error.ts        # isSuccess / handleBusinessError(业务错误) / handleNetworkError(网络错误) / handleUnauthorized(401 重置并跳登录) / BusinessError
```

- 默认实例：`baseURL: config.API_BASE_URL`（dev 为 `/api`，经 vite proxy 转发）、`timeout: 15000`，请求拦截器注入 `Authorization: Bearer <token>`（`useUserStore.getState()` 组件外读取）。
- `apiGet`/`apiPost` 绑定默认实例；多实例场景使用 `createApiHelpers(新实例)` 工厂。
- 后端响应约定：接口能响应时 `success: true` 业务正常，`false` 异常（错误原因在 `msg`，`code` 为业务错误码）。
- `apiGet`/`apiPost` 只做 `ApiResponse` 解包、原样返回 `data`，不统一处理分页；分页响应（`data` 为 `{ list, total }`）由 API 函数用 `PaginatedData<T>` 标注、调用方自行处理。

## 错误分类处理

| 类别 | 触发条件 | 处理方 |
| ---- | -------- | ------ |
| 业务错误 | HTTP 200 且 `success === false` | 响应拦截器 → `handleBusinessError` → reject `BusinessError` |
| HTTP 状态码错误 | HTTP 非 200 | `handleNetworkError` → 按状态码消息表 toast |
| 网络异常 | 无响应（断网/超时） | `handleNetworkError` → 「网络连接失败」toast |
| 请求取消 | signal abort（组件卸载） | `axios.isCancel` 静默，不弹 toast |

- 业务错误（`success === false`）由响应拦截器统一处理：`code === 401` 且不在 `/login` 路由时走 `handleUnauthorized`；其余 `message.error(msg)`（`res.errors` 有内容时拼接详情）。随后以 `BusinessError` reject，调用方无需重复判断。
- `handleNetworkError` 见到 `BusinessError` 直接放行（避免重复 toast）；仅负责副作用，调用方（拦截器）始终 reject，让业务层感知失败以关闭 loading 等。

## 401 处理

双入口（业务码 401 / HTTP 401）汇入 `handleUnauthorized`：

1. `isReLogging` 防重入锁，避免并发请求触发多次跳转；
2. `resetToken()`（user store）+ `resetRoutes()`（permission store）清会话；
3. `message.error` 提示；
4. 经 **navigate 桥**（`@/router/navigate`，非组件上下文）跳转 `/login`。

## signal 取消链路

```
useQuery queryFn({ signal }) → fetch*(signal) →
apiGet/apiPost(url, config) 中的 config.signal →
http.get/post(url, { ...config, signal }) → axios 原生消费
```

组件卸载时 react-query 自动 abort → axios 抛 CanceledError → `handleNetworkError` 中 `axios.isCancel` 静默处理。
