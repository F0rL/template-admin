import { buildApp } from '../../src/app.js'

// 每个测试文件构建独立 app 实例，互不污染插件注册状态
export async function makeApp() {
  const app = await buildApp()
  await app.ready()
  return app
}
