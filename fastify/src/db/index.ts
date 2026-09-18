import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from './schema.js'

// 单例连接池：不依赖 Fastify，供 better-auth / 脚本 / 测试场外使用
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_SIZE ?? 10),
})

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema })
export { schema }
