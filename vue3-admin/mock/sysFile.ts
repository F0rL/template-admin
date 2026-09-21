import { defineMock } from 'vite-plugin-mock-dev-server'
import { makeResp } from './utils'

export default defineMock([
  {
    // 仅 mock 上传（用户表单头像依赖 res.path）；List/Entity/Del 响应类型未定，不 mock
    url: '/api/SysFile/SysFileUpload',
    method: 'POST',
    body: () =>
      makeResp({
        id: '900000000000000001',
        oldName: 'avatar.png',
        newName: 'avatar.png',
        path: '/file/mock-avatar.png',
      }),
  },
])
