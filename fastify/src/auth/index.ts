import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin, bearer } from 'better-auth/plugins'
import { db } from '../db/index.js'
import { redis } from '../redis.js'

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [process.env.WEB_ORIGIN!],

  database: drizzleAdapter(db, {
    provider: 'pg',
  }),

  emailAndPassword: { enabled: true },

  // 会话存 Redis（校验热路径不打 DB），DB 仅存权威记录
  secondaryStorage: {
    get: async key => (await redis.get(key)) ?? null,
    set: async (key, value, ttl) => {
      if (ttl !== undefined) await redis.set(key, value, 'EX', ttl)
      else await redis.set(key, value)
    },
    delete: async key => {
      await redis.del(key)
    },
    // Redis 6.2+ 原子取值并删除
    getAndDelete: async key => await redis.getdel(key),
    // 自增并返回新值（better-auth 内部计数使用）
    increment: async key => await redis.incr(key),
  },

  // bearer：小程序/App 等无 cookie 环境使用
  // admin：用户管理/封禁/角色
  plugins: [bearer(), admin()],
})
