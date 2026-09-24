import { defineMock } from 'vite-plugin-mock-dev-server'
import { makeResp } from './utils'
import { CAPTCHA_BASE64, MOCK_CAPTCHA_KEY } from './db'

export default defineMock([
  {
    url: '/api/Auth/GetLoginVerCode',
    method: 'GET',
    body: () => makeResp({ base64: CAPTCHA_BASE64, key: MOCK_CAPTCHA_KEY }),
  },
  {
    // 登录免校验：不校验账号密码/验证码，参数结构保持 LoginPayload 契约，直接返回 token
    url: '/api/Auth/GetTokenPC',
    method: 'POST',
    body: () => makeResp(`mock-token-${Date.now()}`),
  },
  {
    url: '/api/Auth/GetUserInfo',
    method: 'GET',
    body: () =>
      makeResp({
        id: 'admin',
        name: '管理员',
        avatar: '',
        sysRoleUsers: [{ id: '10086', name: '超级管理员组' }],
      }),
  },
])
