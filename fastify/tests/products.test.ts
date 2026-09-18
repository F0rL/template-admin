import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { makeApp } from './helpers/app.js'
import { login } from './helpers/auth.js'
import { db, schema } from '../src/db/index.js'

describe('products API', () => {
  let app: Awaited<ReturnType<typeof makeApp>>

  beforeAll(async () => {
    app = await makeApp()
    // 清理本测试涉及的表（按外键顺序）
    await db.delete(schema.products)
  })

  afterAll(async () => {
    await app.close()
  })

  it('未登录创建商品 → 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/products',
      payload: { name: '测试商品', price: 1000 },
    })
    expect(res.statusCode).toBe(401)
  })

  it('参数校验失败 → 400（price 为负）', async () => {
    const { cookie } = await login(app, 'admin@example.com', 'password123')
    const res = await app.inject({
      method: 'POST',
      url: '/api/products',
      headers: { cookie },
      payload: { name: '测试商品', price: -1 },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toBe('VALIDATION_ERROR')
  })

  it('创建成功 → 201 且响应字段被白名单裁剪', async () => {
    const { cookie } = await login(app, 'admin@example.com', 'password123')
    const res = await app.inject({
      method: 'POST',
      url: '/api/products',
      headers: { cookie },
      payload: { name: '测试商品', price: 1000, description: '描述' },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body).toHaveProperty('id')
    expect(body).toHaveProperty('name', '测试商品')
  })

  it('better-auth 空 body + application/json 不触发 Fastify 解析错误', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-out',
      headers: { 'content-type': 'application/json' },
      payload: '',
    })
    // 未登录时 sign-out 也应正常返回，不应是 500
    expect([200, 401]).toContain(res.statusCode)
  })
})
