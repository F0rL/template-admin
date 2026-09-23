# ADR-0006：axios HTTP 层与 ApiResponse 契约

- 状态：已接受
- 日期：2026-09-23
- 关联：ADR-0003、ADR-0004、ADR-0008

## 背景

后端为同一 fastify 服务，响应契约不变：接口能响应时 `success: true` 正常、`false` 异常（`msg` 为原因、`code` 为业务码）。vue3-admin 的 HTTP 层（结构：`index.ts` 实例+拦截器 / `apiHelpers.ts` 解包工厂 / `error.ts` 错误处理）已验证成熟，平移。

## 决策

- 使用 `axios ^1.7`，目录结构 `src/utils/http/`：
  - `index.ts` — axios 默认实例 + 拦截器（Bearer token 注入、业务错误统一处理、网络错误处理），导出 `http` / `apiGet` / `apiPost`
  - `apiHelpers.ts` — `createApiHelpers(http)` 解包工厂，多实例场景可复用
  - `error.ts` — `isSuccess` / `handleBusinessError` / `handleNetworkError` / `handleUnauthorized` / `BusinessError`
- 默认实例：`baseURL: config.API_BASE_URL`、`timeout: 15000`。
- `apiGet/apiPost` 只做 `ApiResponse` 解包、原样返回 `data`，不统一处理分页；分页由 API 函数用 `PaginatedData<T>` 标注。
- 业务错误（`success === false`）由响应拦截器统一处理：`code === 401` 且不在登录页 → 清 store（`getState()`）+ 经 navigate 桥跳登录；其余 toast `msg`。随后以 `BusinessError` reject，调用方无需重复判断。
- 网络错误/HTTP 非 200 由 `handleNetworkError` 统一处理。

## 理由

- 契约与实现同 vue3-admin，双栈行为一致，联调排查心智一致。
- 拦截器需在非组件上下文访问 store 与跳转——axios + Zustand getState + navigate 桥满足（等价 vue3-admin 的 pinia 实例 + router）。

## 后果

- 调用方永远拿到解包后的 `data` 或 BusinessError reject。
- 反馈 toast 统一走 `utils/feedback.ts`（基于 antd App 上下文），HTTP 层不直接 import antd 静态 API。

## 被否决的备选

- **fetch 原生封装**：拦截器/取消/超时/错误归一需大量样板。
- **ky**：能力相近但无显著增益，且与 vue3-admin 不同实现，双栈排查两套心智。
