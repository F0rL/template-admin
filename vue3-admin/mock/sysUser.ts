import { defineMock } from 'vite-plugin-mock-dev-server'
import type { UserListItem } from '../src/api/system/sysUser'
import { makeResp, makePageResp, makeErrorResp, paginate } from './utils'
import { users, roleNameOf, type MockUser } from './db'

function toListItem(u: MockUser): UserListItem {
  return {
    _disabled: u._disabled,
    id: u.id,
    name: u.name,
    userId: u.userId,
    fileId: null,
    depId: u.depId,
    depName: u.depName,
    avatar: u.avatar,
    wechatWorkUserId: u.userId,
    status: u.status,
    statusName: u.status === 1 ? '启用' : '禁用',
    userType: 10,
    userTypeName: '本地用户',
    isAssociated: true,
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
        ? users.filter(
            u => u.userId.toLowerCase().includes(searchKey) || u.name.toLowerCase().includes(searchKey),
          )
        : users
      const { list, total } = paginate(filtered, Number(query.page) || 1, Number(query.rows) || 10)
      return makePageResp(list.map(toListItem), total)
    },
  },
  {
    url: '/api/SysUser/GetUserEntity',
    method: 'GET',
    body: ({ query }) => {
      const user = users.find(u => u.id === query.id)
      if (!user) return makeErrorResp('用户不存在')
      return makeResp(toListItem(user))
    },
  },
  // 以下写操作假成功：不改动 db 数据
  { url: '/api/SysUser/CreateUser', method: 'POST', body: () => makeResp(null) },
  { url: '/api/SysUser/UpdateUser', method: 'POST', body: () => makeResp(null) },
  { url: '/api/SysUser/DeleteUser', method: 'POST', body: () => makeResp(null) },
  { url: '/api/SysUser/ResetPwd', method: 'POST', body: () => makeResp(null) },
  { url: '/api/SysUser/UpdatePwd', method: 'POST', body: () => makeResp(null) },
])
