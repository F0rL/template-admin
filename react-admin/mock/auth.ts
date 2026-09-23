/**
 * 登录链路 mock（Phase 1）
 * ---------------------------------------------
 * 对齐 src/api/system/auth.ts 的五个端点：
 * - GetLoginVerCode：固定验证码（图片 + key）
 * - GetTokenPC：免校验直接发 token（参数保持 LoginPayload 契约）
 * - GetUserInfo / GetUserRightMenu：静态数据（db.ts）
 * - UpdatePwd：假成功
 * 系统管理域 mock 随 Phase 2/3 页面补齐。
 */
import { defineMock } from 'vite-plugin-mock-dev-server'
import { makeResp } from './utils'
import { CAPTCHA_BASE64, MOCK_CAPTCHA_KEY, mockUser, userMenus } from './db'

export default defineMock([
  {
    url: '/api/Auth/GetLoginVerCode',
    method: 'GET',
    body: () => makeResp({ base64: CAPTCHA_BASE64, key: MOCK_CAPTCHA_KEY }),
  },
  {
    // 登录免校验：不校验账号密码/验证码，直接返回 token
    url: '/api/Auth/GetTokenPC',
    method: 'POST',
    body: () => makeResp(`mock-token-${Date.now()}`),
  },
  {
    url: '/api/Auth/GetUserInfo',
    method: 'GET',
    body: () => makeResp(mockUser),
  },
  {
    url: '/api/SysMenu/GetUserRightMenu',
    method: 'GET',
    body: () => makeResp(userMenus),
  },
  {
    url: '/api/SysUser/UpdatePwd',
    method: 'POST',
    body: () => makeResp(null),
  },
])
