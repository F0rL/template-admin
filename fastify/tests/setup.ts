// vitest setupFiles：在任何测试代码 import app 之前加载测试环境变量
// （@fastify/env 的 data: process.env 会读到这里的值）
import { config } from 'dotenv'

process.env.NODE_ENV = 'test'
config({ path: '.env.test' })
