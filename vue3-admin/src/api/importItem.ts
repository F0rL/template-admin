import { apiGet, apiPost } from '@/utils/http'

// ==================== Types ====================

export interface ImportValueVM {
  /** 值（如 甲 / 一星章 / 优秀） */
  value: string
  /** 等级 1~5，从小到大 */
  type: number
  /** 分值 0-100 */
  scoreValue: number
}

export interface ImportItemVM {
  id: string
  /** 五育 de/zhi/ti/mei/lao/other；标题行可为空 */
  qualityType: string
  /** 项目名称（如 语文 / 数学 / 国家课程） */
  project: string
  /** 导入项类型：0标题列 1导入模板 2文本填写 3图片上传 */
  importType: number
  /** 展示类型：0其它 1评语 2统计 */
  showType: number
  /** 父级导入项ID（null = 顶级） */
  parentId: string | null
  /** 描述 / 说明 */
  content: string
  /** 排序 */
  order: number
  /** 分数占比 0-100 */
  scoreRadio: number
  /** 学期编码 */
  termCode: string
  /** 学期名称 */
  termName: string
  /** 值集合（如等级+分值） */
  values: ImportValueVM[]
  /** 启用 */
  enabled: boolean
  /** 前端组装树结构时填充的子节点 */
  children?: ImportItemVM[]
}

export interface SaveImportItemPayload {
  id?: string
  project: string
  qualityType?: string
  importType: number
  showType?: number
  parentId?: string | null
  content?: string
  order?: number
  scoreRadio?: number
  termCode: string
  termName?: string
  values?: ImportValueVM[]
  enabled?: boolean
}

export interface SyncImportItemPayload {
  sourceTermCode: string
  targetTermCode: string
  targetTermName?: string
}

export interface SyncImportItemNodePayload {
  /** 源节点 ID（要复制的子树根节点） */
  sourceId: string | number
  /** 目标学期编码 */
  targetTermCode: string
  /** 目标学期名称（可选） */
  targetTermName?: string
}

export interface TermOption {
  code: string
  name: string
  isCurrent?: boolean
}

// ==================== API ====================

/** 导入项列表（按学期返回全量扁平数据，前端组装成树） */
export function fetchImportItems(params: {
  termCode: string
  searchKey?: string
}, signal?: AbortSignal) {
  return apiGet<ImportItemVM[]>('/PcImportItems/GetList', { params, signal })
}

/** 导入项详情 */
export function fetchImportItemEntity(id: string | number, signal?: AbortSignal) {
  return apiGet<ImportItemVM>('/PcImportItems/GetEntity', { params: { id }, signal })
}

/** 新增/编辑导入项（id 为空=新增），返回 Id */
export function saveImportItem(payload: SaveImportItemPayload) {
  return apiPost<string>('/PcImportItems/Save', payload)
}

/** 复制一个：复制当前节点及所有子孙到本学期内同父级下（名称加"(副本)"），返回新根节点 Id */
export function saveAsImportItem(sourceId: string | number) {
  return apiPost<string>('/PcImportItems/SaveAs', { sourceId })
}

/** 删除导入项（含所有子孙） */
export function deleteImportItems(ids: (string | number)[]) {
  return apiPost<unknown>('/PcImportItems/Del', { ids })
}

/** 已配置导入项的学期列表 */
export function fetchImportItemTerms(signal?: AbortSignal) {
  return apiGet<TermOption[]>('/PcImportItems/GetTerms', { signal })
}

/** 学期间整盘复制（源学期 → 目标学期） */
export function syncImportItems(payload: SyncImportItemPayload) {
  return apiPost<number>('/PcImportItems/SyncTerm', payload)
}
