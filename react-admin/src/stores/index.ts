import { config } from '@/config'

const NS = config.STORAGE_NS

if (!NS) console.warn('[stores] STORAGE_NS 未配置，存在 key 冲突风险')

/**
 * zustand persist 的统一存储 key：`${STORAGE_NS}:${storeId}`。
 * 各 store 的 persist 配置中以 name: storageKey('<id>') 使用，
 * 避免同源多应用部署时的 localStorage key 冲突。
 */
export function storageKey(id: string): string {
  return `${NS}:${id}`
}
