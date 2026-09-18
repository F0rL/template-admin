import { apiGet, apiPost } from '@/utils/http'

/**
 * 追"锋"时刻（奖章动态）— PC 管理端
 *
 * 与移动端教师端同源（a_medal_order）：**一次提交 = 一条记录**，
 * 一条记录可包含多个学生（studentNames）+ 多个奖章（medals）。
 * 差异：PC 端不做「仅作者可删」限制，管理员可查看并删除全部动态。
 */

// ==================== 类型 ====================

export interface PcMedalItem {
  medalName: string
  num: number
  /** 后端返回的奖章图标（多数为图片名而非可用 URL，前端按名称回退本地图标） */
  icon: string
}

export interface PcMedalCommentItem {
  id: number
  name: string
  content: string
  createTime: string
}

/**
 * 发表评价表单快照（后端 a_medal_order.EvalPayloadJson）
 * 好公民：wuyu/score/certName/subCategory/awardLevel/awardGrade/awardTime/awardUnit/reward/description
 * 好学生：items（维度 × 积分）
 */
export interface PcMedalEvalPayload {
  /** 五育编码 de/zhi/ti/mei/lao */
  wuyu?: string | null
  score?: number | null
  certName?: string | null
  /** 获奖分类：1荣誉类 2竞赛类 3辅导类 */
  subCategory?: number | null
  awardLevel?: string | null
  awardGrade?: string | null
  /** yyyy-MM */
  awardTime?: string | null
  awardUnit?: string | null
  reward?: string | null
  description?: string | null
  items?: { scoreRuleId: string | number; score: number }[] | null
}

export interface PcMedalOrderListItem {
  id: number
  createTime: string
  teacherName: string
  job: string
  depId: number | null
  depName: string
  /** 班级全称（如 五年级4班(测试)），好公民无班级时为 null；展示口径 depFullName || depName */
  depFullName?: string | null
  /** 来源评价板块（0=好学生 / 1=好公民 / 2=好孩子），null=历史数据未标记 */
  evalSection?: number | null
  /** 发表时的表单快照（好公民含获奖分类/级别/奖次/时间/单位/奖励），供详情弹窗展示 */
  evalPayload?: PcMedalEvalPayload | null
  /** 涉及学生姓名展示串（逗号分隔） */
  studentListStr: string
  /** 涉及学生姓名数组 */
  studentNames: string[]
  studentCount: number
  content: string
  imgList: string[]
  medals: PcMedalItem[]
  /** 本次提交奖章总数 */
  medalTotal: number
  likeCount: number
  commentCount: number
  lookNum: number
  studentTotal: number
}

export interface PcMedalOrderDetail extends PcMedalOrderListItem {
  comments: PcMedalCommentItem[]
  likeNames: string[]
}

export interface PageResult<T> {
  list: T[]
  total: number
}

// ==================== 请求参数 ====================

export interface PcMedalOrderListParams {
  page: number
  rows: number
  /** 班级ID，空 = 全校 */
  depId?: number | string
  /** 时间筛选：yyyy-MM-dd 或 yyyy-MM */
  timeStr?: string
  /** 关键字：学生姓名 / 教师姓名 / 正文 */
  searchKey?: string
}

// ==================== API ====================

export function fetchPcMedalOrders(params: PcMedalOrderListParams, signal?: AbortSignal) {
  return apiGet<PageResult<PcMedalOrderListItem>>('/PcMedal/GetList', { params, signal })
}

export function fetchPcMedalOrderDetail(params: { id: number | string }, signal?: AbortSignal) {
  return apiGet<PcMedalOrderDetail>('/PcMedal/GetDetail', { params, signal })
}

export function deletePcMedalOrders(data: { ids: (number | string)[] }) {
  return apiPost('/PcMedal/Delete', data)
}

// ==================== Query Keys ====================

export const pcMedalKeys = {
  all: ['pcMedal'] as const,
  list: (params: PcMedalOrderListParams) => [...pcMedalKeys.all, 'list', params] as const,
  detail: (id: number | string) => [...pcMedalKeys.all, 'detail', id] as const,
}
