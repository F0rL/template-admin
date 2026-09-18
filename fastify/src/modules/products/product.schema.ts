import { Type, type Static } from 'typebox'
import { products } from '../../db/schema.js'

// 说明：drizzle-typebox 0.3.x 依赖旧 @sinclair/typebox，与 typebox v1 的
// Fastify provider 类型不兼容；待其 1.0 稳定后再引入自动推导，目前手写。
// 手写规则：字段与 db/product.schema.ts 的表定义一一对应，新列需同步两处。

// 请求校验
export const productInsertSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 200, description: '商品名' }),
  price: Type.Integer({ minimum: 0, description: '价格（分）' }),
  description: Type.Optional(Type.String({ maxLength: 2000 })),
})

// 响应序列化（date-time：fast-json-stringify 输出 ISO 字符串）
export const productSelectSchema = Type.Object({
  id: Type.Integer(),
  name: Type.String(),
  price: Type.Integer(),
  description: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String({ format: 'date-time' }),
})

export const productListQuerySchema = Type.Object({
  page: Type.Number({ minimum: 1, default: 1 }),
  pageSize: Type.Number({ minimum: 1, maximum: 100, default: 20 }),
})

export type ProductInsert = Static<typeof productInsertSchema>
export type Product = Static<typeof productSelectSchema>

// 数据库行 → 响应 DTO（Date → ISO 字符串，与响应 schema 对齐）
export function toProductDTO(row: typeof products.$inferSelect): Product {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    description: row.description,
    createdAt: row.createdAt.toISOString(),
  }
}
