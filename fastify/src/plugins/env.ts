import fp from 'fastify-plugin'
import env from '@fastify/env'
import { envSchema, type Env } from '../config/env.js'

export default fp(
  async fastify => {
    await fastify.register(env, {
      schema: envSchema,
      dotenv: true,
      data: process.env,
    })
  },
  { name: 'env' },
)

declare module 'fastify' {
  interface FastifyInstance {
    config: Env
  }
}
