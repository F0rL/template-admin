import type { FastifyInstance } from 'fastify'
import { desc, eq } from 'drizzle-orm'
import { products } from '../../db/schema.js'
import type { ProductInsert } from './product.schema.js'

// 仓储层：唯一 SQL 出口，业务层不得直接引用 ORM 类型
export class ProductRepository {
  constructor(private readonly db: FastifyInstance['db']) {}

  async create(input: ProductInsert) {
    const [row] = await this.db.insert(products).values(input).returning()
    return row
  }

  async findById(id: number) {
    const [row] = await this.db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1)
    return row ?? null
  }

  async findPage(offset: number, limit: number) {
    return this.db
      .select()
      .from(products)
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset)
  }
}
