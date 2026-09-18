import fp from 'fastify-plugin'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import swaggerUI from '@fastify/swagger-ui'
import sensible from '@fastify/sensible'
import underPressure from '@fastify/under-pressure'
import { redis } from '../redis.js'

export default fp(
  async fastify => {
    await fastify.register(sensible)

    await fastify.register(helmet, {
      // 生产经 Nginx TLS 终止，CSP 由网关层策略统一管理
      contentSecurityPolicy: false,
    })

    await fastify.register(cors, {
      origin: [fastify.config.WEB_ORIGIN],
      credentials: true, // cookie 会话必需
    })

    // 多进程共享计数（pm2 cluster 下必须，否则每进程独立计数）
    await fastify.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute',
      redis,
    })

    await fastify.register(swagger, {
      openapi: {
        info: { title: 'Store API', version: '1.0.0' },
        servers: [{ url: 'http://localhost:3000' }],
      },
    })
    await fastify.register(swaggerUI, { routePrefix: '/docs' })

    await fastify.register(underPressure, {
      maxEventLoopDelay: 1000,
      message: '服务繁忙，请稍后重试',
      exposeStatusRoute: '/health',
    })
  },
  { name: 'external' },
)
