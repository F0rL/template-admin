/**
 * 账户管理 mock（Phase 2）
 * ---------------------------------------------
 * 对齐 src/api/system/sysUser.ts 的端点：列表 / 实体 / 增删改 / 重置密码。
 * 写操作均为假成功（不改动 db 内存数据）。
 */
import { defineMock } from 'vite-plugin-mock-dev-server'
import type { UserListItem } from '../src/api/system/sysUser'
import { makeResp, makePageResp, makeErrorResp, paginate } from './utils'
import { sysUsers, roleNameOf, type MockSysUser } from './db'

/** db 数据 → 接口契约（列表行与实体同形状） */
function toListItem(u: MockSysUser): UserListItem {
  return {
    _disabled: u._disabled,
    id: u.id,
    name: u.name,
    userId: u.userId,
    avatar: u.avatar,
    status: u.status,
    statusName: u.status === 1 ? '启用' : '禁用',
    sysRoleUsers: u.roleIds.map(id => ({ roleId: id, roleName: roleNameOf(id) })),
    isDelHandle: u.isDelHandle,
  }
}

export default defineMock([
  {
    url: '/api/SysUser/GetUserList',
    method: 'GET',
    body: ({ query }) => {
      const searchKey = String(query.searchKey ?? '').toLowerCase()
      const filtered = searchKey
        ? sysUsers.filter(
            u => u.userId.toLowerCase().includes(searchKey) || u.name.toLowerCase().includes(searchKey),
          )
        : sysUsers
      const { list, total } = paginate(filtered, Number(query.page) || 1, Number(query.rows) || 10)
      return makePageResp(list.map(toListItem), total)
    },
  },
  {
    url: '/api/SysUser/GetUserEntity',
    method: 'GET',
    body: ({ query }) => {
      const user = sysUsers.find(u => u.id === query.id)
      if (!user) return makeErrorResp('账户不存在')
      return makeResp(toListItem(user))
    },
  },
  // 以下写操作假成功：不改动 db 数据
  { url: '/api/SysUser/CreateUser', method: 'POST', body: () => makeResp(null) },
  { url: '/api/SysUser/UpdateUser', method: 'POST', body: () => makeResp(null) },
  { url: '/api/SysUser/DeleteUser', method: 'POST', body: () => makeResp(null) },
  { url: '/api/SysUser/ResetPwd', method: 'POST', body: () => makeResp(null) },
])
