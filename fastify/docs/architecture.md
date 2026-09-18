# 架构与分层

## 目录结构

```
fastify/
├── src/
│   ├── main.ts                  # 启动入口：buildApp + listen + close-with-grace 优雅停机
│   ├── app.ts                   # 应用组装：错误处理 + 插件注册（顺序敏感）+ autoload
│   ├── config/env.ts            # TypeBox 环境变量 schema（单一事实来源）
│   ├── db/                      # 数据层单例（不依赖 Fastify）
│   │   ├── index.ts             # pg.Pool + drizzle 单例
│   │   ├── schema.ts            # 汇总导出全部表定义
│   │   ├── auth.schema.ts       # better-auth CLI 生成，勿手改
│   │   └── *.schema.ts          # 业务表定义（drizzle pg-core）
│   ├── redis.ts                 # ioredis 单例（不依赖 Fastify）
│   ├── auth/index.ts            # better-auth 实例配置
│   ├── plugins/                 # env / external / db / redis / auth
│   ├── modules/                 # 业务模块（autoload 自动注册）
│   │   └── products/            # 模块四件套：schema / repository / service / routes
│   └── shared/errors.ts         # 业务错误类（BusinessError 家族）
├── tests/                       # vitest 集成测试
├── migrations/pg/               # drizzle-kit 产出（纯 SQL）
├── drizzle.config.ts / vitest.config.ts / tsconfig.json
└── .env.example / .env.test
```

**单例与插件的分工**：`db/index.ts`、`redis.ts`、`auth/index.ts` 是不依赖 Fastify 的纯单例，供 better-auth、BullMQ、脚本、测试等场外使用；`plugins/*` 负责把它们 decorate 到 Fastify 实例并经 `onClose` 管理生命周期。禁止在单例中 import Fastify 实例，避免循环依赖。

## 插件注册顺序（app.ts，顺序敏感）

| 顺序 | 插件 | 职责 |
|---|---|---|
| 1 | `plugins/env.ts` | @fastify/env 校验并注入 `fastify.config`（必须最先） |
| 2 | `plugins/external.ts` | sensible / helmet / cors（credentials: true）/ rate-limit（Redis 共享计数）/ swagger / under-pressure（`/health`） |
| 3 | `plugins/db.ts` | decorate `db` + onClose 释放连接池 |
| 4 | `plugins/redis.ts` | decorate `redis` + onClose 断开 |
| 5 | `plugins/auth.ts` | better-auth 桥接 + session 解析（见 auth.md） |
| 6 | autoload `modules/` | 仅加载 `*.routes.ts`（matchFilter），`dirNameRoutePrefix: false`，URL 前缀由各路由自行声明 |

新增插件时评估是否影响此顺序；依赖 `config` 的插件不得早于 env 注册。

## 请求处理流水线

```
请求 → Nginx（trustProxy: true 取真实 IP）
→ Fastify 路由匹配
→ [业务路由] preHandler：auth.api.getSession() → request.session（null 或会话）
→ TypeBox 校验（body/querystring/params，失败即 400，不进 handler）
→ routes：仅参数编排，调 Service
→ Service：业务逻辑、事务边界（db.transaction）
→ Repository：Drizzle 查询（唯一 SQL 出口）
→ 响应经 response schema 序列化（白名单裁剪）
→ 全局 setErrorHandler 兜底
```

认证端点 `/api/auth/*` 走独立通道，由 better-auth `auth.handler()` 处理，见 [auth.md](./auth.md)。

## 分层规则

| 层 | 职责 | 禁止事项 |
|---|---|---|
| `*.routes.ts` | 挂载 schema、编排参数、调 service、控制状态码 | 写业务逻辑、写 SQL |
| `*.service.ts` | 业务逻辑、事务编排、调 repository | 直接引用 ORM 类型 |
| `*.repository.ts` | 全部数据访问、SQL 构造 | 向 service 泄漏 Drizzle 行类型（返回 DTO） |
| `shared/` | 跨模块复用的错误、工具 | 依赖具体业务模块 |

## 新增业务模块

复制 `src/modules/products/` 四件套改内容，autoload 自动注册，**无需改 app.ts**：

1. `xxx.schema.ts`：请求/响应 TypeBox schema + `toXxxDTO`（与 `db/xxx.schema.ts` 表定义一一对应）
2. `xxx.repository.ts`：数据访问（唯一 SQL 出口）
3. `xxx.service.ts`：业务规则；资源不存在抛 `shared/errors.ts` 的 `NotFoundError` 等
4. `xxx.routes.ts`：schema 挂载 + 调 service，**default export** `satisfies FastifyPluginAsyncTypebox`

## 错误处理约定

| 场景 | 行为 |
|---|---|
| TypeBox 校验失败 | 自动 400，errorHandler 转 `{ error: 'VALIDATION_ERROR', message }` |
| 业务错误 | service 抛 `shared/errors.ts` 业务错误类（携带 statusCode/code），errorHandler 透传 |
| better-auth 错误 | auth.handler 自行返回标准错误结构，不进全局 handler |
| 未知错误 | 500 + `request.log.error`，不向客户端泄漏堆栈 |

## 已踩坑（勿回退）

- setErrorHandler 必须先于业务路由注册（autoload 子作用域快照父级 handler）
- `*.routes.ts` 必须 default export，命名导出被 autoload 静默跳过
- catch-all 路由通配符只能写 `/api/auth/*`，`*` 必须是最后一个字符（`*splat` 启动即抛错）
- `src/main.ts` 的 `import 'dotenv/config'` 必须保持最先加载（db/redis 单例立即读取 process.env）
- 生产日志 redact `req.headers.authorization` / `req.headers.cookie`，不得移除
