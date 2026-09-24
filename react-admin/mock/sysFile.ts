/**
 * 附件 mock（Phase 2，仅账户表单头像上传所需端点）
 * ---------------------------------------------
 * 仅 mock 上传（表单依赖返回的 path）；列表/实体/删除响应契约未定，不 mock。
 */
import { defineMock } from 'vite-plugin-mock-dev-server'
import { makeResp } from './utils'

export default defineMock([
  {
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
