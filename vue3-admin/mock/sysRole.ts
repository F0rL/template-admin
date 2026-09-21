import type { MockMethod } from 'vite-plugin-mock'
import { makeResp, makePageResp, makeErrorResp, paginate } from './utils'
import { roles } from './db'

export default [
  {
    url: '/api/SysRole/GetRoleList',
    method: 'get',
    response: ({ query }) => {
      const { list, total } = paginate(roles, Number(query.page) || 1, Number(query.rows) || 10)
      return makePageResp(
        list.map(r => ({ id: r.id, name: r.name })),
        total,
      )
    },
  },
  {
    url: '/api/SysRole/GetRoleEntity',
    method: 'get',
    response: ({ query }) => {
      const role = roles.find(r => r.id === query.id)
      if (!role) return makeErrorResp('角色不存在')
      return makeResp({
        id: role.id,
        name: role.name,
        isDelHandle: role.id !== '10086',
        status: { value: role.status, text: role.status === 1 ? '启用' : '禁用' },
        menuList: [],
        localUser: [],
        workUser: [],
        menuIdsJSON: role.menuIdsJSON,
      })
    },
  },
  // 以下写操作假成功：不改动 db 数据
  { url: '/api/SysRole/CreateRole', method: 'post', response: () => makeResp(null) },
  { url: '/api/SysRole/UpdateRole', method: 'post', response: () => makeResp(null) },
  { url: '/api/SysRole/DeleteRole', method: 'post', response: () => makeResp(null) },
] as MockMethod[]
