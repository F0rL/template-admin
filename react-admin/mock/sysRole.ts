/**
 * 角色 mock（Phase 2 起：账户表单角色下拉；Phase 3 补齐角色管理页端点）
 * ---------------------------------------------
 * 对齐 src/api/system/sysRole.ts：列表 / 实体 / 增删改。
 * 写操作均为假成功（不改动 db 内存数据）。
 */
import { defineMock } from 'vite-plugin-mock-dev-server'
import type { RoleEntity } from '../src/api/system/sysRole'
import { makePageResp, makeResp, makeErrorResp, paginate } from './utils'
import { roles } from './db'

export default defineMock([
  {
    url: '/api/SysRole/GetRoleList',
    method: 'GET',
    body: ({ query }) => {
      const { list, total } = paginate(roles, Number(query.page) || 1, Number(query.rows) || 10)
      return makePageResp(
        list.map(r => ({ id: r.id, name: r.name })),
        total,
      )
    },
  },
  {
    url: '/api/SysRole/GetRoleEntity',
    method: 'GET',
    body: ({ query }) => {
      const role = roles.find(r => r.id === query.id)
      if (!role) return makeErrorResp('角色不存在')
      const entity: RoleEntity = {
        id: role.id,
        name: role.name,
        status: { value: role.status, text: role.status === 1 ? '启用' : '禁用' },
        menuIdsJSON: role.menuIdsJSON,
      }
      return makeResp(entity)
    },
  },
  // 以下写操作假成功：不改动 db 数据
  { url: '/api/SysRole/CreateRole', method: 'POST', body: () => makeResp(null) },
  { url: '/api/SysRole/UpdateRole', method: 'POST', body: () => makeResp(null) },
  { url: '/api/SysRole/DeleteRole', method: 'POST', body: () => makeResp(null) },
])
