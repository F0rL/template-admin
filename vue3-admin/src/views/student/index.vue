<script setup lang="ts">
/**
 * 学生管理 — 左侧年级/班级树 + 右侧学生列表
 * 对接 PcStudent（列表 / 年级班级树 / 成长报告）+ AppStudent（同步班级/学生）
 */
import { ref, computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { ElMessageBox } from 'element-plus'
import ProTable from '@/components/ProTable/index.vue'
import type { ProTableColumn } from '@/components/ProTable/index.vue'
import StudentReport from './StudentReport.vue'
import {
  pcStudentKeys,
  fetchStudentList,
  fetchStudentDepTree,
  syncStudentDeps,
  syncStudents,
  type StudentListItem,
  type StudentListParams,
} from '@/api/pcStudent'
import { message, withLoading } from '@/utils/feedback'

defineOptions({ name: 'StudentList' })

const queryClient = useQueryClient()

// ─── 筛选 ───
const searchKey = ref('')
const studentDepId = ref<number | undefined>(undefined)
const pageIndex = ref(1)
const pageSize = ref(10)

const queryParams = computed<StudentListParams>(() => ({
  page: pageIndex.value,
  rows: pageSize.value,
  studentDepId: studentDepId.value,
  graduatedStatus: -1,
  searchKey: searchKey.value.trim() || undefined,
}))

const { data, isFetching, refetch } = useQuery({
  queryKey: computed(() => pcStudentKeys.list(queryParams.value)),
  queryFn: ({ signal }) => fetchStudentList(queryParams.value, signal),
  placeholderData: prev => prev,
})

const tableData = computed(() => data.value?.list ?? [])
const total = computed(() => data.value?.total ?? 0)

const columns: ProTableColumn<StudentListItem>[] = [
  { type: 'index', label: '序号', width: 70, align: 'center' },
  { prop: 'name', label: '姓名', minWidth: 120 },
  { prop: 'studentDepName', label: '班级', minWidth: 160 },
  { label: '操作', width: 90, fixed: 'right', slot: 'action' },
]

// ─── 左侧年级/班级树 ───
interface TreeNode {
  id: string | number
  label: string
  type: 'all' | 'grade' | 'class'
  depId?: number
  count?: number
  children?: TreeNode[]
}

const { data: depTreeData } = useQuery({
  queryKey: pcStudentKeys.depTree(),
  queryFn: ({ signal }) => fetchStudentDepTree(signal),
  // 年级/班级树变化频率低，延长缓存：24h 内复用旧数据，切换/重进页面不重复请求
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
    { id: 'all', label: '全部学生', type: 'all' as const, count: total },
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

const activeNodeId = ref<string | number>('all')

function onNodeClick(node: TreeNode) {
  if (node.type === 'grade') return // 年级仅展开/折叠，不筛选
  activeNodeId.value = node.id
  studentDepId.value = node.type === 'class' ? node.depId : undefined
  pageIndex.value = 1
  refetch()
}

// ─── 同步（从企微家校通讯录） ───
const syncDepsMut = useMutation({ mutationFn: () => syncStudentDeps() })
const syncStuMut = useMutation({ mutationFn: () => syncStudents() })

async function handleSyncDeps() {
  await ElMessageBox.confirm(
    '从企业微信家校通讯录同步班级，可能覆盖本地修改，确定继续？',
    '同步班级',
    { type: 'warning' },
  )
  await withLoading(syncDepsMut.mutateAsync(), '同步班级中...')
  message.success('班级同步完成')
  await queryClient.invalidateQueries({ queryKey: pcStudentKeys.all })
}

async function handleSyncStudents() {
  await ElMessageBox.confirm(
    '从企业微信家校通讯录同步学生，可能覆盖本地修改，确定继续？',
    '同步学生',
    { type: 'warning' },
  )
  await withLoading(syncStuMut.mutateAsync(), '同步学生中...')
  message.success('学生同步完成')
  await queryClient.invalidateQueries({ queryKey: pcStudentKeys.all })
}

// ─── 搜索 / 重置 ───
function handleSearch() {
  if (pageIndex.value === 1) refetch()
  else pageIndex.value = 1
}
function handleReset() {
  searchKey.value = ''
  studentDepId.value = undefined
  activeNodeId.value = 'all'
  if (pageIndex.value === 1) refetch()
  else pageIndex.value = 1
}

// ─── 查看：成长报告 抽屉 ───
const reportVisible = ref(false)
const reportStudent = ref<StudentListItem | null>(null)
function openReport(row: StudentListItem) {
  reportStudent.value = row
  reportVisible.value = true
}
</script>

<template>
  <div class="h-page flex gap-4">
    <!-- 左侧：年级/班级树（默认展开） -->
    <div class="panel-card h-full w-70 shrink-0 self-start overflow-y-auto">
      <el-tree
        :data="treeData"
        node-key="id"
        :props="{ label: 'label', children: 'children' }"
        default-expand-all
        :expand-on-click-node="false"
        @node-click="onNodeClick"
      >
        <template #default="{ data }">
          <div
            class="tree-node"
            :title="data.label"
            :class="{ 'tree-node--active': activeNodeId === data.id }"
          >
            <span class="tree-node__label">{{ data.label }}</span>
            <span v-if="data.count != null" class="tree-node__cnt">{{ data.count }}</span>
          </div>
        </template>
      </el-tree>
    </div>

    <!-- 右侧：学生列表（固定占满剩余高度，表格内部滚动） -->
    <div class="flex min-w-0 flex-1 flex-col">
      <!-- 工具栏 -->
      <div class="panel-card mb-4 flex shrink-0 flex-wrap items-center">
        <el-input
          v-model="searchKey"
          placeholder="搜索姓名 / 学号"
          clearable
          class="!w-56"
          @keyup.enter="handleSearch"
        />
        <el-button class="ml-3" type="primary" @click="handleSearch">
          <template #icon><IconEpSearch /></template>查询
        </el-button>
        <el-button @click="handleReset">
          <template #icon><IconEpRefresh /></template>重置
        </el-button>
        <div class="ml-auto flex items-center">
          <el-button :loading="syncDepsMut.isPending.value" @click="handleSyncDeps">
            <template #icon><IconEpRefresh /></template>同步班级
          </el-button>
          <el-button :loading="syncStuMut.isPending.value" @click="handleSyncStudents">
            <template #icon><IconEpRefresh /></template>同步学生
          </el-button>
        </div>
      </div>

      <!-- 表格 -->
      <div class="panel-card flex min-h-0 flex-1 flex-col">
        <ProTable
          auto-height
          v-model:current-page="pageIndex"
          v-model:page-size="pageSize"
          :columns="columns"
          :data="tableData"
          :loading="isFetching"
          :total="total"
          paginated
        >
          <template #action="{ row }">
            <el-button type="primary" link @click="openReport(row)">查看</el-button>
          </template>
        </ProTable>
      </div>
    </div>

    <!-- 成长报告 抽屉（查看） -->
    <StudentReport v-if="reportStudent" v-model:visible="reportVisible" :student="reportStudent" />
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
