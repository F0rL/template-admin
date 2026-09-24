/**
 * 组织架构 mock（Phase 3）
 * ---------------------------------------------
 * 对齐 src/api/system/wxWork.ts：部门树 / 成员分页列表 / 缓存刷新。
 * 数据源为 db.depts（部门树规范源，成员由 userIds 关联 db.sysUsers）。
 * 刷新缓存为假成功（不改动 db 内存数据）。
 */
import { defineMock } from 'vite-plugin-mock-dev-server'
import type { OrgUserItem } from '../src/api/system/wxWork'
import { makeResp, paginate } from './utils'
import { depts, mobileOf, sysUsers, type MockSysUser } from './db'

/** 部门扁平列表 → 树（保持 db 声明顺序） */
function buildDeptTree() {
  const map = new Map<string, { id: string; name: string; children: unknown[] }>()
  const roots: unknown[] = []
  for (const dept of depts) map.set(dept.id, { id: dept.id, name: dept.name, children: [] })
  for (const dept of depts) {
    const node = map.get(dept.id)!
    const parent = dept.parentId ? map.get(dept.parentId) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  return roots
}

/** db 用户 → 组织成员契约（部门由 depts.userIds 反查，支持一人多部门） */
function toOrgUser(user: MockSysUser): OrgUserItem {
  return {
    userid: user.userId,
    name: user.name,
    mobile: mobileOf(user.userId),
    gender: user.gender,
    genderText: user.gender === 1 ? '男' : '女',
    position: user.position,
    department: depts
      .filter(dept => dept.userIds.includes(user.userId))
      .map(dept => ({ id: dept.id, name: dept.name })),
  }
}

export default defineMock([
  // 部门树（POST，对齐 API 层 apiPost）
  {
    url: '/api/WxWork/GetTreeDepartmentList',
    method: 'POST',
    body: () => makeResp(buildDeptTree()),
  },
  // 部门成员分页列表：data 为 { message, total }（字段名 message 对齐后端契约）
  {
    url: '/api/WxWork/GetUserList',
    method: 'GET',
    body: ({ query }) => {
      const dept = depts.find(d => d.id === String(query.departmentId ?? '1'))
      const searchKey = String(query.searchKey ?? '').toLowerCase()
      let matched = (dept?.userIds ?? [])
        .map(userId => sysUsers.find(u => u.userId === userId))
        .filter((u): u is MockSysUser => !!u)
      if (searchKey) {
        matched = matched.filter(
          u =>
            u.name.toLowerCase().includes(searchKey) || u.userId.toLowerCase().includes(searchKey),
        )
      }
      // 分页参数名为 row（非 rows），对齐后端契约
      const { list, total } = paginate(matched, Number(query.page) || 1, Number(query.row) || 10)
      return makeResp({ message: list.map(toOrgUser), total })
    },
  },
  // 刷新缓存：假成功
  { url: '/api/WxWork/UserRefresh', method: 'GET', body: () => makeResp(null) },
])
