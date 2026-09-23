import type { Location, NavigateFunction } from 'react-router'

/**
 * 非组件上下文跳转桥
 * ---------------------------------------------
 * react-router 的 useNavigate / useLocation 只能在组件内使用；
 * axios 拦截器（401 清会话回登录）等非组件上下文经此桥完成跳转与路径读取。
 * 引用由 router/index.tsx 中的 <NavigateBridge/> 挂载时注入，卸载时置空。
 */

let navigateFn: NavigateFunction | null = null
let currentLocation: Location | null = null

/** 注入/清除 navigate 引用（仅 <NavigateBridge/> 使用） */
export function setNavigateBridge(fn: NavigateFunction | null) {
  navigateFn = fn
}

/** 同步最新 location（仅 <NavigateBridge/> 使用） */
export function syncLocation(location: Location | null) {
  currentLocation = location
}

/** 非组件上下文跳转（组件内请使用 useNavigate） */
export function navigate(to: string, options?: { replace?: boolean }) {
  if (!navigateFn) {
    console.warn('[navigate] 路由桥未就绪，跳转被忽略:', to)
    return
  }
  navigateFn(to, options)
}

/** 非组件上下文读取当前 pathname（组件内请使用 useLocation） */
export function getPathname(): string {
  return currentLocation?.pathname ?? '/'
}
