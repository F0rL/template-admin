/**
 * 菜单 mock（Phase 3：角色表单权限树 + 菜单管理页）
 * ---------------------------------------------
 * 对齐 src/api/system/sysMenu.ts：树 / 实体 / 父级候选 / 增删改。
 * 数据源为 db.userMenus（嵌套树），handler 内扁平化后补 parentId 语义。
 * 写操作均为假成功（不改动 db 内存数据）。
 */
import { defineMock } from 'vite-plugin-mock-dev-server'
import type { MenuTreeNode } from '../src/api/system/sysMenu'
import { makeResp, makeErrorResp } from './utils'
import { userMenus, type MockMenuNode } from './db'

/** 菜单树 → 扁平节点（补 parent，供搜索 / 父级候选 / 实体查询） */
function flattenMenus(nodes: MockMenuNode[], parent: { id: string } | null = null): MenuTreeNode[] {
  return nodes.flatMap(node => [
    {
      id: node.id,
      title: node.title,
      path: node.path,
      icon: node.icon,
      order: node.order,
      isMenuShow: node.isMenuShow,
      _disabled: node._disabled,
      parent,
    },
    ...(node.children ? flattenMenus(node.children, { id: node.id }) : []),
  ])
}

/** 扁平节点 → 树（父级未命中时提升为根，保持入参顺序） */
function buildTree(items: MenuTreeNode[]): MenuTreeNode[] {
  const map = new Map<string, MenuTreeNode>()
  const roots: MenuTreeNode[] = []
  for (const item of items) map.set(item.id, { ...item, children: [] })
  for (const item of items) {
    const node = map.get(item.id)!
    const parent = item.parent ? map.get(item.parent.id) : undefined
    if (parent) parent.children!.push(node)
    else roots.push(node)
  }
  return roots
}

export default defineMock([
  {
    url: '/api/SysMenu/GetMenuTree',
    method: 'GET',
    body: ({ query }) => {
      const searchKey = String(query.searchKey ?? '').toLowerCase()
      const items = flattenMenus(userMenus)
      const filtered = searchKey
        ? items.filter(
            m =>
              m.title.toLowerCase().includes(searchKey) ||
              (m.path ?? '').toLowerCase().includes(searchKey),
          )
        : items
      return makeResp(buildTree(filtered))
    },
  },
  {
    url: '/api/SysMenu/GetMenuEntity',
    method: 'GET',
    body: ({ query }) => {
      const item = flattenMenus(userMenus).find(m => m.id === query.id)
      if (!item) return makeErrorResp('菜单不存在')
      return makeResp(item)
    },
  },
  {
    url: '/api/SysMenu/GetParentMenuAll',
    method: 'GET',
    body: () => makeResp(flattenMenus(userMenus).map(m => ({ id: m.id, title: m.title }))),
  },
  // 以下写操作假成功：不改动 db 数据
  { url: '/api/SysMenu/CreateMenu', method: 'POST', body: () => makeResp(null) },
  { url: '/api/SysMenu/UpdateMenu', method: 'POST', body: () => makeResp(null) },
  { url: '/api/SysMenu/DeleteMenu', method: 'POST', body: () => makeResp(null) },
])
