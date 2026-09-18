<script setup lang="ts">
/**
 * 巡查记录 — 对接 PcPatrol/GetList + GetDetail + ExportDetail
 */
import { ref, computed, useTemplateRef } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import ProTable from '@/components/ProTable/index.vue'
import type { ProTableColumn } from '@/components/ProTable/index.vue'
import {
  pcPatrolKeys,
  fetchList,
  type PatrolRecord,
  type ListParams,
} from '@/api/pcPatrol'
import { message, withLoading } from '@/utils/feedback'
import { downloadBlob } from '@/utils/file'
import DetailDialog from './components/DetailDialog.vue'
import OpsDialog from './components/OpsDialog.vue'

defineOptions({ name: 'PatrolRecord' })

const detailDialogRef = useTemplateRef('detailDialogRef')
const opsDialogRef = useTemplateRef('opsDialogRef')

// ─── 筛选 ───
const dateRange = ref<[string, string] | null>(null)
const keyword = ref('')
// 学期筛选项已隐藏，变量保留：恢复时同时放开下方模板中的 TermSelect
const termCode = ref<string | undefined>(undefined)
const pageIndex = ref(1)
const pageSize = ref(10)

const params = computed<ListParams>(() => ({
  page: pageIndex.value,
  rows: pageSize.value,
  startDate: dateRange.value?.[0] || undefined,
  endDate: dateRange.value?.[1] || undefined,
  keyword: keyword.value.trim() || undefined,
  termCode: termCode.value || undefined,
}))

const { data, isFetching, refetch } = useQuery({
  queryKey: computed(() => pcPatrolKeys.lists(params.value)),
  queryFn: ({ signal }) => fetchList(params.value, signal),
  placeholderData: prev => prev,
})

const rows = computed(() => data.value?.list ?? [])
const total = computed(() => data.value?.total ?? 0)

// ─── 巡查人解析 ───
function parsePeople(peopleJson?: string): string[] {
  if (!peopleJson) return []
  try {
    const arr = JSON.parse(peopleJson)
    if (Array.isArray(arr)) {
      // 可能是 [{name}] 或 ["姓名"] 或 [{name, dept}]
      return arr
        .map((x: unknown) => {
          if (typeof x === 'string') return x
          if (x && typeof x === 'object' && 'name' in (x as Record<string, unknown>)) {
            return (x as { name: string }).name
          }
          return ''
        })
        .filter(Boolean)
    }
    return []
  } catch {
    return [peopleJson]
  }
}

const columns: ProTableColumn<PatrolRecord>[] = [
  { prop: 'recordDate', label: '巡查日期', width: 120, align: 'center' },
  { prop: 'termName', label: '学期', width: 150 },
  { label: '巡查人', slot: 'people', minWidth: 180 },
  { label: '班级巡查', slot: 'class', width: 120, align: 'center' },
  { label: '学生督查', slot: 'student', width: 120, align: 'center' },
  { label: '教师执勤', slot: 'duty', width: 120, align: 'center' },
  { label: '特别事项', slot: 'special', width: 100, align: 'center' },
  // 「提交人」= 最后一次保存该记录的人（CreateUserName 每次保存都被覆盖），与「巡查人」重复，已移除
  { label: '操作', width: 200, fixed: 'right', slot: 'action' },
]

// ─── 搜索 / 重置 ───
function handleSearch() {
  if (pageIndex.value === 1) refetch()
  else pageIndex.value = 1
}
function handleReset() {
  dateRange.value = null
  keyword.value = ''
  termCode.value = undefined
  if (pageIndex.value === 1) refetch()
  else pageIndex.value = 1
}

/** 打开详情弹框 */
function openDetail(row: PatrolRecord) {
  detailDialogRef.value?.open(row)
}

/** 打开操作记录弹框（按日期，含操作人 + 精确到秒的操作时间） */
function openOps(row: PatrolRecord) {
  opsDialogRef.value?.open(row)
}

/** 导出单条巡查记录（概况 + 班级巡查 / 学生督查 / 教师执勤 / 特别事项明细） */
async function handleExportRow(row: PatrolRecord) {
  await withLoading(
    downloadBlob('/PcPatrol/ExportDetail', `校务巡查记录_${row.recordDate}.xlsx`, { id: row.id }),
    '导出中...',
  )
  message.success('导出成功')
}
</script>

<template>
  <div class="flex h-page flex-col">
    <div class="panel-card mb-4 shrink-0">
      <!-- 关键字 / 起始日期 / 查询·重置 同一行 -->
      <el-form label-width="80px">
        <el-row :gutter="16">
          <el-col :span="7">
            <el-form-item label="关键字">
              <el-input
                v-model="keyword"
                placeholder="巡查人 / 提交人"
                clearable
                @keyup.enter="handleSearch"
              />
            </el-form-item>
          </el-col>
          <el-col :span="10">
            <el-form-item label="起始日期">
              <el-date-picker
                v-model="dateRange"
                type="daterange"
                value-format="YYYY-MM-DD"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="7">
            <el-form-item label-width="0">
              <div class="flex w-full justify-end gap-2">
                <el-button type="primary" @click="handleSearch">
                  <template #icon><IconEpSearch /></template>查询
                </el-button>
                <el-button @click="handleReset">
                  <template #icon><IconEpRefresh /></template>重置
                </el-button>
              </div>
            </el-form-item>
          </el-col>
          <!-- 学期筛选暂不开放：恢复时需在 script 中重新 import TermSelect 并放开此段
          <el-col :span="8">
            <el-form-item label="学期">
              <TermSelect v-model="termCode" />
            </el-form-item>
          </el-col>
          -->
        </el-row>
      </el-form>
    </div>
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
        <template #people="{ row }">
          <div class="flex flex-wrap gap-1">
            <el-tag
              v-for="(p, i) in parsePeople(row.peopleJson)"
              :key="i"
              size="small"
              effect="plain"
              >{{ p }}</el-tag
            >
          </div>
        </template>
        <template #class="{ row }">
          <span class="text-green-600">{{ row.detailGoodCount }}</span>
          <span class="mx-1 text-gray-300">/</span>
          <span style="color: #faad14">{{ row.detailMidCount }}</span>
          <span class="mx-1 text-gray-300">/</span>
          <span class="text-red-500">{{ row.detailBadCount }}</span>
          <span class="ml-1 text-xs text-gray-400">({{ row.detailCount }})</span>
        </template>
        <template #student="{ row }">
          <span class="text-green-600">{{ row.studentGoodCount }}</span>
          <span class="mx-1 text-gray-300">/</span>
          <span style="color: #faad14">{{ row.studentMidCount }}</span>
          <span class="mx-1 text-gray-300">/</span>
          <span class="text-red-500">{{ row.studentBadCount }}</span>
          <span class="ml-1 text-xs text-gray-400">({{ row.studentCount }})</span>
        </template>
        <template #duty="{ row }">
          <span class="text-green-600">{{ row.dutyGoodCount }}</span>
          <span class="mx-1 text-gray-300">/</span>
          <span style="color: #faad14">{{ row.dutyMidCount }}</span>
          <span class="mx-1 text-gray-300">/</span>
          <span class="text-red-500">{{ row.dutyBadCount }}</span>
          <span class="ml-1 text-xs text-gray-400">({{ row.dutyCount }})</span>
        </template>
        <template #special="{ row }">
          <span v-if="row.specialCount > 0" class="font-semibold text-blue-600">{{
            row.specialCount
          }}</span>
          <span v-else class="text-gray-300">0</span>
        </template>
        <template #action="{ row }">
          <el-button type="primary" link @click="openDetail(row)">详情</el-button>
          <el-button type="primary" link @click="openOps(row)">操作记录</el-button>
          <el-button type="primary" link @click="handleExportRow(row)">导出</el-button>
        </template>
      </ProTable>
    </div>
  </div>

  <DetailDialog ref="detailDialogRef" />
  <OpsDialog ref="opsDialogRef" />
</template>
