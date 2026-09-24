/**
 * 菜单 mock
 * ---------------------------------------------
 * 对齐 src/api/system/sysMenu.ts 的端点：右侧菜单 / 树 / 列表 / 实体 / 父级候选 / 增删改。
 * 数据源为 db.menus（扁平列表，parentId 表达层级）。
 * 注意：buildTree 保持「叶子节点不带 children」，避免 antd Table 渲染空展开按钮
 * （与 vue3-admin 的 children: [] 写法有意不同，返回数据语义一致）。
 * 写操作均为假成功（不改动 db 内存数据）。
 */
import { defineMock } from 'vite-plugin-mock-dev-server'
import type { MenuTreeNode } from '../src/api/system/sysMenu'
import { makeResp, makePageResp, makeErrorResp } from './utils'
import { menus, type MockMenu } from './db'

/** db 扁平菜单 → 接口树节点（parent 仅携带 id 语义） */
function toTreeNode(m: MockMenu): MenuTreeNode {
  return {
    id: m.id,
    title: m.title,
    path: m.path,
    icon: m.icon,
    order: m.order,
    createTime: m.createTime,
    isMenuShow: m.isMenuShow,
    _disabled: m._disabled,
    parent: m.parentId ? { id: m.parentId } : null,
  }
}

/** 扁平节点 → 树（父级未命中时提升为根，保持入参顺序；叶子节点不带 children） */
function buildTree(items: MockMenu[]): MenuTreeNode[] {
  const map = new Map<string, MenuTreeNode>()
  const roots: MenuTreeNode[] = []
  for (const item of items) map.set(item.id, toTreeNode(item))
  for (const item of items) {
    const node = map.get(item.id)!
    const parent = item.parentId ? map.get(item.parentId) : undefined
    if (parent) (parent.children ??= []).push(node)
    else roots.push(node)
  }
  return roots
}

export default defineMock([
  // 当前用户右侧菜单（GET，对齐 API 层 apiGet）
  {
    url: '/api/SysMenu/GetUserRightMenu',
    method: 'GET',
    body: () => makeResp(buildTree(menus.filter(m => m.isMenuShow))),
  },
  {
    url: '/api/SysMenu/GetMenuTree',
    method: 'GET',
    body: ({ query }) => {
      const searchKey = String(query.searchKey ?? '').toLowerCase()
      const filtered = searchKey
        ? menus.filter(
            m =>
              m.title.toLowerCase().includes(searchKey) ||
              (m.path ?? '').toLowerCase().includes(searchKey),
          )
        : menus
      return makeResp(buildTree(filtered))
    },
  },
  // 菜单列表不分页（API 层参数仅 searchKey），但响应为 PaginatedData 包装
  {
    url: '/api/SysMenu/GetMenuList',
    method: 'GET',
    body: ({ query }) => {
      const searchKey = String(query.searchKey ?? '').toLowerCase()
      const filtered = searchKey
        ? menus.filter(
            m =>
              m.title.toLowerCase().includes(searchKey) ||
              (m.path ?? '').toLowerCase().includes(searchKey),
          )
        : menus
      return makePageResp(filtered.map(toTreeNode), filtered.length)
    },
  },
  {
    url: '/api/SysMenu/GetMenuEntity',
    method: 'GET',
    body: ({ query }) => {
      const item = menus.find(m => m.id === query.id)
      if (!item) return makeErrorResp('菜单不存在')
      return makeResp(toTreeNode(item))
    },
  },
  {
    url: '/api/SysMenu/GetParentMenuAll',
    method: 'GET',
    body: () => makeResp(menus.map(m => ({ id: m.id, title: m.title }))),
  },
  // 以下写操作假成功：不改动 db 数据
  { url: '/api/SysMenu/CreateMenu', method: 'POST', body: () => makeResp(null) },
  { url: '/api/SysMenu/UpdateMenu', method: 'POST', body: () => makeResp(null) },
  { url: '/api/SysMenu/DeleteMenu', method: 'POST', body: () => makeResp(null) },
])
