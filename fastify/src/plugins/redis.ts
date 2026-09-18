import fp from 'fastify-plugin'
import { redis } from '../redis.js'

export default fp(
  async fastify => {
    fastify.decorate('redis', redis)
    fastify.addHook('onClose', async () => {
      redis.disconnect()
    })
  },
  { name: 'redis' },
)

declare module 'fastify' {
  interface FastifyInstance {
    redis: typeof redis
  }
}
