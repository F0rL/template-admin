import http, { apiGet, apiPost } from '@/utils/http'

// ==================== Types ====================

export interface CreatePatrolPersonRequest {
  name: string
  dept?: string
  userId: string
  /** 巡查角色：1=教师 2=学生督查，不传默认 1 */
  role?: number
}

export interface BatchAddPatrolPeopleRequest {
  people: CreatePatrolPersonRequest[]
}

export interface CopyLocationsRequest {
  fromItemId: string
  toItemId: string
}

export interface CreatePatrolCategoryRequest {
  name: string
  code: string
  evalMode: number
  scoreTarget?: number
  scoreGood?: number | null
  scoreMid?: number | null
  scoreBad?: number | null
  sortNo: number
  /** 巡查角色：1=教师 2=学生督查，不传默认 1 */
  role?: number
}

export interface CreatePatrolItemRequest {
  categoryId?: string
  name: string
  startTime: string
  endTime: string
  sortNo: number
  /** 巡查角色：1=教师 2=学生督查，不传则默认跟随分类 */
  role?: number
}

/** 日期覆盖例外（保存点位时全量提交） */
export interface PatrolLocationOverrideReq {
  overrideDate: string
  teacherId?: string | null
  teacherName: string
}

export interface CreatePatrolLocationRequest {
  /** 分类级点位（去时段后教师执勤分类使用） */
  categoryId?: string | null
  /** 项下点位（历史结构兼容） */
  itemId?: string | null
  name: string
  shortName: string
  sortNo: number
  enabled: boolean
  defaultTeacherId?: string | null
  defaultTeacherName?: string | null
  overrides?: PatrolLocationOverrideReq[]
}

export interface UpdatePatrolCategoryRequest {
  id: string
  name?: string
  code?: string
  evalMode?: number | null
  scoreTarget?: number | null
  scoreGood?: number | null
  scoreMid?: number | null
  scoreBad?: number | null
  sortNo?: number | null
  enabled?: boolean | null
  /** 巡查角色：1=教师 2=学生督查 */
  role?: number | null
}

export interface UpdatePatrolCategoryEnabledRequest {
  id: string
  enabled?: boolean
}

export interface UpdatePatrolItemRequest {
  id?: string
  categoryId?: string | null
  name?: string
  startTime?: string
  endTime?: string
  sortNo?: number | null
  enabled?: boolean | null
  /** 巡查角色：1=教师 2=学生督查 */
  role?: number | null
}

export interface UpdatePatrolPersonRequest {
  id: string
  name?: string
  dept?: string
  userId?: string
  /** 巡查角色：1=教师 2=学生督查 */
  role?: number | null
}

export interface DetailParams {
  id: number
}

/** 操作记录请求（按巡查日期） */
export interface OpsParams {
  date: string
}

/** 单条操作记录 */
export interface PatrolOpsItem {
  /** 操作时间 yyyy-MM-dd HH:mm:ss */
  opTime: string
  operator: string
  /** 被评价对象（班级全名 / 教师@点位） */
  target: string
  /** 巡查项名称 */
  item: string
  /** 0=班级巡查 1=教师执勤 2=学生督查 */
  detailType: number
  detailTypeName: string
  result: number
  resultName: string
  remark: string
  scoreChange: number
}

/** 操作记录（管理员视角，三个板块全量） */
export interface PatrolOpsVM {
  recordDate: string
  people: string
  totalGood: number
  totalMid: number
  totalBad: number
  totalScore: number
  items: PatrolOpsItem[]
}

export interface ListParams {
  page: number
  rows: number
  startDate?: string | null
  endDate?: string | null
  keyword?: string
  termCode?: string | null
}

/** 巡查记录列表行 */
export interface PatrolRecord {
  id: number
  recordDate: string
  termName: string
  peopleJson: string
  status: string
  createUserName: string
  /** 班级巡查计数 */
  detailCount: number
  detailGoodCount: number
  detailMidCount: number
  detailBadCount: number
  /** 学生督查计数 */
  studentCount: number
  studentGoodCount: number
  studentMidCount: number
  studentBadCount: number
  dutyCount: number
  dutyGoodCount: number
  dutyMidCount: number
  dutyBadCount: number
  specialCount: number
}

/** 巡查记录详情 */
export interface PatrolRecordDetail {
  id: number
  recordDate: string
  termName: string
  peopleJson: string
  status: string
  /** 班级巡查明细 */
  details: PatrolDetailItem[]
  /** 学生督查明细 */
  studentDetails: PatrolDetailItem[]
  dutyRecords: PatrolDutyItem[]
  specials: PatrolSpecial[]
}

export interface PatrolDetailItem {
  id: number
  itemName: string
  studentDepName: string
  result: number
  resultName: string
  scoreChange: number
  remark: string
  files: string
}

export interface PatrolDutyItem {
  id: number
  itemName: string
  locationName: string
  result: number
  resultName: string
  scoreChange: number
  evaluatedTeacherName: string
  remark: string
  files: string
}

export interface PatrolSpecial {
  id: number
  content: string
  sortNo: number
}

/** 评价模式：1=按班级评价 2=按教师执勤评价 3=文本记录（不积分） */
export type EvalMode = 1 | 2 | 3

/** 积分归集：1=年级组 2=不积分 */
export type ScoreTarget = 1 | 2

/** 执勤点位日期覆盖例外（指定日期临时换默认老师） */
export interface PatrolLocationOverride {
  id: string
  locationId: string
  overrideDate: string
  teacherId?: string | null
  teacherName: string
}

/** 执勤地点（三级节点 / 教师执勤分类下直挂分类为二级节点） */
export interface PatrolLocation {
  id: string
  itemId: string
  categoryId?: string | null
  name: string
  shortName?: string | null
  sortNo: number
  enabled?: boolean
  remark?: string | null
  defaultTeacherId?: string | null
  defaultTeacherName?: string | null
  overrides?: PatrolLocationOverride[]
}

/** 巡查项（二级节点） */
export interface PatrolItem {
  id: string
  categoryId: string
  name: string
  startTime: string
  endTime: string
  sortNo: number
  enabled?: boolean
  remark?: string | null
  /** 1=教师 2=学生督查 */
  role: number
  locations?: PatrolLocation[]
}

/** 巡查分类（一级节点） */
export interface PatrolCategory {
  id: string
  name: string
  code: string
  evalMode: EvalMode
  scoreTarget: ScoreTarget
  scoreGood?: number | null
  scoreMid?: number | null
  scoreBad?: number | null
  sortNo: number
  enabled?: boolean
  remark?: string | null
  /** 1=教师 2=学生督查 */
  role: number
  items?: PatrolItem[]
  /** 分类级执勤点位（去时段后教师执勤分类使用） */
  locations?: PatrolLocation[]
}

/** 巡查分类树（分类→巡查项→执勤地点） */
export type PatrolCategoryTree = PatrolCategory[]

/** 巡查人 */
export interface PatrolPerson {
  id: string
  name: string
  dept: string
  joinDate: string
  userId: string
  /** 1=教师 2=学生督查 */
  role: number
  roleName?: string
}

export interface UpdatePatrolLocationRequest {
  id: string
  categoryId?: string | null
  itemId?: string | null
  name?: string
  shortName?: string
  sortNo?: number
  enabled?: boolean
  defaultTeacherId?: string | null
  defaultTeacherName?: string | null
  /** null=不动；传数组全量替换 */
  overrides?: PatrolLocationOverrideReq[] | null
}

// ==================== API Functions ====================

/** 新增巡查人 */
export function createPerson(data: CreatePatrolPersonRequest) {
  return apiPost('/PcPatrol/AddPerson', data)
}

/** 批量新增巡查人 */
export function batchAddPeople(data: BatchAddPatrolPeopleRequest) {
  return apiPost('/PcPatrol/BatchAddPeople', data)
}

/** 复制执勤地点 */
export function copyLocations(data: CopyLocationsRequest) {
  return apiPost('/PcPatrol/CopyLocations', data)
}

/** 新增巡查分类 */
export function createCategory(data: CreatePatrolCategoryRequest) {
  return apiPost('/PcPatrol/CreateCategory', data)
}

/** 新增巡查项 */
export function createItem(data: CreatePatrolItemRequest) {
  return apiPost('/PcPatrol/CreateItem', data)
}

/** 新增执勤地点 */
export function createLocation(data: CreatePatrolLocationRequest) {
  return apiPost('/PcPatrol/CreateLocation', data)
}

/** 删除巡查分类 */
export function deleteCategory(data: { id: string }) {
  return apiPost('/PcPatrol/DeleteCategory', data)
}

/** 删除巡查项 */
export function deleteItem(data: { id: string }) {
  return apiPost('/PcPatrol/DeleteItem', data)
}

/** 删除执勤地点 */
export function deleteLocation(data: { id: string }) {
  return apiPost('/PcPatrol/DeleteLocation', data)
}

/** 删除巡查人 */
export function deletePerson(data: { id: string }) {
  return apiPost('/PcPatrol/DeletePerson', data)
}

/** 获取巡查分类树 */
export function fetchCategoryTree(signal?: AbortSignal) {
  return apiGet<PatrolCategoryTree>('/PcPatrol/GetCategoryTree', { signal })
}

/** 获取巡查记录详情 */
export function fetchDetail(params?: DetailParams, signal?: AbortSignal) {
  return apiGet<PatrolRecordDetail>('/PcPatrol/GetDetail', { params, signal })
}

/** 获取巡查操作记录（按日期） */
export function fetchOps(params?: OpsParams, signal?: AbortSignal) {
  return apiGet<PatrolOpsVM>('/PcPatrol/GetOps', { params, signal })
}

/** 获取最近 N 条巡查操作记录（跨日期取操作流水） */
export function fetchLatestOps(params?: { limit?: number }, signal?: AbortSignal) {
  return apiGet<PatrolOpsItem[]>('/PcPatrol/GetLatestOps', { params, signal })
}

/** 获取巡查记录列表 */
export function fetchList(params?: ListParams, signal?: AbortSignal) {
  return apiGet<{ list: PatrolRecord[]; total: number }>('/PcPatrol/GetList', { params, signal })
}

/** 导出巡查记录（返回 Blob，需自行触发下载） */
export function exportList(params?: Omit<ListParams, 'page' | 'rows'>, signal?: AbortSignal) {
  return http.get<Blob>('/PcPatrol/ExportList', { params, signal, responseType: 'blob' })
}

/** 获取巡查人列表 */
export function fetchPeople(signal?: AbortSignal) {
  return apiGet<PatrolPerson[]>('/PcPatrol/GetPeople', { signal })
}

/** 编辑巡查分类 */
export function updateCategory(data: UpdatePatrolCategoryRequest) {
  return apiPost('/PcPatrol/UpdateCategory', data)
}

/** 启用禁用巡查分类 */
export function updateCategoryEnabled(data: UpdatePatrolCategoryEnabledRequest) {
  return apiPost('/PcPatrol/UpdateCategoryEnabled', data)
}

/** 编辑巡查项 */
export function updateItem(data: UpdatePatrolItemRequest) {
  return apiPost('/PcPatrol/UpdateItem', data)
}

/** 编辑执勤地点 */
export function updateLocation(data: UpdatePatrolLocationRequest) {
  return apiPost('/PcPatrol/UpdateLocation', data)
}

/** 编辑巡查人 */
export function updatePerson(data: UpdatePatrolPersonRequest) {
  return apiPost('/PcPatrol/UpdatePerson', data)
}

/** 获取预设意见列表（按巡查项过滤，按序号 + 添加时间排序） */
export function fetchPresetRemarks(
  params?: { itemId?: string; searchKey?: string },
  signal?: AbortSignal,
) {
  return apiGet<PatrolPresetRemark[]>('/PcPatrol/GetPresetRemarks', { params, signal })
}

/** 新增预设意见 */
export function createPresetRemark(data: CreatePresetRemarkRequest) {
  return apiPost('/PcPatrol/CreatePresetRemark', data)
}

/** 编辑预设意见 */
export function updatePresetRemark(data: UpdatePresetRemarkRequest) {
  return apiPost('/PcPatrol/UpdatePresetRemark', data)
}

/** 删除预设意见 */
export function deletePresetRemark(data: { id: string }) {
  return apiPost('/PcPatrol/DeletePresetRemark', data)
}

// ==================== 预设意见 ====================

/** 预设意见（按班级巡查子项维护，移动端备注快捷选择，PC 端统一维护） */
export interface PatrolPresetRemark {
  id: string
  /** 所属巡查项 ID（'0' = 通用意见，所有班级巡查项均可选用） */
  itemId: string
  /** 所属巡查项名称（通用为「通用」） */
  itemName: string
  content: string
  sortNo: number
  enabled: boolean
  createTime: string
}

export interface CreatePresetRemarkRequest {
  /** 所属巡查项 ID（'0' = 通用意见） */
  itemId: string
  content: string
  sortNo: number
}

export interface UpdatePresetRemarkRequest {
  id: string
  content?: string
  itemId?: string | null
  sortNo?: number | null
  enabled?: boolean | null
}

// ==================== Query Keys ====================

export const pcPatrolKeys = {
  all: ['pcPatrol'] as const,
  lists: (params?: ListParams) => [...pcPatrolKeys.all, 'list', params] as const,
  detail: (id: number) => [...pcPatrolKeys.all, 'detail', id] as const,
  ops: (date: string) => [...pcPatrolKeys.all, 'ops', date] as const,
  latestOps: () => [...pcPatrolKeys.all, 'latestOps'] as const,
  categoryTree: () => [...pcPatrolKeys.all, 'categoryTree'] as const,
  people: () => [...pcPatrolKeys.all, 'people'] as const,
  presetRemarks: () => [...pcPatrolKeys.all, 'presetRemarks'] as const,
}
