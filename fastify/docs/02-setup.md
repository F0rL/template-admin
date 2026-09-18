# 02 项目初始化

## 环境要求

| 项 | 要求 | 说明 |
|---|---|---|
| Node.js | 20 或 22 LTS | Fastify 5 最低 20；生产用官方 tar.xz 离线安装，见 05 |
| 包管理 | pnpm | 也可 npm/yarn，命令自行替换 |
| PostgreSQL | 14+ | 开发本地即可；国产化适配见 05 |
| Redis | 6+ | 会话存储 / 限流 / BullMQ |

## 初始化步骤

```bash
mkdir fastify && cd fastify
pnpm init
pnpm i fastify @fastify/env @fastify/cors @fastify/helmet @fastify/rate-limit \
  @fastify/swagger @fastify/swagger-ui @fastify/sensible @fastify/under-pressure \
  @fastify/multipart @fastify/autoload \
  typebox @fastify/type-provider-typebox drizzle-typebox \
  drizzle-orm pg better-auth ioredis bullmq close-with-grace pino-pretty

pnpm i -D typescript tsx vitest drizzle-kit @better-auth/cli @types/pg eslint prettier
```

版本约束要点：

- `@fastify/type-provider-typebox` 必须 **>= 5**（当前 6.x）才兼容 Fastify 5，低版本只支持 Fastify 4
- `typebox` 用 v1 新包名（不再是 `@sinclair/typebox`）
- 所有 `@fastify/*` 插件装 v5 兼容线（安装后用 `pnpm why fastify` 或 peerDependencies 核对）

## package.json 关键配置

```json
{
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/main.js",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "auth:generate": "better-auth-cli generate --output src/db/auth.schema.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "format": "prettier --write ."
  }
}
```

> `auth:generate` 依赖全局安装 `@better-auth/cli`，或直接用 `npx @better-auth/cli generate`。

## tsconfig.json

```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "sourceMap": true,
    "types": ["node"]
  },
  "include": ["src"]
}
```

> ESM + NodeNext 是 better-auth 官方 Fastify 集成的前提（其 TS 项目模板即此配置）。

## drizzle.config.ts

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './migrations/pg',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

## .env.example（提交到仓库，真实 .env 加入 .gitignore）

```ini
NODE_ENV=development
PORT=3000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/store
DB_POOL_SIZE=10
REDIS_URL=redis://localhost:6379
# 最少 32 字符，生产用 openssl rand -base64 32 生成
BETTER_AUTH_SECRET=please-change-me-to-32-chars-minimum!!
BETTER_AUTH_URL=http://localhost:3000
WEB_ORIGIN=http://localhost:5173
LOG_LEVEL=info
```

## 首次生成与迁移

```bash
# 1. 生成 better-auth 所需的表定义（user / session / account / verification）
npx @better-auth/cli generate --output src/db/auth.schema.ts

# 2. 将 auth.schema 并入汇总出口（见 03 文档 db/schema.ts）

# 3. 生成迁移 SQL（产出到 migrations/pg，纯 SQL 文件，可人工审查/修改）
pnpm db:generate

# 4. 执行迁移
pnpm db:migrate

# 5. 启动开发服务（热重载）
pnpm dev
```

验证：访问 `http://localhost:3000/health`（under-pressure 暴露）、`http://localhost:3000/docs`（Swagger UI）。

## 本地基础设施（可选）

根目录已有 `docker-compose.yml`，可追加 PG/Redis 服务用于本地开发；或使用已存在的实例。确保 `.env` 指向本地地址即可。

## ESLint / Prettier

- ESLint 9 flat config（`eslint.config.js`），TypeScript 项目推荐 `typescript-eslint` 预设
- Prettier 负责格式化，两者职责分离（lint 管质量，prettier 管风格）
- 参考 `vue3-admin/eslint.config.js` 已有配置风格，保持仓库一致性
