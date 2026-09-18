import type { FastifyInstance } from 'fastify'
import { NotFoundError } from '../../shared/errors.js'
import { ProductRepository } from './product.repository.js'
import type { ProductInsert } from './product.schema.js'

export class ProductService {
  private readonly repository: ProductRepository

  constructor(db: FastifyInstance['db']) {
    this.repository = new ProductRepository(db)
  }

  create(input: ProductInsert) {
    // 业务规则在此扩展（如名称重复校验、分类权限等）
    return this.repository.create(input)
  }

  async findOne(id: number) {
    const product = await this.repository.findById(id)
    if (!product) throw new NotFoundError('商品不存在')
    return product
  }

  findPage(page: number, pageSize: number) {
    return this.repository.findPage((page - 1) * pageSize, pageSize)
  }
}
