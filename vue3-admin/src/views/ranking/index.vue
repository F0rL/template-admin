<script setup lang="ts">
/**
 * 积分排行榜 — 左右布局
 * 左侧：学校 → 年级 → 班级树（复用家校通讯录年级/班级树）
 * 右侧：上部筛选（学生姓名、学期）· 下部统计卡 + 学生积分表格
 * 对接 PcRanking（GetClassRanking / GetGradeRanking）+ PcStudent（GetStudentDepTree）
 */
import { ref, computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import ProTable from '@/components/ProTable/index.vue'
import type { ProTableColumn } from '@/components/ProTable/index.vue'
import TermSelect from '@/components/TermSelect/index.vue'
import { pcAnalysisKeys, fetchClassRanking, type ClassRankingItem } from '@/api/pcAnalysis'
import { pcStudentKeys, fetchStudentDepTree } from '@/api/pcStudent'

defineOptions({ name: 'RankingList' })

// ─── 筛选 ───
const studentName = ref('')
const termCode = ref<string | undefined>(undefined)
const studentDepId = ref<number | undefined>(undefined)

// ─── 左侧：学校 → 年级 → 班级树 ───
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
    {
      id: 'school',
      label: '大兴路小学',
      type: 'school' as const,
      count: total,
      children: grades.map(g => ({
        id: `grade-${g.id}`,
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
    },
  ]
})

const activeNodeId = ref<string | number>('school')
const activeNodeLabel = ref('全校')

function onNodeClick(node: TreeNode) {
  if (node.type === 'grade') return // 年级仅展开/折叠，不筛选
  activeNodeId.value = node.id
  activeNodeLabel.value = node.label
  studentDepId.value = node.type === 'class' ? node.depId : undefined
}

// ─── 右侧：排行榜数据 ───
const rankingParams = computed(() => ({
  studentDepId: studentDepId.value,
  termCode: termCode.value,
  limit: 200,
}))

const { data: classData, isFetching: classLoading } = useQuery({
  queryKey: computed(() => pcAnalysisKeys.classRanking(rankingParams.value)),
  queryFn: ({ signal }) => fetchClassRanking(rankingParams.value, signal),
  enabled: () => !!termCode.value,
})

// 学生姓名前端过滤
const displayList = computed<ClassRankingItem[]>(() => {
  const list = classData.value ?? []
  const kw = studentName.value.trim()
  if (!kw) return list
  return list.filter(r => r.studentName.includes(kw))
})

// ─── 概要统计卡 ───
const summary = computed(() => {
  const list = classData.value ?? []
  if (!list.length) return { count: 0, avg: 0, max: 0, min: 0 }
  const scores = list.map(r => r.totalScore)
  const count = list.length
  const avg = Math.round(scores.reduce((s, r) => s + r, 0) / count)
  const max = Math.max(...scores)
  const min = Math.min(...scores)
  return { count, avg, max, min }
})

const columns: ProTableColumn<ClassRankingItem>[] = [
  { label: '排名', slot: 'rank', width: 80, align: 'center' },
  { prop: 'studentName', label: '学生姓名', minWidth: 120 },
  { prop: 'studentDepName', label: '班级', minWidth: 160 },
  { label: '五育积分', slot: 'wuyu', minWidth: 280 },
  { label: '总积分', slot: 'total', width: 110, align: 'center' },
  { label: '荣誉徽标', slot: 'badge', width: 150, align: 'center' },
]

// ─── 事件 ───
function handleSearch() {
  // 学生名前端即时过滤，学期变更由 vue-query 自动请求；此处规范化输入触发一次刷新
  studentName.value = studentName.value.trim()
}
function handleReset() {
  studentName.value = ''
  termCode.value = undefined
  activeNodeId.value = 'school'
  activeNodeLabel.value = '全校'
  studentDepId.value = undefined
}
</script>

<template>
  <div class="h-page flex gap-4">
    <!-- 左侧：学校 → 年级 → 班级树 -->
    <div class="panel-card h-full w-70 shrink-0 self-start overflow-y-auto">
      <div class="mb-2 flex items-center justify-between">
        <span class="text-sm font-semibold text-gray-700">组织架构</span>
      </div>
      <el-tree
        :data="treeData"
        node-key="id"
        :props="{ label: 'label', children: 'children' }"
        default-expand-all
        :expand-on-click-node="false"
        highlight-current
        :current-node-key="activeNodeId"
        @node-click="onNodeClick"
      >
        <template #default="{ data }">
          <div
            class="tree-node"
            :class="{ 'tree-node--active': activeNodeId === data.id }"
            :title="data.label"
          >
            <span class="tree-node__label">{{ data.label }}</span>
            <span v-if="data.count != null" class="tree-node__cnt">{{ data.count }}</span>
          </div>
        </template>
      </el-tree>
    </div>

    <!-- 右侧：筛选 + 统计 + 表格 -->
    <div class="flex min-w-0 flex-1 flex-col space-y-4">
      <!-- 筛选区 -->
      <div class="panel-card shrink-0">
        <el-form class="g-filter-form" label-width="80px" @submit.prevent>
          <el-row :gutter="16" class="gap-y-4">
            <el-col :span="8">
              <el-form-item label="学生名">
                <el-input
                  v-model="studentName"
                  placeholder="输入学生姓名"
                  clearable
                  class="!w-full"
                  @keyup.enter="studentName = studentName.trim()"
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

      <!-- 概要统计卡 -->
      <div class="grid shrink-0 grid-cols-2 gap-4 md:grid-cols-4">
        <div class="panel-card">
          <div class="text-xs text-gray-400">{{ activeNodeLabel }}学生数</div>
          <div class="mt-1 text-2xl font-semibold text-blue-600">
            {{ summary.count }}<span class="ml-1 text-sm font-normal text-gray-400">人</span>
          </div>
        </div>
        <div class="panel-card">
          <div class="text-xs text-gray-400">平均积分</div>
          <div class="mt-1 text-2xl font-semibold text-green-600">
            {{ summary.avg }}<span class="ml-1 text-sm font-normal text-gray-400">分</span>
          </div>
        </div>
        <div class="panel-card">
          <div class="text-xs text-gray-400">最高积分</div>
          <div class="mt-1 text-2xl font-semibold text-rose-500">
            {{ summary.max }}<span class="ml-1 text-sm font-normal text-gray-400">分</span>
          </div>
        </div>
        <div class="panel-card">
          <div class="text-xs text-gray-400">最低积分</div>
          <div class="mt-1 text-2xl font-semibold text-gray-500">
            {{ summary.min }}<span class="ml-1 text-sm font-normal text-gray-400">分</span>
          </div>
        </div>
      </div>

      <!-- 学生积分表格 -->
      <div class="panel-card flex min-h-0 flex-1 flex-col">
        <ProTable auto-height :columns="columns" :data="displayList" :loading="classLoading">
          <template #rank="{ row }">
            <span
              :class="row.rank <= 3 ? 'text-lg font-bold' : 'text-gray-600'"
              :style="{
                color:
                  row.rank === 1
                    ? '#f56c6c'
                    : row.rank === 2
                      ? '#e6a23c'
                      : row.rank === 3
                        ? '#67c23a'
                        : '',
              }"
              >{{ row.rank }}</span
            >
          </template>
          <template #wuyu="{ row }">
            <div class="flex flex-wrap gap-1 text-xs">
              <span class="rounded bg-amber-50 px-1.5 py-0.5 text-amber-600"
                >德 {{ row.wuyuDe }}</span
              >
              <span class="rounded bg-purple-50 px-1.5 py-0.5 text-purple-600"
                >智 {{ row.wuyuZhi }}</span
              >
              <span class="rounded bg-green-50 px-1.5 py-0.5 text-green-600"
                >体 {{ row.wuyuTi }}</span
              >
              <span class="rounded bg-pink-50 px-1.5 py-0.5 text-pink-600"
                >美 {{ row.wuyuMei }}</span
              >
              <span class="rounded bg-blue-50 px-1.5 py-0.5 text-blue-600"
                >劳 {{ row.wuyuLao }}</span
              >
            </div>
          </template>
          <template #total="{ row }">
            <span class="text-lg font-semibold text-blue-600">{{ row.totalScore }}</span>
          </template>
          <template #badge="{ row }">
            <span
              v-if="row.hasFFBadge"
              class="mr-1 inline-block rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-600"
              >🎖️ 锋范</span
            >
            <span
              v-if="row.isFFStar"
              class="inline-block rounded bg-yellow-50 px-1.5 py-0.5 text-xs text-yellow-600"
              >⭐ 五星</span
            >
          </template>
        </ProTable>
      </div>
    </div>
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
.tree-node--active .tree-node__label {
  color: #2b85e4;
  font-weight: 600;
}
.tree-node--active .tree-node__cnt {
  color: #2b85e4;
  background: #e6f2ff;
}
</style>
