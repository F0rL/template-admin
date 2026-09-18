# AGENTS.md — fastify 后端

技术栈：Fastify 5 + TypeBox (v1) + @fastify/type-provider-typebox + Drizzle (node-postgres) + better-auth + ioredis/BullMQ + vitest，ESM + NodeNext；部署目标 Linux（含信创环境与国产数据库预案）。

开始任何编码/修改任务前，必须先读本文件，再按下方索引表用 Read 读取与任务相关的 `docs/*.md`；详细规则以 docs 内容为准，本文件仅作导航与硬约束速览。

## 硬约束（项目特有）

1. **仓储层隔离**：所有 SQL/Drizzle 调用只允许出现在 `*.repository.ts`（及 `db/` 单例）；service/routes 不得直接引用 ORM/驱动类型。这是国产数据库切换成本最低的关键保障
2. **SQL 方言纪律**：避免 PG 专属特性（`jsonb` 操作符、数组类型、`ON CONFLICT` 特有写法），优先使用 ORM 跨方言 API；迁移 SQL 上国产库前必须逐条审查
3. `*.routes.ts` 必须 **default export**（@fastify/autoload 只消费 default export，命名导出会被静默跳过，无报错）
4. 相对导入必须带 `.js` 后缀（NodeNext 约定：`import './x.js'` 指向 `x.ts`）
5. 全局 `setErrorHandler` 必须先于任何业务路由注册（autoload 子作用域创建时快照父级 handler，后设置不会被继承）
6. 业务模块 schema 与表定义**一一对应、两处同步**：drizzle-typebox 与 typebox v1 暂不兼容，`modules/*/*.schema.ts` 为手写，新增列需同步 `db/*.schema.ts` 与模块 schema
7. 金额一律以「分」存整数；时间戳统一 `timestamp with time zone`
8. 响应必须挂 `response` schema 白名单（未声明字段自动裁剪，防敏感字段泄漏）；DB 行经 `toXxxDTO` 转换后再返回

## 规则索引（最高优先级）

| 主题 | 文件 | 何时读取 |
|---|---|---|
| 命令与环境 | [docs/commands.md](./docs/commands.md) | 任何编码任务开始前 |
| 架构与分层 | [docs/architecture.md](./docs/architecture.md) | 新增/修改模块、插件、错误处理 |
| 数据层与迁移 | [docs/data-layer.md](./docs/data-layer.md) | 涉及表定义、查询、迁移、国产库适配 |
| 认证与会话 | [docs/auth.md](./docs/auth.md) | 涉及登录/会话/权限/better-auth |
| 测试 | [docs/testing.md](./docs/testing.md) | 编写或运行测试 |
| 部署 | [docs/deployment.md](./docs/deployment.md) | 构建、发布、信创环境适配 |
