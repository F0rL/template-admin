import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { Type } from 'typebox'
import {
  productInsertSchema,
  productListQuerySchema,
  productSelectSchema,
  toProductDTO,
} from './product.schema.js'
import { ProductService } from './product.service.js'

const productRoutes: FastifyPluginAsyncTypebox = async fastify => {
  const service = new ProductService(fastify.db)

  fastify.get(
    '/api/products',
    {
      schema: {
        querystring: productListQuerySchema,
        // 响应白名单：未声明字段自动裁剪，防敏感字段泄漏
        response: { 200: Type.Array(productSelectSchema) },
      },
    },
    async request => {
      const { page, pageSize } = request.query
      const rows = await service.findPage(page, pageSize)
      return rows.map(toProductDTO)
    },
  )

  fastify.post(
    '/api/products',
    {
      // 需要登录的接口：preHandler 检查 session
      preHandler: async (request, reply) => {
        if (!request.session) return reply.unauthorized()
      },
      schema: {
        body: productInsertSchema,
        response: { 201: productSelectSchema },
      },
    },
    async (request, reply) => {
      const created = await service.create(request.body)
      reply.code(201)
      return toProductDTO(created)
    },
  )
}

// @fastify/autoload 只消费 default export（命名导出会被静默跳过）
export default productRoutes satisfies FastifyPluginAsyncTypebox
