# 01 架构设计

## 部署架构总览

```
                      ┌───────────────────────────────────────┐
                      │           Nginx（TLS 终止/反代）         │
                      └──────────────────┬────────────────────┘
                                         │
              ┌──────────────────────────▼──────────────────────────┐
              │           pm2 cluster（Node 20/22 LTS，多进程）        │
              │  ┌─────────────────────────────────────────────────┐ │
              │  │ Fastify 5 实例                                    │ │
              │  │  ├─ helmet / cors / rate-limit(Redis 共享计数)    │ │
              │  │  ├─ under-pressure（过载保护 + /health）           │ │
              │  │  ├─ TypeBox schema：请求校验 + 响应序列化白名单     │ │
              │  │  ├─ better-auth（/api/auth/* 认证端点）           │ │
              │  │  ├─ preHandler：session 解析挂载                  │ │
              │  │  └─ modules/*（路由 → 服务 → 仓储）                │ │
              │  └─────────────────────────────────────────────────┘ │
              └──────────┬──────────────────────────────┬─────────────┘
                         │                              │
            ┌────────────▼────────────┐    ┌────────────▼────────────┐
            │  PostgreSQL             │    │  Redis                   │
            │  （国产化切换点：金仓/     │    │  缓存 / better-auth 会话  │
            │   openGauss / 达梦*）     │    │  / 限流计数 / BullMQ 队列 │
            └─────────────────────────┘    └─────────────────────────┘
                                   * 达梦走 TypeORM 备选方案，见 05-deployment.md
```

## 目录结构

```
fastify/
├── docs/                          # 本文档
├── src/
│   ├── main.ts                    # 启动入口：buildApp + listen + 优雅停机
│   ├── app.ts                     # 应用组装：插件注册（顺序敏感）+ 全局错误处理
│   ├── config/
│   │   └── env.ts                 # TypeBox 环境变量 schema（单一事实来源）
│   ├── db/
│   │   ├── index.ts               # pg.Pool + drizzle 单例（不依赖 Fastify）
│   │   ├── schema.ts              # 汇总导出全部表定义
│   │   ├── auth.schema.ts         # better-auth CLI 生成（勿手改）
│   │   └── product.schema.ts      # 业务表定义（drizzle pg-core）
│   ├── redis.ts                   # ioredis 单例（不依赖 Fastify）
│   ├── auth/
│   │   └── index.ts               # better-auth 实例配置
│   ├── plugins/
│   │   ├── env.ts                 # @fastify/env 注册（最先）
│   │   ├── external.ts            # cors / helmet / rate-limit / swagger / sensible
│   │   ├── db.ts                  # decorate('db') + onClose 释放连接池
│   │   ├── redis.ts               # decorate('redis') + onClose 断开
│   │   └── auth.ts                # better-auth 路由挂载 + session 解析钩子
│   ├── modules/                   # 业务模块（autoload 自动注册）
│   │   └── products/
│   │       ├── product.schema.ts      # TypeBox schema（drizzle-typebox 推导）
│   │       ├── product.repository.ts  # 仓储：唯一允许出现 ORM 调用的地方
│   │       ├── product.service.ts     # 服务：业务逻辑
│   │       └── product.routes.ts      # 路由：schema 挂载 + 调用服务
│   └── shared/
│       └── errors.ts              # 业务错误类型
├── tests/                         # vitest 测试
├── migrations/
│   └── pg/                        # drizzle-kit 产出（上国产库前逐条审查）
├── drizzle.config.ts
├── vitest.config.ts
├── tsconfig.json
└── package.json
```

**单例与插件的分工**：`db/index.ts`、`redis.ts`、`auth/index.ts` 是不依赖 Fastify 的纯单例，供 better-auth、BullMQ、脚本等场外使用；`plugins/*` 负责把它们装饰到 Fastify 实例并管理生命周期（`onClose`）。这样避免循环依赖，也让测试可以独立构建 app。

## 请求处理流水线

```
请求
 → Nginx（trustProxy：true，取真实 IP）
 → Fastify 路由匹配
 → [业务路由] preHandler：auth.api.getSession() → request.session（null 或会话）
 → TypeBox 校验（body / querystring / params，失败即 400，不进 handler）
 → 路由 handler：仅做参数编排，调用 Service
 → Service：业务逻辑、事务边界
 → Repository：Drizzle 查询（唯一 SQL 出口）
 → 响应经 response schema 序列化（未声明的字段自动裁剪，防敏感字段泄漏）
 → 全局 setErrorHandler 兜底（校验错误 400 / 业务错误透传 / 未知错误 500）
```

认证端点（`/api/auth/*`）走独立通道：由 better-auth 的 `auth.handler()` 处理，Fastify 仅做桥接（见 03 文档 auth 插件实现）。

## 分层规则

| 层 | 职责 | 禁止事项 |
|---|---|---|
| routes | 挂载 schema、编排参数、调 service、控制状态码 | 写业务逻辑、写 SQL |
| service | 业务逻辑、事务编排（`db.transaction`）、调 repository | 直接引用 ORM 类型 |
| repository | 全部数据访问、SQL 构造 | 泄漏 Drizzle 类型到签名之外 |
| shared | 跨模块复用的 schema、错误、工具 | 依赖具体模块 |

新增模块 = 复制 `modules/products` 四件套改内容，`@fastify/autoload` 自动注册，无需改 app.ts。

## 会话与认证架构

- **Web 端（vue3-admin）**：better-auth 默认 cookie session；`secondaryStorage` 指向 Redis，DB 仅存权威记录，校验热路径不打数据库
- **多端（小程序/App）**：启用 `bearer` 插件，`Authorization: Bearer <token>` 同样走 `auth.api.getSession()`
- **封禁/踢线**：DB session 原生支持吊销（这是放弃自建 JWT 的核心理由）
- **权限**：admin 插件提供用户管理/封禁/角色；业务级 RBAC 在 service 层基于 `session.user` 扩展

## 错误处理约定

| 场景 | 行为 |
|---|---|
| TypeBox 校验失败 | Fastify 自动 400，errorHandler 转成 `{ error: 'VALIDATION_ERROR', message }` |
| 业务错误 | service 抛 `shared/errors.ts` 中的业务错误类（携带 statusCode） |
| better-auth 错误 | 由 auth.handler 自行返回标准错误结构，不进全局 handler |
| 未知错误 | 500 + 记录 error 日志，不泄漏堆栈给客户端 |
