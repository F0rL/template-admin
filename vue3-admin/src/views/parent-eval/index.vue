<script setup lang="ts">
/**
 * 家长评价（好孩子）— 对接 PcEval.GetParentEvals / GetParentEvalDetail
 *
 * 布局：左侧班级树（默认选中顶层学校）+ 右侧三块
 *   1) 家长评价入口开关
 *   2) 筛选：关键字（仅学生姓名）/ 学期 / 查询 / 重置
 *   3) tab（全部 / 已评价 / 未评价）+ 表格
 *
 * tab → status：全部 = 0、已评价 = 1、未评价 = 2。
 * 「已评价」来自 a_eval_record；「全部 / 未评价」以班级花名册为基准，
 * 未提交的学生也占一行（id = 0、isEvaluated = false，不可查看详情）。
 */
import { ref, computed, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import ProTable from '@/components/ProTable/index.vue'
import type { ProTableColumn } from '@/components/ProTable/index.vue'
import TermSelect from '@/components/TermSelect/index.vue'
import ParentEvalDetail from './ParentEvalDetail.vue'
import { pcEvalKeys, fetchParentEvals, fetchParentEvalConfig, setParentEvalConfig, type ParentEvalItem, type ParentEvalListParams } from '@/api/pcEval'
import { fetchStudentDepTree, pcStudentKeys } from '@/api/pcStudent'
import { message, withLoading } from '@/utils/feedback'

defineOptions({ name: 'ParentEvalList' })

// ─── 左侧班级树 ───
interface TreeNode {
  id: string | number
  label: string
  type: 'school' | 'grade' | 'class'
  depId?: number
  count?: number
  children?: TreeNode[]
}

const { data: depTreeData } = useQuery({
  queryKey: pcStudentKeys.depTree(),
  queryFn: ({ signal }) => fetchStudentDepTree(signal),
  staleTime: 24 * 60 * 60 * 1000,
  gcTime: 24 * 60 * 60 * 1000,
})

const treeData = computed<TreeNode[]>(() => {
  const grades = depTreeData.value ?? []
  const total = grades.reduce(
    (sum, g) => sum + (g.children?.reduce((s, c) => s + c.studentCount, 0) ?? 0),
    0,
  )
  return [
    { id: 'school', label: '全校', type: 'school' as const, count: total },
    ...grades.map(g => ({
      id: g.id,
      label: g.name,
      type: 'grade' as const,
      count: g.children?.reduce((s, c) => s + c.studentCount, 0) ?? 0,
      children: g.children.map(c => ({
        id: c.id,
        label: c.fullName,
        type: 'class' as const,
        depId: c.id,
        count: c.studentCount,
      })),
    })),
  ]
})

// 默认选中顶层「全校」
const activeNodeId = ref<string | number>('school')
const studentDepId = ref<number | undefined>(undefined)

function onNodeClick(node: TreeNode) {
  if (node.type === 'grade') return // 年级仅展开/折叠，不筛选
  activeNodeId.value = node.id
  studentDepId.value = node.type === 'class' ? node.depId : undefined
  pageIndex.value = 1
}

// ─── 筛选 ───
const searchKey = ref('')
const termCode = ref<string | undefined>(undefined)
// 已提交的筛选值（点击查询后生效）
const submittedFilter = ref({ searchKey: '', termCode: undefined as string | undefined })

// ─── tab（全部 / 已评价 / 未评价 → status 0/1/2） ───
const activeTab = ref<'all' | 'evaluated' | 'unevaluated'>('all')
const TAB_STATUS: Record<typeof activeTab.value, number> = {
  all: 0,
  evaluated: 1,
  unevaluated: 2,
}

// ─── 分页 ───
const pageIndex = ref(1)
const pageSize = ref(10)

// ─── 列表（后端分页） ───
const params = computed<ParentEvalListParams>(() => ({
  page: pageIndex.value,
  rows: pageSize.value,
  studentDepId: studentDepId.value,
  termCode: submittedFilter.value.termCode,
  searchKey: submittedFilter.value.searchKey || undefined,
  status: TAB_STATUS[activeTab.value],
}))

const { data, isFetching } = useQuery({
  queryKey: computed(() => pcEvalKeys.parentList(params.value)),
  queryFn: ({ signal }) => fetchParentEvals(params.value, signal),
  placeholderData: prev => prev,
})
const rows = computed(() => data.value?.list ?? [])
const total = computed(() => data.value?.total ?? 0)

// 切换 tab 时回到第一页
watch(activeTab, () => {
  pageIndex.value = 1
})

// ─── 表格列 ───
const columns: ProTableColumn<ParentEvalItem>[] = [
  { prop: 'studentName', label: '学生', width: 100 },
  { prop: 'studentDepName', label: '班级' },
  { prop: 'evaluatorName', label: '家长', width: 100 },
  { prop: 'termName', label: '学期' },
  { label: '总星', slot: 'star', width: 100, align: 'center' },
  { prop: 'evalTime', label: '提交时间', align: 'center' },
  { label: '状态', slot: 'status', width: 90, align: 'center' },
  { label: '操作', width: 100, fixed: 'right', slot: 'action' },
]

// ─── 查询 / 重置 ───
function handleSearch() {
  submittedFilter.value = { searchKey: searchKey.value.trim(), termCode: termCode.value }
  pageIndex.value = 1
}
function handleReset() {
  searchKey.value = ''
  termCode.value = undefined
  submittedFilter.value = { searchKey: '', termCode: undefined }
  studentDepId.value = undefined
  activeNodeId.value = 'school'
  activeTab.value = 'all'
  pageIndex.value = 1
}

// ─── 详情抽屉（必须显式 import：ParentEvalDetail 位于 views 目录，不在自动注册范围） ───
const detailVisible = ref(false)
const detailRow = ref<ParentEvalItem | null>(null)
function openDetail(row: ParentEvalItem) {
  detailRow.value = row
  detailVisible.value = true
}

// ─── 家长评价入口开关 ───
const parentEvalOpen = ref(false)
const { isFetching: configLoading } = useQuery({
  queryKey: ['parentEvalConfig'],
  queryFn: async ({ signal }) => {
    const cfg = await fetchParentEvalConfig(signal)
    parentEvalOpen.value = cfg.open
    return cfg
  },
})
async function handleToggleOpen(val: boolean) {
  await withLoading(setParentEvalConfig({ open: val }), '保存中...')
  message.success(val ? '已开放家长评价入口' : '已关闭家长评价入口')
}
</script>

<template>
  <div class="h-page flex gap-4">
    <!-- 左侧：班级树（默认选中顶层学校） -->
    <div class="panel-card h-full w-70 shrink-0 self-start overflow-y-auto">
      <el-tree
        :data="treeData"
        node-key="id"
        :props="{ label: 'label', children: 'children' }"
        :current-node-key="activeNodeId"
        highlight-current
        default-expand-all
        :expand-on-click-node="false"
        @node-click="onNodeClick"
      >
        <template #default="{ data: node }">
          <div class="tree-node" :title="node.label">
            <span class="tree-node__label">{{ node.label }}</span>
            <span v-if="node.count != null" class="tree-node__cnt">{{ node.count }}</span>
          </div>
        </template>
      </el-tree>
    </div>

    <!-- 右侧 -->
    <div class="flex min-w-0 flex-1 flex-col space-y-4">
      <!-- 1) 家长评价入口开关 -->
      <div class="panel-card flex shrink-0 items-center gap-3">
        <el-switch
          v-model="parentEvalOpen"
          active-text="入口开放"
          inactive-text="入口关闭"
          inline-prompt
          :loading="configLoading"
          @change="handleToggleOpen"
        />
        <span class="text-sm text-gray-500">控制移动端家长是否可提交「好孩子」评价</span>
      </div>

      <!-- 2) 筛选 -->
      <div class="panel-card shrink-0">
        <el-form class="g-filter-form" label-width="80px" @submit.prevent="handleSearch">
          <el-row :gutter="16" class="gap-y-4">
            <el-col :span="8">
              <el-form-item label="关键字">
                <el-input
                  v-model="searchKey"
                  placeholder="学生姓名"
                  clearable
                  @keyup.enter="handleSearch"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="学期">
                <TermSelect v-model="termCode" class="!w-full" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item>
                <div class="flex w-full justify-end">
                  <el-button type="primary" @click="handleSearch">
                    <template #icon><IconEpSearch /></template>查询
                  </el-button>
                  <el-button @click="handleReset">
                    <template #icon><IconEpRefresh /></template>重置
                  </el-button>
                </div>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </div>

      <!-- 3) tab + 表格 -->
      <div class="panel-card flex min-h-0 flex-1 flex-col">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="全部" name="all" />
          <el-tab-pane label="已评价" name="evaluated" />
          <el-tab-pane label="未评价" name="unevaluated" />
        </el-tabs>
        <ProTable
          auto-height
          v-model:current-page="pageIndex"
          v-model:page-size="pageSize"
          :columns="columns"
          :data="rows"
          :loading="isFetching"
          :total="total"
          paginated
        >
          <template #star="{ row }">
            <span v-if="row.isEvaluated" class="text-amber-500">
              <span v-for="i in Math.min(row.totalScore, 7)" :key="i">★</span>
              <span v-if="row.totalScore > 7" class="ml-1 text-xs text-gray-500"
                >+{{ row.totalScore - 7 }}</span
              >
            </span>
            <span v-else class="text-gray-300">—</span>
          </template>
          <template #status="{ row }">
            <el-tag :type="row.isEvaluated ? 'success' : 'info'" size="small" effect="plain">
              {{ row.isEvaluated ? '已评价' : '未评价' }}
            </el-tag>
          </template>
          <template #action="{ row }">
            <el-button v-if="row.isEvaluated" type="primary" link @click="openDetail(row)"
              >查看</el-button
            >
            <span v-else class="text-xs text-gray-300">—</span>
          </template>
        </ProTable>
      </div>
    </div>
    <ParentEvalDetail v-if="detailRow" v-model:visible="detailVisible" :row="detailRow" />
  </div>
</template>

<style scoped>
.tree-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  min-width: 0;
  padding-right: 6px;
}
.tree-node__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tree-node__cnt {
  flex-shrink: 0;
  margin-left: 8px;
  padding: 0 7px;
  border-radius: 99px;
  font-size: 11px;
  line-height: 18px;
  color: #888;
  background: #f0f0f0;
}
</style>
