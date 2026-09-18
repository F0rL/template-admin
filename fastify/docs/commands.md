# 命令与环境

## 命令表

| 命令 | 用途 |
|---|---|
| `pnpm dev` | 开发服务（tsx watch，热重载） |
| `pnpm build` | tsc 编译到 `dist/`（类型检查即构建） |
| `pnpm start` | 运行 `dist/main.js`（需先 build） |
| `pnpm typecheck` | `tsc --noEmit` 类型检查 |
| `pnpm lint` | ESLint 检查 |
| `pnpm format` | Prettier 格式化 |
| `pnpm test` / `pnpm test:watch` | vitest 集成测试 |
| `pnpm db:generate` | drizzle-kit 生成迁移 SQL（产出 `migrations/pg/`） |
| `pnpm db:migrate` | 执行迁移 |
| `pnpm auth:generate` | better-auth CLI 重新生成 `src/db/auth.schema.ts`（依赖 `npx @better-auth/cli`） |

改完代码的验证顺序：`pnpm typecheck` → `pnpm lint` → `pnpm test`。

## 环境文件

- `.env`：本地真实配置，**不入库**；从 `.env.example` 复制创建
- `.env.example`：模板，入库维护；`BETTER_AUTH_SECRET` 最少 32 字符
- `.env.test`：测试专用（`store_test` 库、Redis db 1、`LOG_LEVEL=silent`），由 `tests/setup.ts` 显式加载

环境变量 schema 的单一事实来源是 `src/config/env.ts`（TypeBox）；新增变量必须同步三处：`config/env.ts`、`.env.example`、必要时 `.env.test`。

## 本地基础设施

根目录 `docker-compose.yml` 提供 PostgreSQL 16（库 `store`，账号 postgres/postgres）、Redis 7（密码 `redis123`）、MySQL 8（备用），端口仅绑定 127.0.0.1。

## 首次运行

```bash
cp .env.example .env
docker compose -f ../docker-compose.yml up -d postgres redis
npx @better-auth/cli generate --output src/db/auth.schema.ts   # 已生成则跳过
pnpm db:generate
pnpm db:migrate
pnpm dev
```

验证：`GET http://localhost:3000/health` 返回 200；`http://localhost:3000/docs` 打开 Swagger UI。

## 测试库初始化（一次性）

1. 建库：`docker exec dev-postgres createdb -U postgres store_test`
2. 建表：`DATABASE_URL` 指向 `store_test` 后 `pnpm db:migrate`
3. seed 账号：临时以测试库启动服务，`POST /api/auth/sign-up/email` 创建测试账号（密码哈希由 better-auth 生成，**不要手插表**）

## 与前端对接

后端经 `@fastify/swagger` 暴露 OpenAPI JSON（`GET /docs/json`）。前端流程：下载该 JSON 替换 `vue3-admin/src/api/swagger.json`，在 vue3-admin 执行 `pnpm gen:api` 生成 API 客户端。
