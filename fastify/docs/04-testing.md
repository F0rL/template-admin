# 04 测试策略

## 总体原则

- **集成测试为主**：Fastify 的 `app.inject()` 无需监听端口即可发模拟请求，覆盖「路由 → 校验 → 服务 → 仓储 → DB」全链路，性价比最高
- **单元测试补充**：纯函数逻辑（金额计算、规则判断）单独测
- **测试数据库**：集成测试连真实 PG（本地或 docker-compose 起的实例），不要 mock 掉 Drizzle——方言兼容性正是要靠测试守住的

## vitest 配置

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      // NodeNext 约定：TS 源码里 import './x.js' 指向 x.ts。
      // 测试经 Vite 解析源文件时去掉 .js 后缀，交由 extensions 匹配 .ts
      { find: /^(.*)\.js$/, replacement: '$1' },
    ],
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    // 集成测试涉及 DB/Redis，给足超时
    testTimeout: 15_000,
    hookTimeout: 15_000,
    // 内联 @fastify/autoload：其内部对路由文件的原生 Node import()
    // 会绕过 Vite（Node 只做类型剥离，不认 NodeNext 的 .js→.ts 映射），
    // 内联后动态导入经 Vite 解析，与上面的 alias 协同工作
    server: {
      deps: {
        inline: ['@fastify/autoload'],
      },
    },
  },
});
```

`tests/` 使用独立环境变量（`tests/setup.ts` 里用 dotenv 显式加载 `.env.test`，配合 `@fastify/env` 的 `data: process.env`）：

```ini
# .env.test
NODE_ENV=test
PORT=0
DATABASE_URL=postgres://postgres:postgres@localhost:5432/store_test
DB_POOL_SIZE=5
REDIS_URL=redis://:redis123@localhost:6379/1
BETTER_AUTH_SECRET=test-secret-at-least-32-characters!!
BETTER_AUTH_URL=http://localhost:3000
WEB_ORIGIN=http://localhost:5173
LOG_LEVEL=silent
```

## 集成测试骨架

```ts
// tests/helpers/app.ts —— 每个测试文件构建独立 app 实例
import { buildApp } from '../../src/app';

export async function makeApp() {
  const app = await buildApp();
  await app.ready();
  return app;
}
```

```ts
// tests/products.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { makeApp } from './helpers/app';
import { db, schema } from '../../src/db';
import { login } from './helpers/auth';

describe('products API', () => {
  let app: Awaited<ReturnType<typeof makeApp>>;

  beforeAll(async () => {
    app = await makeApp();
    // 清理本测试涉及的表（按外键顺序）
    await db.delete(schema.products);
  });

  afterAll(async () => {
    await app.close();
  });

  it('未登录创建商品 → 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/products',
      payload: { name: '测试商品', price: 1000 },
    });
    expect(res.statusCode).toBe(401);
  });

  it('参数校验失败 → 400（price 为负）', async () => {
    const { cookie } = await login(app, 'admin@example.com', 'password123');
    const res = await app.inject({
      method: 'POST',
      url: '/api/products',
      headers: { cookie },
      payload: { name: '测试商品', price: -1 },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('VALIDATION_ERROR');
  });

  it('创建成功 → 201 且响应字段被白名单裁剪', async () => {
    const { cookie } = await login(app, 'admin@example.com', 'password123');
    const res = await app.inject({
      method: 'POST',
      url: '/api/products',
      headers: { cookie },
      payload: { name: '测试商品', price: 1000, description: '描述' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('name', '测试商品');
  });
});
```

## 登录测试辅助

```ts
// tests/helpers/auth.ts
type App = Awaited<ReturnType<typeof import('./app').makeApp>>;

export async function login(app: App, email: string, password: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/sign-in/email',
    payload: { email, password },
  });
  if (res.statusCode !== 200) {
    throw new Error(`登录失败 ${res.statusCode}: ${res.body}`);
  }
  const setCookie = res.headers['set-cookie'];
  const cookie = (Array.isArray(setCookie) ? setCookie : [setCookie])
    .map((c) => c.split(';')[0])
    .join('; ');
  return { cookie };
}
```

> 测试库初始化（一次性）：
>
> 1. 建库：`docker exec dev-postgres createdb -U postgres store_test`
> 2. 建表：对 `store_test` 应用迁移 SQL（`pnpm db:migrate` 前提是 `DATABASE_URL` 指向 `store_test`，或直接 `psql -f migrations/pg/*.sql`）
> 3. seed 账号：以 `DATABASE_URL` 指向 `store_test` 临时启动服务，`POST /api/auth/sign-up/email` 创建 `admin@example.com` / `password123`（scrypt 哈希由 better-auth 生成，不建议手插表）

## 认证端点直测

better-auth 的 `/api/auth/*` 走独立通道，直接 inject 即可（空 body 场景已被自定义 content-type parser 兼容）：

```ts
it('POST /api/auth/sign-out 空 body 不报 FST 错误', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/sign-out',
    headers: { 'content-type': 'application/json' },
    payload: '',
  });
  expect([200, 401]).toContain(res.statusCode); // 不应是 500
});
```

## CI 建议

```yaml
# .github/workflows/ci.yml（GitLab CI 类似）
jobs:
  test:
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_DB: store_test, POSTGRES_PASSWORD: postgres }
      redis:
        image: redis:7
    steps:
      - run: pnpm install --frozen-lockfile
      - run: pnpm db:migrate       # 对测试库执行迁移（顺带验证迁移可跑通）
      - run: pnpm test
      - run: pnpm lint
      - run: pnpm build            # tsc 类型检查即构建产物
```

## 国产库测试矩阵（上线前执行，见 05）

在金仓/openGauss 真实实例上重复运行同一套测试（仅换 `DATABASE_URL`），重点关注：

1. `RETURNING` 子句（Drizzle `.returning()`）
2. `ON CONFLICT` 语法（如用 `onConflictDoUpdate`）
3. `timestamp with time zone` 精度与时区
4. 事务隔离级别行为
5. drizzle-kit 生成的迁移 SQL 逐条核对
