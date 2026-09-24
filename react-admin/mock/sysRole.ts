/**
 * 角色 mock
 * ---------------------------------------------
 * 对齐 src/api/system/sysRole.ts：列表 / 实体 / 增删改。
 * 写操作均为假成功（不改动 db 内存数据）。
 */
import { defineMock } from 'vite-plugin-mock-dev-server'
import { makeResp, makePageResp, makeErrorResp, paginate } from './utils'
import { roles, menus } from './db'

/** 按角色绑定的 menuIdsJSON 解析出菜单列表（RoleEntity.menuList 契约） */
function menuListOf(role: (typeof roles)[number]): { id: string; title: string }[] {
  let ids: string[] = []
  try {
    ids = JSON.parse(role.menuIdsJSON) as string[]
  } catch {
    ids = []
  }
  return menus.filter(m => ids.includes(m.id)).map(m => ({ id: m.id, title: m.title }))
}

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
      return makeResp({
        id: role.id,
        name: role.name,
        isDelHandle: role.id !== '10086',
        status: { value: role.status, text: role.status === 1 ? '启用' : '禁用' },
        menuList: menuListOf(role),
        localUser: [],
        workUser: [],
        menuIdsJSON: role.menuIdsJSON,
      })
    },
  },
  // 以下写操作假成功：不改动 db 数据
  { url: '/api/SysRole/CreateRole', method: 'POST', body: () => makeResp(null) },
  { url: '/api/SysRole/UpdateRole', method: 'POST', body: () => makeResp(null) },
  { url: '/api/SysRole/DeleteRole', method: 'POST', body: () => makeResp(null) },
])
