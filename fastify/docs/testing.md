# 测试

## 原则

- **集成测试为主**：Fastify `app.inject()` 无需监听端口即可发模拟请求，覆盖「路由 → 校验 → 服务 → 仓储 → DB」全链路
- **不要 mock 掉 Drizzle**：集成测试连真实 PG/Redis（docker-compose 实例），方言兼容性正是要靠测试守住的
- 单元测试仅补充纯函数逻辑

## vitest 配置（vitest.config.ts，关键点勿删）

- `resolve.alias`：`/^(.*)\.js$/ → $1`——NodeNext 下源码 `import './x.js'` 指向 `x.ts`，经 Vite 解析时需剥掉 `.js` 后缀
- `server.deps.inline: ['@fastify/autoload']`——autoload 内部用原生 Node `import()` 加载路由文件会绕过 Vite，内联后动态导入经 Vite 解析，与 alias 协同
- `testTimeout` / `hookTimeout` 15s（集成测试涉及 DB/Redis）

## 测试环境

- `tests/setup.ts`：先于一切测试代码 `config({ path: '.env.test' })`，配合 `@fastify/env` 的 `data: process.env` 生效；`.env.test` 指向 `store_test` 库、Redis db 1、`LOG_LEVEL=silent`
- 测试库初始化步骤见 [commands.md](./commands.md)

## 编写约定

- 每个测试文件经 `tests/helpers/app.ts` 的 `makeApp()` 构建独立 app 实例，`beforeAll` 中清理本测试涉及的表（按外键顺序），`afterAll` 中 `app.close()`
- 登录用 `tests/helpers/auth.ts` 的 `login()`，请求头带 `{ cookie }`
- 校验失败断言 `res.json().error === 'VALIDATION_ERROR'`
- 认证端点直测：直接 inject `/api/auth/*`；空 body + `application/json` 不应 500（兼容性回归点）
- 示例参考 `tests/products.test.ts`

## CI

顺序：`pnpm install --frozen-lockfile` → `pnpm db:migrate`（对测试库，顺带验证迁移可跑通）→ `pnpm test` → `pnpm lint` → `pnpm build`；services 提供 postgres:16 与 redis:7。

## 国产库测试矩阵（上线前执行）

在金仓/openGauss 真实实例上换 `DATABASE_URL` 重跑同一套测试，重点关注：

1. `RETURNING` 子句（Drizzle `.returning()`）
2. `ON CONFLICT` 语法（如用 `onConflictDoUpdate`）
3. `timestamp with time zone` 精度与时区
4. 事务隔离级别行为
5. drizzle-kit 生成的迁移 SQL 逐条核对
