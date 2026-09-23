import type { RouteObject } from 'react-router'
import type { MenuItem } from '@/api/system/auth'

/** 后端菜单树中出现的所有 path（含子节点），作为权限路由过滤依据 */
export function collectMenuPaths(menuTree: MenuItem[]): Set<string> {
  const paths = new Set<string>()
  function walk(nodes: MenuItem[]) {
    for (const node of nodes) {
      if (node.path) paths.add(node.path)
      if (node.children?.length) walk(node.children)
    }
  }
  walk(menuTree)
  return paths
}

/**
 * 仅保留后端菜单授权的路径。
 * vue3-admin 在此剥离 redirect 属性；React Router 无 redirect 属性，
 * '/' 索引重定向语义由 AppRoutes 的 index <Navigate> 承担（目标 = firstPath）。
 */
export function filterRoutes(routes: RouteObject[], allowedPaths: Set<string>): RouteObject[] {
  return routes.filter(route => allowedPaths.has(route.path ?? ''))
}

/** 在菜单树中查找 path 的祖先链（Header 面包屑用），未命中返回空数组 */
export function findMenuTrail(menuTree: MenuItem[], path: string): MenuItem[] {
  const target = path.replace(/^\/+/, '')
  function walk(nodes: MenuItem[], trail: MenuItem[]): MenuItem[] | null {
    for (const node of nodes) {
      const next = [...trail, node]
      if (node.path === target) return next
      if (node.children?.length) {
        const found = walk(node.children, next)
        if (found) return found
      }
    }
    return null
  }
  return walk(menuTree, []) ?? []
}

/** 首个可见菜单的 path（isMenuShow === false 的跳过，优先下钻子级） */
export function getFirstVisiblePath(menuTree: MenuItem[]): string | null {
  for (const node of menuTree) {
    if (node.isMenuShow === false) continue
    if (node.children?.length) {
      const first = getFirstVisiblePath(node.children)
      if (first) return first
    }
    if (node.path) return node.path
  }
  return null
}
