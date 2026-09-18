# 数据层与迁移

## 数据层结构

- `src/db/index.ts`：`pg.Pool` + drizzle 单例，**不依赖 Fastify**；连接串取 `DATABASE_URL`，池大小取 `DB_POOL_SIZE`（默认 10；生产参考 CPU 核数 × 2~4，pm2 cluster 下每进程独立计算）
- `src/db/schema.ts`：汇总出口，新表定义必须 `export *` 进来（drizzle-kit 依赖它扫描）
- `src/db/auth.schema.ts`：better-auth CLI 生成（`pnpm auth:generate`），**禁止手改**；better-auth 升级后必须重新生成并 diff 表结构
- 业务表：`src/db/*.schema.ts`，用 drizzle `pg-core` 定义；主键 `serial`，时间戳 `timestamp('...', { withTimezone: true })`，金额以「分」存 `integer`

## 模块 schema 约定（重要）

`drizzle-typebox` 0.3.x 依赖旧 `@sinclair/typebox`，与 typebox v1 的 Fastify provider 类型不兼容，**当前手写 TypeBox schema**，待其 1.0 稳定后再评估自动推导：

- `modules/*/*.schema.ts` 字段必须与 `db/*.schema.ts` 表定义一一对应，**新增/修改列需同步两处**
- 每个模块提供：请求校验 schema、响应 schema（`format: 'date-time'` 等）、查询 schema
- DB 行不得直接返回：模块提供 `toXxxDTO(row)` 做转换（Date → ISO 字符串等），routes 中统一调用

## 迁移流程与纪律

```bash
# 1. 修改 db/*.schema.ts 后生成迁移 SQL（纯 SQL，产出到 migrations/pg/）
pnpm db:generate
# 2. 人工审查生成的 SQL
# 3. 执行
pnpm db:migrate
```

- **迁移只前进不回滚**：回滚靠代码回退 + 兼容旧 schema 的过渡版本；每次迁移前备份库
- 迁移文件随包分发，可人工审查/修改后再执行
- 迁移上国产库前逐条审查（见下方方言纪律）

## SQL 方言纪律

避免 PG 专属特性，优先使用 ORM 跨方言 API：

- 避免：`jsonb` 操作符（`->`、`#>>`）、PG 数组类型、`ON CONFLICT` 特有写法
- 重点审查：`RETURNING` 子句、`timestamp with time zone` 精度与时区、序列/自增、事务隔离级别

## 国产化路线

| 路线 | 数据库 | 改动范围 |
|---|---|---|
| 默认 | PostgreSQL 14+ | 无 |
| A | 金仓 KingbaseES / openGauss（PG 系） | 建库选 PG 兼容模式；node-pg 连接串直接替换；迁移 SQL 逐条审查后执行；全量测试通过 |
| B | 达梦 DM8（独立协议） | 预定义切换方案：typeorm + typeorm-dm + dmdb；实体重写、repository 实现替换但**签名不变**、better-auth 换 typeormAdapter；service/routes **零改动**（仓储抽象的意义所在） |

Redis 替代：信创环境可用兼容产品（如 TongRDS），走 RESP 协议即可连接串替换；BullMQ 需确认目标产品对 Lua/阻塞命令的支持，不支持则队列改表轮询降级。
