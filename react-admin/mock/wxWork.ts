/**
 * 组织架构 mock
 * ---------------------------------------------
 * 对齐 src/api/system/wxWork.ts：部门树 / 组织架构树 / 成员实体 / 成员分页列表 / 缓存刷新。
 * 数据源为 db.depts（部门树规范源，成员由 userIds 关联 db.users）。
 * 刷新缓存为假成功（不改动 db 内存数据）。
 */
import { defineMock } from 'vite-plugin-mock-dev-server'
import type { OrgUserItem } from '../src/api/system/wxWork'
import { makeResp, paginate } from './utils'
import { depts, users, mobileOf } from './db'

/** 部门扁平列表 → 树（保持 db 声明顺序） */
function buildDeptTree() {
  const map = new Map<string, { id: string; name: string; children: unknown[] }>()
  const roots: unknown[] = []
  for (const d of depts) map.set(d.id, { id: d.id, name: d.name, children: [] })
  for (const d of depts) {
    const node = map.get(d.id)!
    const parent = d.parentId ? map.get(d.parentId) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  return roots
}

/** db 用户 → 组织成员契约（部门由 depts.userIds 反查，支持一人多部门） */
function toOrgUser(u: (typeof users)[number]): OrgUserItem {
  return {
    userid: u.userId,
    name: u.name,
    mobile: mobileOf(u.userId),
    gender: u.gender,
    genderText: u.gender === 1 ? '男' : '女',
    position: u.position,
    department: depts
      .filter(d => d.userIds.includes(u.userId))
      .map(d => ({ id: d.id, name: d.name })),
  }
}

export default defineMock([
  // 部门树（POST，对齐 API 层 apiPost）
  {
    url: '/api/WxWork/GetTreeDepartmentList',
    method: 'POST',
    body: () => makeResp(buildDeptTree()),
  },
  // 组织架构树：departmentId=0 返回根部门，否则返回部门下用户；searchKey 按姓名/工号搜用户
  {
    url: '/api/WxWork/GetOrgTree',
    method: 'GET',
    body: ({ query }) => {
      const searchKey = String(query.searchKey ?? '').toLowerCase()
      if (searchKey) {
        const matched = users.filter(
          u => u.name.toLowerCase().includes(searchKey) || u.userId.toLowerCase().includes(searchKey),
        )
        return makeResp(
          matched.map(u => ({ id: u.userId, name: `${u.name}（${u.userId}）`, type: 2, isLeaf: true })),
        )
      }
      const departmentId = String(query.departmentId ?? '0')
      if (departmentId === '0') {
        return makeResp(
          depts.filter(d => !d.parentId).map(d => ({ id: d.id, name: d.name, type: 1, isLeaf: false })),
        )
      }
      const dept = depts.find(d => d.id === departmentId)
      const items =
        dept?.userIds
          .map(uid => users.find(u => u.userId === uid))
          .filter((u): u is (typeof users)[number] => !!u)
          .map(u => ({ id: u.userId, name: `${u.name}（${u.userId}）`, type: 2, isLeaf: true })) ?? []
      return makeResp(items)
    },
  },
  {
    url: '/api/WxWork/GetUserEntity',
    method: 'GET',
    body: ({ query }) => {
      const user = users.find(u => u.userId === query.userId)
      if (!user) return makeResp(null)
      return makeResp({
        name: user.name,
        userid: user.userId,
        mobile: mobileOf(user.userId),
        department: [Number(user.depId)],
        departmentNames: [user.depName],
      })
    },
  },
  // 组织成员分页列表：data 为 { message, total }（字段名 message 对齐后端契约）
  {
    url: '/api/WxWork/GetUserList',
    method: 'GET',
    body: ({ query }) => {
      const dept = depts.find(d => d.id === String(query.departmentId ?? '1'))
      const searchKey = String(query.searchKey ?? '').toLowerCase()
      let matched = (dept?.userIds ?? [])
        .map(uid => users.find(u => u.userId === uid))
        .filter((u): u is (typeof users)[number] => !!u)
      if (searchKey) {
        matched = matched.filter(
          u => u.name.toLowerCase().includes(searchKey) || u.userId.toLowerCase().includes(searchKey),
        )
      }
      // 注意：分页参数名为 row（非 rows），对齐后端契约
      const { list, total } = paginate(matched, Number(query.page) || 1, Number(query.row) || 10)
      return makeResp({ message: list.map(toOrgUser), total })
    },
  },
  // 刷新缓存：假成功
  { url: '/api/WxWork/UserRefresh', method: 'GET', body: () => makeResp(null) },
])
