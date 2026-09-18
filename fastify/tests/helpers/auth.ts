import type { makeApp } from './app.js'

type App = Awaited<ReturnType<typeof makeApp>>

// 登录拿 cookie（集成测试需要会话时使用；测试库需预先 seed 账号）
export async function login(app: App, email: string, password: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/sign-in/email',
    payload: { email, password },
  })
  if (res.statusCode !== 200) {
    throw new Error(`登录失败 ${res.statusCode}: ${res.body}`)
  }
  const setCookie = res.headers['set-cookie']
  const cookie = (Array.isArray(setCookie) ? setCookie : [setCookie])
    .map(c => c.split(';')[0])
    .join('; ')
  return { cookie }
}
