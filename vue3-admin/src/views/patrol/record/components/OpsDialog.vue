<script setup lang="ts">
/**
 * 巡查操作记录 — 对接 PcPatrol/GetOps
 * 与移动端 /mobile/patrol/ops 同源数据，PC 为管理员视角：班级巡查 / 学生督查 / 教师执勤全量展示。
 */
import { computed, ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import type { PatrolRecord, PatrolOpsItem } from '@/api/pcPatrol'
import { pcPatrolKeys, fetchOps } from '@/api/pcPatrol'
import ProTable from '@/components/ProTable/index.vue'
import type { ProTableColumn } from '@/components/ProTable/index.vue'

defineOptions({ name: 'PatrolRecordOpsDialog' })

const visible = ref(false)
const recordDate = ref('')

const { data: ops, isFetching } = useQuery({
  queryKey: computed(() => pcPatrolKeys.ops(recordDate.value)),
  queryFn: ({ signal }) => fetchOps({ date: recordDate.value }, signal),
  enabled: () => visible.value && !!recordDate.value,
})

/** 关闭时清空日期，避免下次打开短暂展示上一条缓存 */
watch(visible, val => {
  if (!val) recordDate.value = ''
})

function open(row: PatrolRecord) {
  recordDate.value = row.recordDate
  visible.value = true
}

defineExpose({ open })

const columns: ProTableColumn<PatrolOpsItem>[] = [
  { prop: 'opTime', label: '操作时间', width: 160 },
  { prop: 'operator', label: '操作人', width: 100 },
  { prop: 'detailType', label: '板块', width: 100, align: 'center', slot: 'detailType' },
  { prop: 'item', label: '巡查项', minWidth: 120 },
  { prop: 'target', label: '对象', minWidth: 140, showOverflowTooltip: true },
  { label: '结果', width: 90, align: 'center', slot: 'result' },
  { label: '积分', width: 70, align: 'center', slot: 'score' },
  { prop: 'remark', label: '备注', minWidth: 140, showOverflowTooltip: true },
]

function scoreText(change: number) {
  if (change > 0) return `+${change}`
  return String(change)
}

function resultTagType(result: number) {
  if (result === 1) return 'success'
  if (result === 2) return 'danger'
  if (result === 3) return 'warning'
  return 'info'
}

function detailTypeTagType(t: number) {
  return t === 1 ? 'primary' : t === 2 ? 'warning' : 'success'
}
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="`巡查操作记录 · ${recordDate}`"
    width="960px"
    :close-on-click-modal="false"
    destroy-on-close
    align-center
  >
    <div v-loading="isFetching">
      <!-- 汇总 -->
      <div
        class="mb-3 flex shrink-0 flex-wrap items-center gap-x-6 gap-y-2 rounded bg-gray-50 px-4 py-3"
      >
        <div class="flex items-center">
          <span class="text-gray-400">巡查人</span>
          <span class="ml-2 font-medium text-gray-800">{{ ops?.people || '未指定' }}</span>
        </div>
        <div class="flex items-center">
          <span class="text-gray-400">好评</span>
          <span class="ml-2 font-semibold text-green-600">{{ ops?.totalGood ?? 0 }}</span>
        </div>
        <div class="flex items-center">
          <span class="text-gray-400">中评</span>
          <span class="ml-2 font-semibold text-[#faad14]">{{ ops?.totalMid ?? 0 }}</span>
        </div>
        <div class="flex items-center">
          <span class="text-gray-400">待改进</span>
          <span class="ml-2 font-semibold text-red-500">{{ ops?.totalBad ?? 0 }}</span>
        </div>
        <div class="flex items-center">
          <span class="text-gray-400">合计积分</span>
          <span
            class="ml-2 font-semibold"
            :class="(ops?.totalScore ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'"
          >
            {{ scoreText(ops?.totalScore ?? 0) }}
          </span>
        </div>
      </div>

      <ProTable
        :columns="columns"
        :data="ops?.items ?? []"
        empty-text="该日期暂无操作记录"
        max-height="calc(100vh - 320px)"
      >
        <template #detailType="{ row }">
          <el-tag :type="detailTypeTagType(row.detailType)" size="small" effect="plain">
            {{ row.detailTypeName }}
          </el-tag>
        </template>
        <template #result="{ row }">
          <el-tag :type="resultTagType(row.result)" size="small">
            {{ row.resultName }}
          </el-tag>
        </template>
        <template #score="{ row }">
          <span :class="row.scoreChange >= 0 ? 'text-green-600' : 'text-red-500'">
            {{ scoreText(row.scoreChange) }}
          </span>
        </template>
      </ProTable>
    </div>

    <template #footer>
      <el-button type="primary" @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>
