import { Redis } from 'ioredis'

// 单例：缓存 / better-auth 会话 / 限流计数 共用
export const redis = new Redis(process.env.REDIS_URL!, {
  // BullMQ 要求（队列后续接入时必需）
  maxRetriesPerRequest: null,
})

redis.on('error', err => console.error('[redis]', err.message))
