<script setup lang="ts">
/**
 * 锋范认定记录 — 对接 PcFengfan
 *  GetRecognitions（列表）· Recognize（新增）· DeleteRecognition（删除）· GetProgress（集章进度，按学生，分页）
 *  布局：集章记录（默认，左） / 集章进度（右） 两个 Tab 切换
 */
import { ref, computed, watch } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { ElMessageBox } from 'element-plus'
import ProTable from '@/components/ProTable/index.vue'
import type { ProTableColumn } from '@/components/ProTable/index.vue'
import ClassOrDeptSelect from '@/components/ClassOrDeptSelect/index.vue'
import TermSelect from '@/components/TermSelect/index.vue'
import {
  pcFengfanKeys,
  fetchFFRecognitions,
  createFFRecognition,
  deleteFFRecognition,
  fetchFFProgress,
  FFBadgeType,
  FF_BADGE_MAP,
  type FFRecognitionItem,
  type FFRecognitionListParams,
  type FFProgressItem,
  type FFProgressParams,
} from '@/api/pcFengfan'
import { fetchStudentList, type StudentListItem } from '@/api/pcStudent'
import { message, withLoading } from '@/utils/feedback'

defineOptions({ name: 'FfRecognitionList' })
const queryClient = useQueryClient()

// ─── Tab ───
const activeTab = ref<'records' | 'progress'>('records')

// ─── 集章记录筛选 ───
const studentDepId = ref<string | undefined>(undefined)
const termCode = ref<string | undefined>(undefined)
const searchKey = ref('')
const badgeType = ref<FFBadgeType | undefined>(undefined)
const pageIndex = ref(1)
const pageSize = ref(10)

const params = computed<FFRecognitionListParams>(() => ({
  page: pageIndex.value,
  rows: pageSize.value,
  studentDepId: studentDepId.value,
  termCode: termCode.value,
  badgeType: badgeType.value,
  searchKey: searchKey.value.trim() || undefined,
}))

const { data, isFetching, refetch } = useQuery({
  queryKey: computed(() => pcFengfanKeys.recognitions(params.value)),
  queryFn: ({ signal }) => fetchFFRecognitions(params.value, signal),
  placeholderData: prev => prev,
})
const rows = computed(() => data.value?.list ?? [])
const total = computed(() => data.value?.total ?? 0)

const columns: ProTableColumn<FFRecognitionItem>[] = [
  { label: '徽章', slot: 'badge', minWidth: 120 },
  { prop: 'studentName', label: '学生', width: 100 },
  { prop: 'studentDepName', label: '班级' },
  { prop: 'termName', label: '学期', width: 200 },
  { prop: 'recognizerName', label: '认定教师' },
  { prop: 'recognizeTime', label: '认定时间', width: 200, align: 'center' },
  { prop: 'remark', label: '备注', minWidth: 140, showOverflowTooltip: true },
  { label: '操作', width: 90, fixed: 'right', slot: 'action' },
]

function handleReset() {
  studentDepId.value = undefined
  termCode.value = undefined
  searchKey.value = ''
  badgeType.value = undefined
  if (pageIndex.value === 1) refetch()
  else pageIndex.value = 1
}

// ─── 集章进度（分页 + 班级筛选 + 仅获章学生） ───
const progressDepId = ref<string | undefined>(undefined)
const progressTermCode = ref<string | undefined>(undefined)
const progressPageIndex = ref(1)
const progressPageSize = ref(10)

const progressParams = computed<FFProgressParams>(() => ({
  page: progressPageIndex.value,
  rows: progressPageSize.value,
  studentDepId: progressDepId.value,
  termCode: progressTermCode.value,
}))

const { data: progress, isFetching: progressFetching } = useQuery({
  queryKey: computed(() => pcFengfanKeys.progress(progressParams.value)),
  queryFn: ({ signal }) => fetchFFProgress(progressParams.value, signal),
  placeholderData: prev => prev,
})
const progressRows = computed(() => progress.value?.list ?? [])
const progressTotal = computed(() => progress.value?.total ?? 0)

// 切换筛选条件时回到第一页，避免停留在越界的页码
watch([progressDepId, progressTermCode], () => {
  progressPageIndex.value = 1
})

function queryProgress() {
  progressPageIndex.value = 1
}
function resetProgress() {
  progressDepId.value = undefined
  progressTermCode.value = undefined
  progressPageIndex.value = 1
}

const progressColumns: ProTableColumn<FFProgressItem>[] = [
  { prop: 'studentName', label: '学生', width: 100 },
  { prop: 'studentDepName', label: '班级' },
  { label: '阳光', slot: 'sun', width: 70, align: 'center' },
  { label: '智慧', slot: 'wisdom', width: 70, align: 'center' },
  { label: '自律', slot: 'self', width: 70, align: 'center' },
  { label: '爱心', slot: 'love', width: 70, align: 'center' },
  { label: '责任', slot: 'duty', width: 70, align: 'center' },
  { label: '已集章', slot: 'total', width: 90, align: 'center' },
  { label: '是否达标', slot: 'qualified', width: 90, align: 'center' },
]

// ─── 新增弹窗 ───
const formVisible = ref(false)
const form = ref<{ studentId: number | null; badgeType: FFBadgeType; remark: string }>({
  studentId: null,
  badgeType: FFBadgeType.Sun,
  remark: '',
})
const formRef = ref()

const createMut = useMutation({
  mutationFn: (d: {
    studentId: number
    badgeType: FFBadgeType
    termCode?: string
    remark?: string
  }) => createFFRecognition(d),
})
async function submitCreate() {
  if (!form.value.studentId) {
    message.warning('请选择学生')
    return
  }
  await withLoading(
    createMut.mutateAsync({
      studentId: form.value.studentId,
      badgeType: form.value.badgeType,
      termCode: termCode.value,
      remark: form.value.remark || undefined,
    }),
    '提交中...',
  )
  message.success('已新增认定')
  formVisible.value = false
  await queryClient.invalidateQueries({ queryKey: pcFengfanKeys.all })
}

// ─── 删除 ───
const delMut = useMutation({ mutationFn: (d: { id: number }) => deleteFFRecognition(d) })
async function handleDelete(row: FFRecognitionItem) {
  await ElMessageBox.confirm(
    `确认删除「${row.studentName}」的【${row.badgeTypeName}】认定？`,
    '删除确认',
    { type: 'warning' },
  )
  await withLoading(delMut.mutateAsync({ id: row.id }), '删除中...')
  message.success('已删除')
  await queryClient.invalidateQueries({ queryKey: pcFengfanKeys.all })
}

const BADGE_OPTIONS = (
  [
    FFBadgeType.Sun,
    FFBadgeType.Wisdom,
    FFBadgeType.SelfDiscipline,
    FFBadgeType.Love,
    FFBadgeType.Duty,
  ] as FFBadgeType[]
).map(v => ({ label: FF_BADGE_MAP[v].label, value: v }))

// ─── 学生选择器（远程搜索，基于 PcStudent/GetList） ───
const studentOptions = ref<StudentListItem[]>([])
const studentLoading = ref(false)
async function loadStudents(keyword?: string) {
  studentLoading.value = true
  try {
    const res = await fetchStudentList({
      page: 1,
      rows: 50,
      studentDepId: studentDepId.value,
      searchKey: keyword || undefined,
    })
    studentOptions.value = res.list ?? []
  } finally {
    studentLoading.value = false
  }
}
watch(formVisible, v => {
  if (v) {
    form.value.studentId = null
    loadStudents()
  }
})
</script>

<template>
  <div class="flex h-page flex-col">
    <!-- 筛选区（随 Tab 切换） -->
    <div class="panel-card mb-4 shrink-0">
      <el-form v-if="activeTab === 'records'" class="g-filter-form" label-width="80px">
        <el-row :gutter="16" class="gap-y-4">
          <el-col :span="8">
            <el-form-item label="班级">
              <ClassOrDeptSelect v-model="studentDepId" placeholder="选择班级" class="!w-full" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="学期">
              <TermSelect v-model="termCode" class="!w-full" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="徽章">
              <el-select v-model="badgeType" placeholder="徽章类型" clearable class="!w-full">
                <el-option
                  v-for="o in BADGE_OPTIONS"
                  :key="o.value"
                  :label="o.label"
                  :value="o.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="姓名">
              <el-input
                v-model="searchKey"
                placeholder="学生姓名"
                clearable
                @keyup.enter="refetch()"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8" :offset="8">
            <el-form-item>
              <div class="flex w-full justify-end">
                <el-button type="primary" @click="refetch()">
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

      <el-form v-else class="g-filter-form" label-width="80px">
        <el-row :gutter="16" class="gap-y-4">
          <el-col :span="8">
            <el-form-item label="班级">
              <ClassOrDeptSelect v-model="progressDepId" placeholder="选择班级" class="!w-full" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="学期">
              <TermSelect v-model="progressTermCode" class="!w-full" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item>
              <div class="flex w-full justify-end">
                <el-button type="primary" @click="queryProgress()">
                  <template #icon><IconEpSearch /></template>查询
                </el-button>
                <el-button @click="resetProgress()">
                  <template #icon><IconEpRefresh /></template>重置
                </el-button>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </div>

    <!-- Tab 操作 + 表格 -->
    <div class="panel-card flex min-h-0 flex-1 flex-col">
      <div class="mb-4 flex items-center">
        <el-tabs v-model="activeTab" class="ff-rec-tabs">
          <el-tab-pane label="集章记录" name="records" />
          <el-tab-pane label="集章进度" name="progress" />
        </el-tabs>
        <template v-if="activeTab === 'records'">
          <el-button class="ml-auto" type="primary" @click="formVisible = true">
            <template #icon><IconEpPlus /></template>新增认定
          </el-button>
        </template>
        <span v-else class="ml-auto text-xs text-gray-400">仅展示获得过章子的学生</span>
      </div>

      <!-- 集章记录 -->
      <ProTable
        auto-height
        v-if="activeTab === 'records'"
        v-model:current-page="pageIndex"
        v-model:page-size="pageSize"
        :columns="columns"
        :data="rows"
        :loading="isFetching"
        :total="total"
        paginated
      >
        <template #badge="{ row }">
          <el-tag
            :color="(FF_BADGE_MAP[row.badgeType]?.color || '#999') + '22'"
            :style="{
              color: FF_BADGE_MAP[row.badgeType]?.color || '#999',
              borderColor: (FF_BADGE_MAP[row.badgeType]?.color || '#999') + '55',
            }"
            effect="plain"
            size="small"
          >
            🏅 {{ row.badgeTypeName || FF_BADGE_MAP[row.badgeType]?.label }}
          </el-tag>
        </template>
        <template #action="{ row }">
          <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
        </template>
      </ProTable>

      <!-- 集章进度 -->
      <ProTable
        auto-height
        v-else
        v-model:current-page="progressPageIndex"
        v-model:page-size="progressPageSize"
        :columns="progressColumns"
        :data="progressRows"
        :loading="progressFetching"
        :total="progressTotal"
        paginated
      >
        <template #sun="{ row }"
          ><span :class="row.sunCount ? 'font-semibold text-green-600' : 'text-gray-300'">{{
            row.sunCount ? '✓' : '—'
          }}</span></template
        >
        <template #wisdom="{ row }"
          ><span :class="row.wisdomCount ? 'font-semibold text-green-600' : 'text-gray-300'">{{
            row.wisdomCount ? '✓' : '—'
          }}</span></template
        >
        <template #self="{ row }"
          ><span
            :class="row.selfDisciplineCount ? 'font-semibold text-green-600' : 'text-gray-300'"
            >{{ row.selfDisciplineCount ? '✓' : '—' }}</span
          ></template
        >
        <template #love="{ row }"
          ><span :class="row.loveCount ? 'font-semibold text-green-600' : 'text-gray-300'">{{
            row.loveCount ? '✓' : '—'
          }}</span></template
        >
        <template #duty="{ row }"
          ><span :class="row.dutyCount ? 'font-semibold text-green-600' : 'text-gray-300'">{{
            row.dutyCount ? '✓' : '—'
          }}</span></template
        >
        <template #total="{ row }"
          ><span class="font-semibold text-blue-600">{{ row.totalBadges }}/5</span></template
        >
        <template #qualified="{ row }">
          <el-tag :type="row.isQualified ? 'success' : 'info'" size="small">{{
            row.isQualified ? '已达标' : '未达标'
          }}</el-tag>
        </template>
      </ProTable>
    </div>

    <!-- 新增弹窗 -->
    <el-dialog
      v-model="formVisible"
      title="新增锋范认定"
      width="460px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" label-width="80px">
        <el-form-item label="学生" required>
          <el-select
            v-model="form.studentId"
            filterable
            remote
            reserve-keyword
            :remote-method="loadStudents"
            :loading="studentLoading"
            placeholder="搜索学生姓名（可按上方班级筛选）"
            class="!w-full"
            clearable
          >
            <el-option
              v-for="s in studentOptions"
              :key="s.id"
              :label="`${s.name}（${s.studentDepName || '未分班'}）`"
              :value="s.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="徽章类型">
          <el-select v-model="form.badgeType" class="!w-full">
            <el-option
              v-for="o in BADGE_OPTIONS"
              :key="o.value"
              :label="o.label"
              :value="o.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="200" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="createMut.isPending.value" @click="submitCreate"
          >确定</el-button
        >
      </template>
    </el-dialog>
  </div>
</template>
