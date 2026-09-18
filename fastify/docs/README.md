# Fastify 5 后端实施文档（store 项目）

本目录是后端服务的完整实施文档。技术栈基于历史选型评审确定：**Fastify 5 + TypeBox + Drizzle + better-auth**，部署目标为 Linux 服务器（含信创环境）。

## 文档索引

| 文档 | 内容 |
|---|---|
| [01-architecture.md](./01-architecture.md) | 架构设计、目录结构、分层规则、数据流 |
| [02-setup.md](./02-setup.md) | 环境要求、项目初始化、配置文件、首次运行 |
| [03-core-implementation.md](./03-core-implementation.md) | 核心代码模板：db / redis / auth / 插件 / 模块四件套 |
| [04-testing.md](./04-testing.md) | 测试策略与示例（vitest + app.inject） |
| [05-deployment.md](./05-deployment.md) | Linux 部署、信创专项、国产数据库预案、上线验证清单 |

## 技术栈总览

| 分层 | 选型 | 版本约束 | 备选（触发条件见 05） |
|---|---|---|---|
| 运行时 | Node.js LTS | 20/22（Fastify 5 最低要求 20） | — |
| 框架 | fastify | ^5 | — |
| 类型校验 | typebox + @fastify/type-provider-typebox | typebox ^1；provider **>=5 才兼容 Fastify 5** | Zod 4（前端共享 schema 时） |
| ORM | drizzle-orm + drizzle-kit | 稳定版 | TypeORM（达梦立项时） |
| PG 驱动 | pg（node-postgres） | — | postgres.js（不建议，见审核记录） |
| 认证 | better-auth | ^1 | — |
| 缓存/队列 | ioredis + bullmq | — | — |
| 限流/安全 | @fastify/rate-limit / helmet / cors | v5 兼容版 | — |
| API 文档 | @fastify/swagger + swagger-ui | v5 兼容版 | — |
| 进程管理 | pm2（cluster） | 生产全局安装 | systemd |
| 开发工具 | tsx / vitest / eslint 9 + prettier / pnpm | — | — |

## 审核记录（2026-09，方案定稿前修正项）

| # | 修正 | 原因 |
|---|---|---|
| 1 | better-auth 集成采用官方 `auth.handler()` + fetch Request 模式，并自定义 content-type parser 容忍空 JSON body | 弃用 `toNodeHandler` 裸流桥接：Fastify 默认 body parser 会先消费请求流导致冲突；且空 body + `application/json` 会被 Fastify 抛 `FST_ERR_CTP_EMPTY_JSON_BODY` |
| 2 | PG 驱动由 postgres.js 改为 node-postgres（pg） | 金仓官方文档演示走 node-pg 连接；openGauss 为 PG 9.2 内核衍生，postgres.js 自实现的扩展协议特性存在兼容风险 |
| 3 | 移除 bcryptjs | better-auth 内置 scrypt 密码哈希，无需额外哈希库 |
| 4 | 确认 @fastify/type-provider-typebox >= 5（当前 6.x）与 Fastify 5 兼容 | 官方兼容表：provider >=5.x ↔ fastify ^5.x |
| 5 | catch-all 路由写法为 `/api/auth/*`（`*` 必须是最后一个字符） | Fastify 5.12 搭配 find-my-way 9.9 不支持 `*splat` 命名通配符（该语法属其他路由器），写成 `*splat` 启动即抛 `Wildcard must be the last character` |
| 6 | `*.routes.ts` 必须以 default export 导出插件 | @fastify/autoload 只消费 default export，命名导出会被静默跳过（路由不注册、无报错） |
| 7 | `setErrorHandler` 移到所有路由注册之前 | autoload 子作用域创建时快照父级 handler，事后在根实例上设置的错误处理不会被业务路由继承 |
| 8 | vitest 配置加 `resolve.alias`（剥 `.js` 后缀）+ `server.deps.inline: ['@fastify/autoload']` | autoload 检测到 vitest 后用原生 Node `import()` 加载 `.ts` 路由文件，绕过 Vite；Node 类型剥离不认 NodeNext 的 `.js → .ts` 导入映射 |

## 与前端（vue3-admin）的对接

前端项目已有 `scripts/gen-api.js` 从 `swagger.json` 生成 API 客户端的流程。本后端通过 `@fastify/swagger` 暴露 `/docs/json`（OpenAPI JSON），可直接接入该生成流程，无需引入 tRPC 等额外耦合。

## 两条硬约束（贯穿所有开发工作）

1. **仓储层隔离**：所有数据库访问只允许出现在 `*.repository.ts` 中，业务层不得直接引用 ORM/驱动类型。这是国产数据库切换成本最低的关键保障。
2. **SQL 方言纪律**：避免 PG 专属特性（`jsonb` 操作符、数组类型、`ON CONFLICT` 特有写法），优先使用 ORM 跨方言 API。迁移 SQL 上国产库前必须逐条审查。
