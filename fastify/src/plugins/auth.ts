import fp from 'fastify-plugin'
import { auth } from '../auth/index.js'

export default fp(
  async fastify => {
    fastify.decorate('auth', auth)

    // 自定义 JSON 解析器：
    // - /api/auth 路由保留原始字符串（由 auth.handler 消费）
    // - 其余路由正常解析，且容忍空 body（better-auth 部分接口
    //   POST 空 body + application/json，Fastify 默认会抛
    //   FST_ERR_CTP_EMPTY_JSON_BODY）
    fastify.addContentTypeParser(
      'application/json',
      { parseAs: 'string' },
      (req, body, done) => {
        const text = typeof body === 'string' ? body : body.toString('utf8')
        if (req.url.startsWith('/api/auth')) return done(null, text)
        try {
          done(null, text.length ? JSON.parse(text) : null)
        } catch {
          const parseError = new Error('Invalid JSON body') as Error & { statusCode: number }
          parseError.statusCode = 400
          done(parseError, undefined)
        }
      },
    )

    // better-auth catch-all 端点（官方 Fastify 集成模式：
    // 构造 fetch Request → auth.handler → 转发响应）
    fastify.route({
      method: ['GET', 'POST'],
      url: '/api/auth/*',
      handler: async (request, reply) => {
        const url = new URL(request.url, `http://${request.headers.host}`)
        const headers = new Headers()
        for (const [key, value] of Object.entries(request.headers)) {
          if (value == null) continue
          headers.append(key, Array.isArray(value) ? value.join(', ') : String(value))
        }

        const req = new Request(url, {
          method: request.method,
          headers,
          // GET/HEAD 无 body；其余传原始字符串
          body:
            request.method === 'GET' || request.method === 'HEAD' || !request.body
              ? undefined
              : (request.body as string),
        })

        const response = await auth.handler(req)

        reply.status(response.status)
        // set-cookie 需取多条，避免被合并成一个头
        const setCookies = response.headers.getSetCookie?.() ?? []
        if (setCookies.length) reply.header('set-cookie', setCookies)
        response.headers.forEach((value, key) => {
          if (key.toLowerCase() !== 'set-cookie') reply.header(key, value)
        })
        reply.send(response.body ? await response.text() : null)
      },
    })

    // 业务路由 session 解析（cookie 与 Bearer 均支持）
    fastify.decorateRequest('session', null)
    fastify.addHook('preHandler', async request => {
      if (request.url.startsWith('/api/auth')) return
      request.session = await auth.api.getSession({
        headers: request.headers,
      })
    })
  },
  { name: 'auth' },
)

declare module 'fastify' {
  interface FastifyInstance {
    auth: typeof auth
  }
  interface FastifyRequest {
    session: typeof auth.$Infer.Session | null
  }
}
