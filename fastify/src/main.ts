import closeWithGrace from 'close-with-grace'
import { buildApp } from './app.js'

const app = await buildApp()

// 优雅停机：等待在途请求完成后触发各插件 onClose（释放连接池/断开 Redis）
closeWithGrace({ delay: 10_000 }, async ({ err }) => {
  if (err) app.log.error(err)
  await app.close()
})

await app.listen({ port: app.config.PORT, host: '0.0.0.0' })
