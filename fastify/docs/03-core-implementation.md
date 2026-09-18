# 03 核心实现

本文档给出可直接落地的代码模板。所有文件路径对应 [01-architecture.md](./01-architecture.md) 的目录结构。

## 3.1 环境配置

```ts
// src/config/env.ts —— TypeBox 定义，校验与类型一体
import { Type, type Static } from 'typebox';

export const envSchema = Type.Object({
  NODE_ENV: Type.Union([
    Type.Literal('development'),
    Type.Literal('production'),
    Type.Literal('test'),
  ]),
  PORT: Type.Number({ default: 3000 }),
  DATABASE_URL: Type.String(),
  DB_POOL_SIZE: Type.Number({ default: 10 }),
  REDIS_URL: Type.String(),
  BETTER_AUTH_SECRET: Type.String({ minLength: 32 }),
  BETTER_AUTH_URL: Type.String(),
  WEB_ORIGIN: Type.String(),
  LOG_LEVEL: Type.Optional(Type.String({ default: 'info' })),
});

export type Env = Static<typeof envSchema>;
```

```ts
// src/plugins/env.ts —— 最先注册的插件
import fp from 'fastify-plugin';
import env from '@fastify/env';
import { envSchema, type Env } from '../config/env';

export default fp(
  async (fastify) => {
    await fastify.register(env, {
      schema: envSchema,
      dotenv: true,
      data: process.env,
    });
  },
  { name: 'env' },
);

// 显式声明类型（@fastify/env 对 TypeBox schema 的自动推导不稳定）
declare module 'fastify' {
  interface FastifyInstance {
    config: Env;
  }
}
```

## 3.2 数据层（node-postgres + Drizzle）

```ts
// src/db/index.ts —— 单例，不依赖 Fastify
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_SIZE ?? 10),
});

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });
export { schema };
```

```ts
// src/db/schema.ts —— 汇总出口
export * from './auth.schema';   // better-auth CLI 生成
export * from './product.schema';
```

```ts
// src/db/product.schema.ts —— 业务表定义
import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  // 金额一律以「分」存整数，避免浮点与方言精度差异
  price: integer('price').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

```ts
// src/plugins/db.ts —— 装饰到 Fastify 并管理生命周期
import fp from 'fastify-plugin';
import { db } from '../db';
import { pool } from '../db/index';

export default fp(
  async (fastify) => {
    fastify.decorate('db', db);
    fastify.addHook('onClose', async () => {
      await pool.end();
    });
  },
  { name: 'db' },
);

declare module 'fastify' {
  interface FastifyInstance {
    db: typeof db;
  }
}
```

## 3.3 Redis 单例

```ts
// src/redis.ts
import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null, // BullMQ 要求
  lazyConnect: false,
});

redis.on('error', (err) => console.error('[redis]', err.message));
```

```ts
// src/plugins/redis.ts
import fp from 'fastify-plugin';
import { redis } from '../redis';

export default fp(
  async (fastify) => {
    fastify.decorate('redis', redis);
    fastify.addHook('onClose', async () => {
      redis.disconnect();
    });
  },
  { name: 'redis' },
);

declare module 'fastify' {
  interface FastifyInstance {
    redis: typeof redis;
  }
}
```

## 3.4 better-auth 配置

```ts
// src/auth/index.ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, bearer } from 'better-auth/plugins';
import { db } from '../db';
import { redis } from '../redis';

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [process.env.WEB_ORIGIN!],

  database: drizzleAdapter(db, {
    provider: 'pg',
    // 表名使用复数形式时需声明（按 CLI 生成的 schema 实际表名核对）
  }),

  emailAndPassword: { enabled: true },

  // 会话存 Redis（校验热路径不打 DB），DB 仅存权威记录
  secondaryStorage: {
    get: async (key) => (await redis.get(key)) ?? null,
    set: async (key, value, ttl) => {
      await redis.set(key, value, 'EX', ttl);
    },
    delete: async (key) => {
      await redis.del(key);
    },
  },

  // bearer：小程序/App 等无 cookie 环境使用
  // admin：用户管理/封禁/角色
  plugins: [bearer(), admin()],
});
```

### auth 插件（Fastify 桥接，官方模式）

```ts
// src/plugins/auth.ts
import fp from 'fastify-plugin';
import { auth } from '../auth';

export default fp(
  async (fastify) => {
    fastify.decorate('auth', auth);

    // 1) 自定义 JSON 解析器：
    //    - /api/auth 路由保留原始字符串（由 auth.handler 消费）
    //    - 其余路由正常解析，且容忍空 body（better-auth 部分接口
    //      POST 空 body + application/json，Fastify 默认会抛
    //      FST_ERR_CTP_EMPTY_JSON_BODY）
    fastify.addContentTypeParser(
      'application/json',
      { parseAs: 'string' },
      (req, body, done) => {
        if (req.url.startsWith('/api/auth')) return done(null, body);
        try {
          done(null, body.length ? JSON.parse(body) : null);
        } catch (err) {
          err.statusCode = 400;
          done(err, undefined);
        }
      },
    );

    // 2) better-auth catch-all 端点（官方 Fastify 集成模式：
    //    构造 fetch Request → auth.handler → 转发响应）
    fastify.route({
      method: ['GET', 'POST'],
      url: '/api/auth/*',
      handler: async (request, reply) => {
        const url = new URL(request.url, `http://${request.headers.host}`);
        const headers = new Headers();
        for (const [k, v] of Object.entries(request.headers)) {
          if (v == null) continue;
          headers.append(k, Array.isArray(v) ? v.join(', ') : String(v));
        }

        const req = new Request(url, {
          method: request.method,
          headers,
          // GET/HEAD 无 body；其余传原始字符串
          body:
            request.method === 'GET' || request.method === 'HEAD' || !request.body
              ? undefined
              : (request.body as string),
        });

        const response = await auth.handler(req);

        reply.status(response.status);
        // set-cookie 需取多条，避免被合并成一个头
        const setCookies = response.headers.getSetCookie?.() ?? [];
        if (setCookies.length) reply.header('set-cookie', setCookies);
        response.headers.forEach((value, key) => {
          if (key.toLowerCase() !== 'set-cookie') reply.header(key, value);
        });
        reply.send(response.body ? await response.text() : null);
      },
    });

    // 3) 业务路由 session 解析（cookie 与 Bearer 均支持）
    fastify.decorateRequest('session', null);
    fastify.addHook('preHandler', async (request) => {
      if (request.url.startsWith('/api/auth')) return;
      request.session = await auth.api.getSession({
        headers: request.headers,
      });
    });
  },
  { name: 'auth' },
);

declare module 'fastify' {
  interface FastifyInstance {
    auth: typeof auth;
  }
  interface FastifyRequest {
    session: typeof auth.$Infer.Session | null;
  }
}
```

## 3.5 外部插件（安全/文档/限流）

```ts
// src/plugins/external.ts
import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import sensible from '@fastify/sensible';
import underPressure from '@fastify/under-pressure';
import { redis } from '../redis';

export default fp(
  async (fastify) => {
    await fastify.register(sensible);

    await fastify.register(helmet, {
      // 生产经 Nginx TLS 终止，如遇问题按需调整各指令
      contentSecurityPolicy: false,
    });

    await fastify.register(cors, {
      origin: [fastify.config.WEB_ORIGIN],
      credentials: true, // cookie 会话必需
    });

    // 多进程共享计数（pm2 cluster 下必须，否则每进程独立计数）
    await fastify.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
      redis,
    });

    await fastify.register(swagger, {
      openapi: {
        info: { title: 'Store API', version: '1.0.0' },
        servers: [{ url: 'http://localhost:3000' }],
      },
    });
    await fastify.register(swaggerUI, { routePrefix: '/docs' });

    await fastify.register(underPressure, {
      maxEventLoopDelay: 1000,
      message: '服务繁忙，请稍后重试',
      exposeStatusRoute: '/health',
    });
  },
  { name: 'external' },
);
```

## 3.6 应用组装与启动

```ts
// src/app.ts
import Fastify from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import autoload from '@fastify/autoload';
import { join } from 'node:path';
import { envSchema } from './config/env';
import envPlugin from './plugins/env';
import externalPlugin from './plugins/external';
import dbPlugin from './plugins/db';
import redisPlugin from './plugins/redis';
import authPlugin from './plugins/auth';

export async function buildApp() {
  const app = Fastify({
    trustProxy: true, // Nginx 反代后取真实 IP（限流依据）
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      redact: ['req.headers.authorization', 'req.headers.cookie'],
      ...(process.env.NODE_ENV === 'development'
        ? { transport: { target: 'pino-pretty' } }
        : {}),
    },
  }).withTypeProvider<TypeBoxTypeProvider>();

  // 全局错误处理：必须先于任何业务路由注册设置，
  // autoload 子作用域在创建时快照父级 handler，后设置的不会被继承
  app.setErrorHandler((error, request, reply) => {
    if (error.validation) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: error.message,
      });
    }
    const statusCode = error.statusCode ?? 500;
    if (statusCode >= 500) request.log.error(error);
    return reply.status(statusCode).send({
      error: statusCode >= 500 ? 'INTERNAL_ERROR' : error.code ?? error.name,
      message: statusCode >= 500 ? '服务器内部错误' : error.message,
    });
  });

  // 注册顺序敏感：env 最先，auth 在业务路由前
  await app.register(envPlugin, { schema: envSchema });
  await app.register(externalPlugin);
  await app.register(dbPlugin);
  await app.register(redisPlugin);
  await app.register(authPlugin);

  // 业务模块自动注册（仅加载 *.routes.ts；routes 文件必须 default export）
  await app.register(autoload, {
    dir: join(import.meta.dirname, 'modules'),
    dirNameRoutePrefix: false, // 前缀由各模块路由自行声明
    matchFilter: /.*\.routes\.(ts|js)$/,
  });

  return app;
}
```

```ts
// src/main.ts
import closeWithGrace from 'close-with-grace';
import { buildApp } from './app';

const app = await buildApp();

closeWithGrace({ delay: 10_000 }, async ({ err }) => {
  if (err) app.log.error(err);
  await app.close(); // 触发各插件 onClose（释放连接池/断开 Redis）
});

await app.listen({ port: app.config.PORT, host: '0.0.0.0' });
```

## 3.7 业务模块四件套（以 products 为例）

```ts
// src/modules/products/product.schema.ts
import { Type, type Static } from 'typebox';
import { createInsertSchema, createSelectSchema } from 'drizzle-typebox';
import { products } from '../../db/schema';

// 从 Drizzle 表推导基础结构，再叠加业务约束（避免手写两遍）
export const productInsertSchema = createInsertSchema(products, {
  name: Type.String({ minLength: 1, maxLength: 200, description: '商品名' }),
  price: Type.Integer({ minimum: 0, description: '价格（分）' }),
  description: Type.Optional(Type.String({ maxLength: 2000 })),
});

export const productSelectSchema = createSelectSchema(products);

export const productListQuerySchema = Type.Object({
  page: Type.Number({ minimum: 1, default: 1 }),
  pageSize: Type.Number({ minimum: 1, maximum: 100, default: 20 }),
});

export type ProductInsert = Static<typeof productInsertSchema>;
export type Product = Static<typeof productSelectSchema>;
```

```ts
// src/modules/products/product.repository.ts —— 唯一 SQL 出口
import { desc } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
import { products } from '../../db/schema';
import type { ProductInsert } from './product.schema';
import type { FastifyInstance } from 'fastify';

export class ProductRepository {
  constructor(private readonly db: FastifyInstance['db']) {}

  async create(input: ProductInsert) {
    const [row] = await this.db.insert(products).values(input).returning();
    return row;
  }

  async findById(id: number) {
    const [row] = await this.db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);
    return row ?? null;
  }

  async findPage(offset: number, limit: number) {
    return this.db
      .select()
      .from(products)
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset);
  }
}
```

```ts
// src/modules/products/product.service.ts
import type { FastifyInstance } from 'fastify';
import { ProductRepository } from './product.repository';
import type { ProductInsert } from './product.schema';

export class ProductService {
  private readonly repository: ProductRepository;

  constructor(db: FastifyInstance['db']) {
    this.repository = new ProductRepository(db);
  }

  create(input: ProductInsert) {
    // 业务规则在此扩展（如名称重复校验、分类权限等）
    return this.repository.create(input);
  }

  async findOne(id: number) {
    const product = await this.repository.findById(id);
    if (!product) {
      const err = new Error('商品不存在') as Error & { statusCode: number };
      err.statusCode = 404;
      throw err;
    }
    return product;
  }

  findPage(page: number, pageSize: number) {
    return this.repository.findPage((page - 1) * pageSize, pageSize);
  }
}
```

```ts
// src/modules/products/product.routes.ts
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import {
  productInsertSchema,
  productSelectSchema,
  productListQuerySchema,
} from './product.schema';
import { ProductService } from './product.service';

const productRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  const service = new ProductService(fastify.db);

  fastify.get('/api/products', {
    schema: {
      querystring: productListQuerySchema,
      // 响应白名单：未声明字段自动裁剪，防敏感字段泄漏
      response: { 200: Type.Array(productSelectSchema) },
    },
  }, async (request) => {
    const { page, pageSize } = request.query;
    return service.findPage(page, pageSize);
  });

  fastify.post('/api/products', {
    // 需要登录的接口：preHandler 检查 session
    preHandler: async (request, reply) => {
      if (!request.session) return reply.unauthorized();
    },
    schema: {
      body: productInsertSchema,
      response: { 201: productSelectSchema },
    },
  }, async (request, reply) => {
    const created = await service.create(request.body);
    reply.code(201);
    return created;
  });
};

// @fastify/autoload 只消费 default export，命名导出会被静默跳过
export default productRoutes satisfies FastifyPluginAsyncTypebox;
```

> 上面 `Type.Array` 需从 `typebox` 导入；routes 文件头部补充 `import { Type } from 'typebox'`。

## 3.8 前端对接

- Swagger UI：`GET /docs`
- OpenAPI JSON：`GET /docs/json` —— 下载后替换 `vue3-admin/src/api/swagger.json`，执行其 `scripts/gen-api.js` 生成前端 API 客户端（沿用现有流程）
- 也可用 `@hey-api/openapi-ts` 生成更完整的 TS 客户端
