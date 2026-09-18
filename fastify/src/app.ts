// dotenv 必须最先加载：后续 import 的 db/redis/auth 单例会立即读取 process.env
import 'dotenv/config'
import Fastify from 'fastify'
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import autoload from '@fastify/autoload'
import { join } from 'node:path'
import envPlugin from './plugins/env.js'
import externalPlugin from './plugins/external.js'
import dbPlugin from './plugins/db.js'
import redisPlugin from './plugins/redis.js'
import authPlugin from './plugins/auth.js'

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
  }).withTypeProvider<TypeBoxTypeProvider>()

  // 全局错误处理：必须先于任何业务路由注册设置，
  // autoload 子作用域在创建时快照父级 handler，后设置的不会被继承
  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    if (error.validation) {
      return reply.status(400).send({
        error: 'VALIDATION_ERROR',
        message: error.message,
      })
    }
    const statusCode = error.statusCode ?? 500
    if (statusCode >= 500) request.log.error(error)
    return reply.status(statusCode).send({
      error: statusCode >= 500 ? 'INTERNAL_ERROR' : error.code ?? error.name,
      message: statusCode >= 500 ? '服务器内部错误' : error.message,
    })
  })

  // 注册顺序敏感：env 最先，auth 在业务路由前
  await app.register(envPlugin)
  await app.register(externalPlugin)
  await app.register(dbPlugin)
  await app.register(redisPlugin)
  await app.register(authPlugin)

  // 业务模块自动注册（仅加载 *.routes.ts，schema/service/repository 不是插件）
  await app.register(autoload, {
    dir: join(import.meta.dirname, 'modules'),
    dirNameRoutePrefix: false,
    matchFilter: /.*\.routes\.(ts|js)$/,
  })

  return app
}
