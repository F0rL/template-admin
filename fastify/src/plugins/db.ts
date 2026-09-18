import fp from 'fastify-plugin'
import { db, pool } from '../db/index.js'

export default fp(
  async fastify => {
    fastify.decorate('db', db)
    fastify.addHook('onClose', async () => {
      await pool.end()
    })
  },
  { name: 'db' },
)

declare module 'fastify' {
  interface FastifyInstance {
    db: typeof db
  }
}
