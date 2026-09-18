import { apiGet } from '@/utils/http'

// ==================== Types ====================

/** 学期选项（与后端 TermOptionVM 对应，后端统一 camelCase） */
export interface TermOptionVM {
  /** 学期编码，如 202620271 */
  code: string
  /** 学期显示名，如 2026-2027学年第1学期 */
  name: string
  /** 是否当前学期 */
  isCurrent: boolean
}

// ==================== API Functions ====================

/**
 * 获取学期下拉列表（数据来自数据库：当前学期 + 各业务表已落库学期）。
 * 对应后端 GET /api/PcCommon/GetTerms
 */
export function fetchTerms(signal?: AbortSignal) {
  return apiGet<TermOptionVM[]>('/PcCommon/GetTerms', { signal })
}

// ==================== Query Keys ====================

export const pcCommonKeys = {
  all: ['pcCommon'] as const,
  terms: () => [...pcCommonKeys.all, 'terms'] as const,
}
