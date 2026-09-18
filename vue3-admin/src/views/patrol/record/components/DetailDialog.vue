<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import type { PatrolRecord, PatrolRecordDetail } from '@/api/pcPatrol'
import { pcPatrolKeys, fetchDetail } from '@/api/pcPatrol'
import ProTable from '@/components/ProTable/index.vue'
import type { ProTableColumn } from '@/components/ProTable/index.vue'
import DetailItemsTable from './DetailItemsTable.vue'

defineOptions({ name: 'PatrolRecordDetailDialog' })

const visible = ref(false)
const recordId = ref<number | null>(null)
const activeTab = ref('class')

const { data: detail, isFetching } = useQuery({
  queryKey: computed(() => pcPatrolKeys.detail(recordId.value!)),
  queryFn: ({ signal }) => fetchDetail({ id: recordId.value! }, signal),
  enabled: () => visible.value && recordId.value != null,
})

/** 关闭时清空 id，避免下次打开短暂展示上一条缓存 */
watch(visible, val => {
  if (!val) recordId.value = null
})

const people = computed(() => parsePeople(detail.value?.peopleJson))

function open(row: PatrolRecord) {
  recordId.value = row.id
  activeTab.value = 'class'
  visible.value = true
}

defineExpose({ open })

/** 教师执勤列 */
const dutyColumns: ProTableColumn<DutyItem>[] = [
  { prop: 'itemName', label: '所属', width: 110 },
  { prop: 'locationName', label: '执勤点位', minWidth: 120 },
  { prop: 'evaluatedTeacherName', label: '被评教师', minWidth: 100 },
  { label: '结果', width: 90, align: 'center', slot: 'result' },
  { label: '积分', width: 70, align: 'center', slot: 'score' },
  { prop: 'remark', label: '备注', minWidth: 140, showOverflowTooltip: true },
]

/** 特别事项列 */
const specialColumns: ProTableColumn<SpecialItem>[] = [
  { prop: 'sortNo', label: '序号', width: 70, align: 'center' },
  { prop: 'content', label: '内容', minWidth: 300 },
]
</script>

<script lang="ts">
function parsePeople(peopleJson?: string): string[] {
  if (!peopleJson) return []
  try {
    const arr = JSON.parse(peopleJson)
    if (Array.isArray(arr)) {
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

type DetailItem = NonNullable<PatrolRecordDetail['details']>[number]
type DutyItem = NonNullable<PatrolRecordDetail['dutyRecords']>[number]
type SpecialItem = NonNullable<PatrolRecordDetail['specials']>[number]
</script>

<template>
  <el-dialog
    v-model="visible"
    title="巡查记录详情"
    width="760px"
    :close-on-click-modal="false"
    destroy-on-close
    align-center
  >
    <div v-loading="isFetching">
      <!-- 基本信息 -->
      <div
        class="mb-3 flex shrink-0 flex-wrap items-center gap-x-6 gap-y-2 rounded bg-gray-50 px-4 py-3"
      >
        <div class="flex items-center">
          <span class="text-gray-400">巡查日期</span>
          <span class="ml-2 font-medium text-gray-800">{{ detail?.recordDate || '—' }}</span>
        </div>
        <div class="flex items-center">
          <span class="text-gray-400">学期</span>
          <span class="ml-2 font-medium text-gray-800">{{ detail?.termName || '—' }}</span>
        </div>
        <div class="flex items-center">
          <span class="text-gray-400">巡查人</span>
          <div class="ml-2 flex flex-wrap gap-1">
            <el-tag v-for="(p, i) in people" :key="i" size="small" effect="plain">
              {{ p }}
            </el-tag>
            <span v-if="!people.length" class="text-gray-300">—</span>
          </div>
        </div>
      </div>

      <!-- 分类明细：tab 切换，表格超出 max-height 时表体内部滚动 -->
      <el-tabs v-model="activeTab">
        <el-tab-pane :label="`班级巡查 (${detail?.details?.length ?? 0})`" name="class">
          <DetailItemsTable
            :items="(detail?.details ?? []) as DetailItem[]"
            empty-text="无班级巡查记录"
            max-height="calc(100vh - 380px)"
          />
        </el-tab-pane>
        <el-tab-pane :label="`学生督查 (${detail?.studentDetails?.length ?? 0})`" name="student">
          <DetailItemsTable
            :items="(detail?.studentDetails ?? []) as DetailItem[]"
            empty-text="无学生督查记录"
            max-height="calc(100vh - 380px)"
          />
        </el-tab-pane>
        <el-tab-pane :label="`教师执勤 (${detail?.dutyRecords?.length ?? 0})`" name="duty">
          <ProTable
            :columns="dutyColumns"
            :data="(detail?.dutyRecords ?? []) as DutyItem[]"
            empty-text="无教师执勤记录"
            max-height="calc(100vh - 380px)"
          >
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
        </el-tab-pane>
        <el-tab-pane :label="`特别事项 (${detail?.specials?.length ?? 0})`" name="special">
          <ProTable
            :columns="specialColumns"
            :data="(detail?.specials ?? []) as SpecialItem[]"
            empty-text="无特别事项"
            max-height="calc(100vh - 380px)"
          />
        </el-tab-pane>
      </el-tabs>
    </div>

    <template #footer>
      <el-button type="primary" @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>
