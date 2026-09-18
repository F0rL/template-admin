<script setup lang="ts">
/**
 * 积分规则配置 — 成长树阶段阈值（Pane 2）
 */
import { ref, computed, watch } from 'vue'
import { useQuery, useMutation } from '@tanstack/vue-query'
import { ElMessageBox } from 'element-plus'
import TermSelect from '@/components/TermSelect/index.vue'
import {
  pcScoreRuleKeys,
  fetchGrowthStages,
  updateGrowthStages,
  resetGrowthStages,
  type GrowthStage,
} from '@/api/pcScoreRule'
import { message, withLoading } from '@/utils/feedback'

defineOptions({ name: 'GrowthTree' })
const props = defineProps<{ termCode?: string }>()
const emit = defineEmits<{ 'update:termCode': [value: string | undefined] }>()

// ───────────── 成长树阶段阈值 ─────────────
const { data: stages, refetch: refetchStages } = useQuery({
  queryKey: computed(() => pcScoreRuleKeys.growthStages({ termCode: props.termCode })),
  queryFn: ({ signal }) => fetchGrowthStages({ termCode: props.termCode }, signal),
})
const stageEditing = ref<GrowthStage[]>([])
watch(
  stages,
  v => {
    if (v) stageEditing.value = JSON.parse(JSON.stringify(v))
  },
  { immediate: true },
)

const DEFAULT_STAGES = [
  { name: '萌芽期', enName: 'Sprout', desc: '播种绿色种子，初步养成好习惯', thr: 0, max: 10 },
  { name: '抽枝期', enName: 'Branching', desc: '扎根成长，逐步发展多元素养', thr: 10, max: 50 },
  { name: '繁茂期', enName: 'Flourishing', desc: '素养全面发展，朝气蓬勃', thr: 50, max: 100 },
  { name: '硕果期', enName: 'Fruiting', desc: '长成锋范少年，收获成长成果', thr: 100, max: null },
]
const GS_TONES = ['#9bc46a', '#67ab3f', '#3f9d2e', '#2e7d1f']

const sortedStages = computed(() => [...stageEditing.value].sort((a, b) => a.sortNo - b.sortNo))
const previewSegments = computed(() => {
  const sorted = sortedStages.value
  if (!sorted.length) return []
  const lastMax = sorted[sorted.length - 1].max
  const span = lastMax === null ? 200 : lastMax
  return sorted.map((s, i) => {
    const lo = s.thr
    const hi = s.max === null ? span : s.max
    const widthPct = ((hi - lo) / span) * 100
    const label = s.max === null ? `${s.name} ≥${lo}` : `${s.name} ${lo}–${hi - 1}`
    return { name: s.name, label, widthPct, tone: GS_TONES[i] || '#2e7d1f' }
  })
})
const previewAxis = computed(() => {
  const sorted = sortedStages.value
  if (!sorted.length) return []
  const axes = sorted.map(s => String(s.thr))
  axes.push(sorted[sorted.length - 1].max === null ? '∞' : String(sorted[sorted.length - 1].max))
  return axes
})
function onStageMaxChange(idx: number, val: number | undefined) {
  const sorted = sortedStages.value
  const s = sorted[idx]
  if (!s) return
  if (val == null) {
    s.max = null
    return
  }
  if (val <= s.thr) {
    message.warning(`上限需 > 当前阈值 ${s.thr}`)
    return
  }
  s.max = val
  if (idx < sorted.length - 1) sorted[idx + 1].thr = val
}
function resetOneStage(idx: number) {
  const sorted = sortedStages.value
  const def = DEFAULT_STAGES[idx]
  const s = sorted[idx]
  if (!s || !def) return
  s.thr = def.thr
  s.max = def.max
  for (let i = 1; i < sorted.length; i++) sorted[i].thr = sorted[i - 1].max ?? sorted[i].thr
  message.success(`已恢复「${s.name}」为默认阈值`)
}
const updateStagesMut = useMutation({ mutationFn: (d: GrowthStage[]) => updateGrowthStages(d) })
async function saveStages() {
  await withLoading(updateStagesMut.mutateAsync(stageEditing.value), '保存中...')
  message.success('成长树阶段已保存')
  await refetchStages()
}
const resetStagesMut = useMutation({
  mutationFn: (d: { termCode?: string }) => resetGrowthStages(d),
})
async function handleResetStages() {
  await ElMessageBox.confirm(
    '恢复默认将覆盖自定义阶段（萌芽 0-10 / 抽枝 10-50 / 繁茂 50-100 / 硕果 100+），确定继续？',
    '恢复默认阶段',
    { type: 'warning' },
  )
  await withLoading(resetStagesMut.mutateAsync({ termCode: props.termCode }), '恢复中...')
  message.success('已恢复默认阶段')
  await refetchStages()
}
</script>

<template>
  <div class="space-y-4">
    <div class="rounded bg-blue-50 px-4 py-3 text-xs leading-relaxed text-gray-600">
      成长树用于移动端「报告页」展示学生本学期五育总积分对应的成长阶段。<br />
      ①
      <b>阈值（thr）</b
      >为该阶段<b>起始</b>积分（含），<b>上限（max）</b>为该阶段<b>结束</b>积分（不含，留空表示无上限）；②
      相邻阶段的阈值与上限<b>必须连续</b>；③ 改动实时保存并同步到移动端成长树渲染。
    </div>

    <div class="flex flex-wrap items-center gap-3 rounded bg-white p-4 shadow-sm">
      <TermSelect :model-value="termCode" @update:model-value="emit('update:termCode', $event)" />
      <el-button @click="handleResetStages"
        ><template #icon><IconEpRefreshLeft /></template>恢复默认阈值</el-button
      >
      <el-button type="primary" :loading="updateStagesMut.isPending.value" @click="saveStages"
        >保存</el-button
      >
      <span class="ml-auto text-xs text-gray-400"
        >移动端 report.js 将通过接口拉取本配置 · 阈值适用于所选学期</span
      >
    </div>

    <!-- 预览条 -->
    <div class="rounded bg-gradient-to-br from-[#f0f7ff] to-[#e6f2ff] px-5 py-4 shadow-sm">
      <div class="mb-2 text-sm font-semibold text-gray-700">
        🌳 阶段分布预览（按积分跨度比例展示）
      </div>
      <div class="flex h-8 overflow-hidden rounded border border-gray-200">
        <div
          v-for="(seg, i) in previewSegments"
          :key="i"
          class="flex items-center justify-center text-[11px] font-semibold text-white"
          :style="{ background: seg.tone, flex: seg.widthPct }"
        >
          <span class="truncate px-2">{{ seg.label }}</span>
        </div>
      </div>
      <div class="mt-1 flex text-[10px] text-gray-500">
        <div v-for="(ax, i) in previewAxis" :key="i" class="flex-1 text-center">{{ ax }}</div>
      </div>
    </div>

    <!-- 阶段表 -->
    <div class="panel-card">
      <el-table :data="sortedStages" border size="small">
        <el-table-column label="序号" width="70" align="center">
          <template #default="{ $index }">
            <span
              class="inline-flex h-7 w-7 items-center justify-center rounded-md font-bold text-white"
              :style="{ background: GS_TONES[$index] || '#2e7d1f' }"
              >{{ $index + 1 }}</span
            >
          </template>
        </el-table-column>
        <el-table-column label="阶段名称" width="140">
          <template #default="{ row }"><el-input v-model="row.name" size="small" /></template>
        </el-table-column>
        <el-table-column label="英文名" width="130">
          <template #default="{ row }"><el-input v-model="row.enName" size="small" /></template>
        </el-table-column>
        <el-table-column label="阶段描述" min-width="220">
          <template #default="{ row }"><el-input v-model="row.desc" size="small" /></template>
        </el-table-column>
        <el-table-column label="起点阈值 thr" width="130" align="center">
          <template #default="{ row }">
            <el-input-number
              :model-value="row.thr"
              :min="0"
              :max="1000"
              size="small"
              disabled
              style="width: 100px"
            />
            <div class="mt-0.5 text-[11px] text-gray-400">
              {{ row.sortNo === 1 ? '固定为 0' : '上一阶段上限联动' }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="结束上限 max" width="160" align="center">
          <template #default="{ row, $index }">
            <el-input-number
              :model-value="row.max"
              :min="0"
              :max="1000"
              size="small"
              style="width: 100px"
              :value-on-clear="null"
              @change="(v: number | undefined) => onStageMaxChange($index, v)"
            />
            <div class="mt-0.5 text-[11px] text-gray-400">
              {{ $index === sortedStages.length - 1 ? '留空 = 无上限' : '分（不含，需 > 阈值）' }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="积分范围" width="180" align="center">
          <template #default="{ row, $index }">
            <span
              class="inline-block rounded border border-[#e6efff] bg-[#f7faff] px-2 py-1 text-xs"
              :class="
                $index === sortedStages.length - 1
                  ? '!border-[#ffe58f] !bg-[#fff7e6] !text-[#ad6800]'
                  : ''
              "
            >
              {{ row.max === null ? `≥ ${row.thr} 分` : `${row.thr} ≤ 积分 < ${row.max}` }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }"><el-switch v-model="row.enabled" /></template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center">
          <template #default="{ $index }">
            <el-button type="primary" link @click="resetOneStage($index)">恢复此阶段</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>
