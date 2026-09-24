import type { RouteObject } from 'react-router'
import type { MenuTreeNode } from '@/api/system/sysMenu'

/** 后端菜单树中出现的所有 path（含子节点），作为权限路由过滤依据 */
export function collectMenuPaths(menuTree: MenuTreeNode[]): Set<string> {
  const paths = new Set<string>()
  function walk(nodes: MenuTreeNode[]) {
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
export function findMenuTrail(menuTree: MenuTreeNode[], path: string): MenuTreeNode[] {
  const target = path.replace(/^\/+/, '')
  function walk(nodes: MenuTreeNode[], trail: MenuTreeNode[]): MenuTreeNode[] | null {
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

/**
 * 按 pathname 在路由表中查找叶子路由（逐段下钻 children）。
 * declarative mode（useRoutes）无 useMatches（data router 专属 API），
 * document.title 等路由元信息消费以「路由表 + pathname 匹配」替代。
 */
export function findRouteByPathname(routes: RouteObject[], pathname: string): RouteObject | undefined {
  const segments = pathname.split('/').filter(Boolean)
  let pool = routes
  let leaf: RouteObject | undefined
  for (const segment of segments) {
    const match = pool.find(route => route.path === segment)
    if (!match) return undefined
    leaf = match
    pool = match.children ?? []
  }
  return leaf
}

/** 首个可见菜单的 path（isMenuShow === false 的跳过，优先下钻子级） */
export function getFirstVisiblePath(menuTree: MenuTreeNode[]): string | null {
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
