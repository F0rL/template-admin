import type { MockMethod } from 'vite-plugin-mock'
import { makeResp } from './utils'

export default [
  {
    // 仅 mock 上传（用户表单头像依赖 res.path）；List/Entity/Del 响应类型未定，不 mock
    url: '/api/SysFile/SysFileUpload',
    method: 'post',
    response: () =>
      makeResp({
        id: '900000000000000001',
        oldName: 'avatar.png',
        newName: 'avatar.png',
        path: '/file/mock-avatar.png',
      }),
  },
] as MockMethod[]
