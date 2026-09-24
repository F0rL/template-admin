export const config: {
  /** 应用基础路径，用于路由 basename */
  BASE_URL: string

  /** axios 请求 baseURL，dev 固定 /api 走 Vite 代理，prod 直连 VITE_APP_BASE_API */
  API_BASE_URL: string

  /** 文件服务源站，用于拼接后端返回的相对路径（avatar 等） */
  FILE_BASE_URL: string

  /** 应用标题 */
  APP_TITLE: string

  /** localStorage 命名空间，格式：项目:端:环境 */
  STORAGE_NS: string

  /** React Query Devtools 调试面板开关，生产环境请关闭 */
  ENABLE_DEVTOOLS: boolean
} = {
  BASE_URL: import.meta.env.VITE_APP_BASE_URL,
  API_BASE_URL: import.meta.env.DEV ? '/api' : import.meta.env.VITE_APP_BASE_API + '/api',
  FILE_BASE_URL: import.meta.env.VITE_APP_BASE_API,
  APP_TITLE: import.meta.env.VITE_APP_TITLE,
  STORAGE_NS: import.meta.env.VITE_APP_STORAGE_NS,
  ENABLE_DEVTOOLS: import.meta.env.VITE_APP_ENABLE_DEVTOOLS === 'true',
}
