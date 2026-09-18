# 认证与会话（better-auth）

## 实例配置（src/auth/index.ts）

- `drizzleAdapter(db, { provider: 'pg' })` 接 `db` 单例；表名与 `db/auth.schema.ts`（CLI 生成）核对
- `emailAndPassword: { enabled: true }`
- **`secondaryStorage` 指向 Redis**：会话校验热路径不打数据库，DB 仅存权威记录（这是放弃自建 JWT 的核心理由之一：DB session 原生支持吊销/封禁/踢线）
- 插件：`bearer()`（小程序/App 等无 cookie 环境，`Authorization: Bearer <token>`）、`admin()`（用户管理/封禁/角色）
- `trustedOrigins` 取 `WEB_ORIGIN`

业务级 RBAC 在 service 层基于 `request.session.user` 扩展，不引入额外中间件。

## Fastify 桥接（src/plugins/auth.ts，唯一参考实现）

改动此文件前必须理解以下设计，均为踩坑产物，**勿回退**：

1. **自定义 JSON content-type parser**：
   - `/api/auth` 前缀的路由保留原始字符串 body（由 auth.handler 消费）
   - 其余路由正常解析且**容忍空 body**：better-auth 部分接口 POST 空 body + `application/json`，Fastify 默认抛 `FST_ERR_CTP_EMPTY_JSON_BODY`
2. **catch-all 端点**：`/api/auth/*`（`*` 必须是最后一个字符）→ 构造 fetch `Request` → `auth.handler(req)` → 转发响应；`set-cookie` 必须用 `getSetCookie()` 取多条转发，避免被合并成一个头
3. **session 解析**：`decorateRequest('session', null)` + 全局 `preHandler` 调 `auth.api.getSession({ headers })`（cookie 与 Bearer 均支持），跳过 `/api/auth` 自身

`request.session` 类型为 `auth.$Infer.Session | null`；需要登录的接口在路由级 `preHandler` 检查 `!request.session` 后 `reply.unauthorized()`（@fastify/sensible）。

## 业务错误

service 层抛 `src/shared/errors.ts` 的错误类（`BusinessError` 基类，含 `NotFoundError` / `UnauthorizedError` / `ForbiddenError`），由全局 errorHandler 透传 statusCode 与 code；不要在 auth 相关代码里自造带 statusCode 的裸 Error。

## 升级纪律

better-auth 升级后必须重新 `pnpm auth:generate` 并 diff `auth.schema.ts` 与迁移；升级后跑全量测试（含认证端点直测，见 testing.md）。

## 测试辅助

`tests/helpers/auth.ts` 提供 `login(app, email, password)`：inject `/api/auth/sign-in/email` 后拼接 set-cookie 返回 `{ cookie }`；认证端点可直测（空 body 场景已被 content-type parser 兼容，不应出现 500）。
