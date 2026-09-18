<script setup lang="ts">
/**
 * 巡查明细表（班级巡查 / 学生督查共用同一套列）
 * maxHeight 透传 el-table 官方滚动方案：超出高度时表体内部滚动
 */
import type { PatrolRecordDetail } from '@/api/pcPatrol'
import ProTable from '@/components/ProTable/index.vue'
import type { ProTableColumn } from '@/components/ProTable/index.vue'

type DetailItem = NonNullable<PatrolRecordDetail['details']>[number]

withDefaults(
  defineProps<{
    items: DetailItem[]
    emptyText?: string
    /** 表格最大高度，透传 el-table 的 max-height（支持 calc/vh 字符串） */
    maxHeight?: string
  }>(),
  {
    emptyText: '暂无记录',
    maxHeight: 'calc(100vh - 380px)',
  },
)

const columns: ProTableColumn<DetailItem>[] = [
  { prop: 'itemName', label: '巡查项', minWidth: 120 },
  { prop: 'studentDepName', label: '班级', minWidth: 120 },
  { label: '结果', width: 90, align: 'center', slot: 'result' },
  { label: '积分', width: 70, align: 'center', slot: 'score' },
  { prop: 'remark', label: '备注', minWidth: 140, showOverflowTooltip: true },
]

function scoreText(change: number) {
  if (change > 0) return `+${change}`
  return String(change)
}

/** PatrolResult：0 未评 / 1 好评 / 2 待改进 / 3 中评 */
function resultTagType(result: number) {
  if (result === 1) return 'success'
  if (result === 2) return 'danger'
  if (result === 3) return 'warning'
  return 'info'
}
</script>

<template>
  <ProTable :columns="columns" :data="items" :empty-text="emptyText" :max-height="maxHeight">
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
</template>
