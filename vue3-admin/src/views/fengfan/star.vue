<script setup lang="ts">
/**
 * 五星锋范少年审核 — 对接 PcFengfan
 *  GetStarApplications（列表）· AuditStar（审核：approved bool）
 */
import { ref, computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import ProTable from '@/components/ProTable/index.vue'
import type { ProTableColumn } from '@/components/ProTable/index.vue'
import ClassOrDeptSelect from '@/components/ClassOrDeptSelect/index.vue'
import {
  pcFengfanKeys,
  fetchFFStarApplications,
  auditFFStar,
  FFStarStatus,
  FF_STAR_STATUS_MAP,
  type FFStarApplicationItem,
  type FFStarListParams,
} from '@/api/pcFengfan'
import { message, withLoading, prompt } from '@/utils/feedback'

defineOptions({ name: 'FfStarList' })
const queryClient = useQueryClient()

// ─── 筛选 ───
const status = ref<FFStarStatus | undefined>(undefined)
const studentDepId = ref<string | undefined>(undefined)
const pageIndex = ref(1)
const pageSize = ref(10)

const params = computed<FFStarListParams>(() => ({
  page: pageIndex.value,
  rows: pageSize.value,
  status: status.value,
  studentDepId: studentDepId.value,
}))

const { data, isFetching, refetch } = useQuery({
  queryKey: computed(() => pcFengfanKeys.starApps(params.value)),
  queryFn: ({ signal }) => fetchFFStarApplications(params.value, signal),
  placeholderData: prev => prev,
})
const rows = computed(() => data.value?.list ?? [])
const total = computed(() => data.value?.total ?? 0)

const columns: ProTableColumn<FFStarApplicationItem>[] = [
  { prop: 'studentName', label: '学生', width: 110 },
  { prop: 'studentDepName', label: '班级' },
  { label: '集章', slot: 'badge', minWidth: 140, align: 'center' },
  { prop: 'applyTermCode', label: '申报学期' },
  { prop: 'applyTime', label: '申报时间', width: 200, align: 'center' },
  { prop: 'applicantName', label: '申报人', width: 100 },
  { label: '状态', slot: 'status', width: 100, align: 'center' },
  { label: '操作', width: 160, fixed: 'right', align: 'center', slot: 'action' },
]

function handleReset() {
  status.value = undefined
  studentDepId.value = undefined
  if (pageIndex.value === 1) refetch()
  else pageIndex.value = 1
}

// ─── 审核 ───
const auditMut = useMutation({
  mutationFn: (d: { id: number; approved: boolean; auditOpinion?: string }) => auditFFStar(d),
})
async function handleAudit(row: FFStarApplicationItem, approved: boolean) {
  let opinion: string
  try {
    opinion = await prompt(
      `${approved ? '通过' : '驳回'}「${row.studentName}」的五星锋范申报，请填写${approved ? '意见' : '驳回原因'}：`,
      '审核',
      { confirmButtonText: '确定', cancelButtonText: '取消', inputPlaceholder: '选填' },
    )
  } catch {
    return
  }
  await withLoading(
    auditMut.mutateAsync({ id: row.id, approved, auditOpinion: opinion || undefined }),
    '提交中...',
  )
  message.success(approved ? '已通过' : '已驳回')
  await queryClient.invalidateQueries({ queryKey: pcFengfanKeys.all })
}
</script>

<template>
  <div class="flex h-page flex-col">
    <!-- 筛选区 -->
    <div class="panel-card mb-4 shrink-0">
      <el-form class="g-filter-form" label-width="80px">
        <el-row :gutter="16" class="gap-y-4">
          <el-col :span="8">
            <el-form-item label="班级">
              <ClassOrDeptSelect v-model="studentDepId" placeholder="选择班级" class="!w-full" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="状态">
              <el-select v-model="status" placeholder="审核状态" clearable class="!w-full">
                <el-option
                  v-for="(meta, k) in FF_STAR_STATUS_MAP"
                  :key="k"
                  :label="meta.label"
                  :value="Number(k)"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
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
    </div>

    <!-- 表格区 -->
    <div class="panel-card flex min-h-0 flex-1 flex-col">
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
        <template #badge="{ row }">
          <span class="text-sm">
            <span class="font-semibold text-blue-600">{{ row.badgeCount }}</span> 类
            <span class="mx-1 text-gray-300">/</span>
            <span class="text-gray-600">{{ row.termCount }} 学期</span>
          </span>
        </template>
        <template #status="{ row }">
          <el-tag :type="FF_STAR_STATUS_MAP[row.status]?.type" size="small">
            {{ row.statusName || FF_STAR_STATUS_MAP[row.status]?.label }}
          </el-tag>
        </template>
        <template #action="{ row }">
          <template v-if="row.status === FFStarStatus.Pending">
            <el-button type="success" link @click="handleAudit(row, true)">通过</el-button>
            <el-button type="danger" link @click="handleAudit(row, false)">驳回</el-button>
          </template>
          <el-tooltip
            v-else
            :content="`审核人：${row.auditorName || '-'} · 时间：${row.auditTime || '-'}`"
          >
            <el-button link disabled>{{
              row.status === FFStarStatus.Approved
                ? '已通过'
                : row.status === FFStarStatus.Rejected
                  ? '已驳回'
                  : '—'
            }}</el-button>
          </el-tooltip>
        </template>
      </ProTable>
    </div>
  </div>
</template>
