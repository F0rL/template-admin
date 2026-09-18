import { apiGet, apiPost } from '@/utils/http'
import type { EvalSection } from './pcEval'

// ==================== 枚举 ====================

/** 图标类型：0=图片 1=emoji */
export const IconType = {
  Image: 0,
  Emoji: 1,
} as const
export type IconType = (typeof IconType)[keyof typeof IconType]

// ==================== Types ====================

export interface ScoreRuleItem {
  id: number
  section: EvalSection
  dimName: string
  wuyu: string
  score: number
  iconType: IconType
  icon: string
  emoji: string
  starMax: number | null
  enabled: boolean
  sortNo: number
  remark: string
  hidden: boolean
  termCode: string
  certTemplate: string
  description: string
}

export interface ScoreRuleListParams {
  section?: EvalSection
  termCode?: string
}

export interface ScoreRuleDetailParams {
  id: number
}

export interface DeleteScoreRuleRequest {
  id: number
}

export interface ToggleScoreRuleRequest {
  id: number
  enabled: boolean
}

export interface ResetScoreRuleRequest {
  termCode?: string
}

/** 成长树阶段 */
export interface GrowthStage {
  id: number
  name: string
  enName: string
  desc: string
  thr: number
  max: number | null
  enabled: boolean
  sortNo: number
  termCode: string
}

export interface GetGrowthStagesParams {
  termCode?: string
}

// ==================== API Functions ====================

export function fetchScoreRuleList(params?: ScoreRuleListParams, signal?: AbortSignal) {
  return apiGet<ScoreRuleItem[]>('/PcScoreRule/GetList', { params, signal })
}

export function fetchScoreRuleDetail(params: ScoreRuleDetailParams, signal?: AbortSignal) {
  return apiGet<ScoreRuleItem>('/PcScoreRule/GetDetail', { params, signal })
}

export function createScoreRule(data: ScoreRuleItem) {
  return apiPost('/PcScoreRule/Create', data)
}

export function updateScoreRule(data: ScoreRuleItem) {
  return apiPost('/PcScoreRule/Update', data)
}

export function deleteScoreRule(data: DeleteScoreRuleRequest) {
  return apiPost('/PcScoreRule/Delete', data)
}

export function resetScoreRule(data: ResetScoreRuleRequest) {
  return apiPost('/PcScoreRule/Reset', data)
}

export function toggleScoreRule(data: ToggleScoreRuleRequest) {
  return apiPost('/PcScoreRule/ToggleEnabled', data)
}

export function fetchGrowthStages(params?: GetGrowthStagesParams, signal?: AbortSignal) {
  return apiGet<GrowthStage[]>('/PcScoreRule/GetGrowthStages', { params, signal })
}

export function updateGrowthStages(data: GrowthStage[]) {
  return apiPost('/PcScoreRule/UpdateGrowthStages', data)
}

export function resetGrowthStages(data: ResetScoreRuleRequest) {
  return apiPost('/PcScoreRule/ResetGrowthStages', data)
}

// ==================== Query Keys ====================

export const pcScoreRuleKeys = {
  all: ['pcScoreRule'] as const,
  list: (params?: ScoreRuleListParams) => [...pcScoreRuleKeys.all, 'list', params] as const,
  detail: (params: ScoreRuleDetailParams) => [...pcScoreRuleKeys.all, 'detail', params] as const,
  growthStages: (params?: GetGrowthStagesParams) =>
    [...pcScoreRuleKeys.all, 'growthStages', params] as const,
}
