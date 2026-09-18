<script setup lang="ts">
/**
 * 评价分析 — 对接 PcAnalysis（返回均为数组）
 *  增强：五育雷达图（替代饼图）· 总览统计卡 · 班级对比最高/最低高亮表
 */
import { ref, computed, shallowRef, watchEffect } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import type { ShallowRef } from 'vue'
import type { EChartsOption } from 'echarts'
import VChart from 'vue-echarts'
import '@/lib/echarts'
import ClassOrDeptSelect from '@/components/ClassOrDeptSelect/index.vue'
import TermSelect from '@/components/TermSelect/index.vue'
import {
  pcAnalysisKeys,
  fetchWuyuDistribution,
  fetchClassCompare,
  fetchDimensionHeatmap,
  fetchTeacherStats,
  fetchAnalysisTrend,
  fetchSectionOverview,
  type ClassCompareItem,
  type DimensionHeatmapItem,
  type TeacherStatsItem,
  type AnalysisTrendPoint,
  type SectionOverviewItem,
} from '@/api/pcAnalysis'

defineOptions({ name: 'AnalysisList' })

const studentDepId = ref<string | undefined>(undefined)
const termCode = ref<string | undefined>(undefined)
const params = computed(() => ({ studentDepId: studentDepId.value, termCode: termCode.value }))

const WUYU_COLOR: Record<string, string> = {
  de: '#faad14',
  zhi: '#722ed1',
  ti: '#52c41a',
  mei: '#eb2f96',
  lao: '#2b85e4',
}
const WUYU_LABEL: Record<string, string> = {
  de: '德育',
  zhi: '智育',
  ti: '体育',
  mei: '美育',
  lao: '劳育',
}
const WUYU_ORDER = ['de', 'zhi', 'ti', 'mei', 'lao']

// ─── 五育分布（数组） → 雷达图 ───
const { data: wuyu } = useQuery({
  queryKey: computed(() => pcAnalysisKeys.wuyu(params.value)),
  queryFn: ({ signal }) => fetchWuyuDistribution(params.value, signal),
})
const wuyuOption: ShallowRef<EChartsOption> = shallowRef({
  tooltip: {},
  radar: { radius: '65%', indicator: WUYU_ORDER.map(k => ({ name: WUYU_LABEL[k], max: 100 })) },
  series: [{ type: 'radar', data: [] as any[], areaStyle: { opacity: 0.18 } }],
})
watchEffect(() => {
  const list = wuyu.value ?? []
  if (!list.length) return
  const byWuyu: Record<string, number> = {}
  for (const w of list) byWuyu[w.wuyu] = (byWuyu[w.wuyu] ?? 0) + (w.score || 0)
  const values = WUYU_ORDER.map(k => byWuyu[k] ?? 0)
  const max = Math.max(1, ...values)
  wuyuOption.value = {
    ...wuyuOption.value,
    radar: {
      radius: '65%',
      indicator: WUYU_ORDER.map(k => ({ name: WUYU_LABEL[k], max: Math.ceil(max * 1.1) })),
    },
    series: [
      {
        type: 'radar',
        areaStyle: { opacity: 0.18, color: '#2b85e4' },
        lineStyle: { color: '#2b85e4', width: 2 },
        itemStyle: { color: '#2b85e4' },
        data: [{ value: values, name: '五育综合得分' }],
      },
    ],
  }
})

// ─── 班级对比 ───
const { data: classCompare } = useQuery({
  queryKey: computed(() => pcAnalysisKeys.classCompare(params.value)),
  queryFn: ({ signal }) => fetchClassCompare(params.value, signal),
})
const classOption: ShallowRef<EChartsOption> = shallowRef({
  tooltip: { trigger: 'axis' },
  grid: { left: 44, right: 16, bottom: 40, top: 16 },
  xAxis: { type: 'category', data: [] },
  yAxis: { type: 'value' },
  series: [],
})
watchEffect(() => {
  const list: ClassCompareItem[] = classCompare.value ?? []
  if (!list.length) return
  classOption.value = {
    ...classOption.value,
    xAxis: { type: 'category', data: list.map(c => c.studentDepName) },
    series: [
      {
        type: 'bar',
        data: list.map(c => c.totalScore),
        itemStyle: { color: '#409EFF', borderRadius: [4, 4, 0, 0] },
        label: { show: true, position: 'top', fontSize: 12, color: '#666' },
      },
    ],
  }
})

// ─── 三类评价活动卡（好学生 / 好公民 / 好孩子） ───
const { data: sectionOverview } = useQuery({
  queryKey: computed(() => pcAnalysisKeys.sectionOverview(params.value)),
  queryFn: ({ signal }) => fetchSectionOverview(params.value, signal),
})
const SECTION_COLOR: Record<string, string> = {
  好学生: '#2b85e4',
  好公民: '#52c41a',
  好孩子: '#faad14',
}
const sectionCards = computed(() =>
  (sectionOverview.value ?? []).map(s => ({
    ...s,
    color: SECTION_COLOR[s.sectionName] ?? '#2b85e4',
  })),
)

// 班级对比最高/最低高亮
const classScoreExtremes = computed(() => {
  const list: ClassCompareItem[] = classCompare.value ?? []
  if (!list.length) return { max: 0, min: 0 }
  const scores = list.map(c => c.totalScore)
  return { max: Math.max(...scores), min: Math.min(...scores) }
})
function classScoreClass(score: number) {
  if (classScoreExtremes.value.max === classScoreExtremes.value.min) return 'text-gray-700'
  if (score === classScoreExtremes.value.max) return 'font-semibold text-green-600'
  if (score === classScoreExtremes.value.min) return 'font-semibold text-red-500'
  return 'text-gray-700'
}

// ─── 总览卡（由班级对比派生） ───
const overview = computed(() => {
  const list: ClassCompareItem[] = classCompare.value ?? []
  const studentCount = list.reduce((s, c) => s + (c.studentCount || 0), 0)
  const totalScore = list.reduce((s, c) => s + (c.totalScore || 0), 0)
  const evalCount = list.reduce((s, c) => s + (c.evalCount || 0), 0)
  const avg = studentCount ? Math.round(totalScore / studentCount) : 0
  return { studentCount, totalScore, evalCount, avg }
})

// ─── 趋势 ───
const { data: trend } = useQuery({
  queryKey: computed(() => pcAnalysisKeys.trend(params.value)),
  queryFn: ({ signal }) => fetchAnalysisTrend(params.value, signal),
})
const trendOption: ShallowRef<EChartsOption> = shallowRef({
  tooltip: { trigger: 'axis' },
  legend: { data: ['评价次数', '积分数'], bottom: 4, icon: 'circle', itemWidth: 8 },
  grid: { left: 44, right: 16, bottom: 52, top: 16 },
  xAxis: { type: 'category', data: [] },
  yAxis: { type: 'value' },
  series: [],
})
watchEffect(() => {
  const points: AnalysisTrendPoint[] = trend.value ?? []
  if (!points.length) return
  trendOption.value = {
    ...trendOption.value,
    xAxis: { type: 'category', data: points.map(p => p.date) },
    series: [
      {
        name: '评价次数',
        type: 'line',
        smooth: true,
        data: points.map(p => p.evalCount),
        lineStyle: { color: '#409EFF', width: 2 },
        itemStyle: { color: '#409EFF' },
        areaStyle: { color: 'rgba(64,158,255,0.08)' },
      },
      {
        name: '积分数',
        type: 'line',
        smooth: true,
        data: points.map(p => p.scoreSum),
        lineStyle: { color: '#67C23A', width: 2 },
        itemStyle: { color: '#67C23A' },
        areaStyle: { color: 'rgba(103,194,58,0.08)' },
      },
    ],
  }
})

// ─── 维度热力图（维度 × 五育 扁平列表 → 表格） ───
const { data: heatmap } = useQuery({
  queryKey: computed(() => pcAnalysisKeys.heatmap(params.value)),
  queryFn: ({ signal }) => fetchDimensionHeatmap(params.value, signal),
})

// ─── 教师评价统计 ───
const { data: teacherStats } = useQuery({
  queryKey: computed(() => pcAnalysisKeys.teacherStats(params.value)),
  queryFn: ({ signal }) => fetchTeacherStats(params.value, signal),
})
</script>

<template>
  <div class="space-y-4">
    <!-- 筛选 -->
    <div class="flex flex-wrap items-center gap-3 rounded bg-white p-4 shadow-sm">
      <ClassOrDeptSelect v-model="studentDepId" placeholder="选择班级" />
      <TermSelect v-model="termCode" />
      <span class="text-xs text-gray-400">不选择班级时按全校统计</span>
    </div>

    <!-- 总览卡 -->
    <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
      <div class="rounded bg-white p-4 shadow-sm">
        <div class="text-xs text-gray-400">参评学生</div>
        <div class="mt-1 text-2xl font-semibold text-blue-600">
          {{ overview.studentCount }}<span class="ml-1 text-sm font-normal text-gray-400">人</span>
        </div>
      </div>
      <div class="rounded bg-white p-4 shadow-sm">
        <div class="text-xs text-gray-400">总积分</div>
        <div class="mt-1 text-2xl font-semibold text-amber-500">
          {{ overview.totalScore }}<span class="ml-1 text-sm font-normal text-gray-400">分</span>
        </div>
      </div>
      <div class="rounded bg-white p-4 shadow-sm">
        <div class="text-xs text-gray-400">人均积分</div>
        <div class="mt-1 text-2xl font-semibold text-green-600">
          {{ overview.avg }}<span class="ml-1 text-sm font-normal text-gray-400">分</span>
        </div>
      </div>
      <div class="rounded bg-white p-4 shadow-sm">
        <div class="text-xs text-gray-400">评价次数</div>
        <div class="mt-1 text-2xl font-semibold text-purple-600">
          {{ overview.evalCount }}<span class="ml-1 text-sm font-normal text-gray-400">次</span>
        </div>
      </div>
    </div>

    <!-- 三类评价活动卡 -->
    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div
        v-for="s in sectionCards"
        :key="s.section"
        class="flex items-center gap-4 rounded bg-white p-4 shadow-sm"
      >
        <div
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
          :style="{ backgroundColor: s.color }"
        >
          {{ s.sectionName.slice(0, 1) }}
        </div>
        <div>
          <div class="text-sm font-medium text-gray-700">{{ s.sectionName }}评价</div>
          <div class="mt-1 text-xs text-gray-400">
            评价 <span class="font-semibold" :style="{ color: s.color }">{{ s.evalCount }}</span> 次
            · 覆盖
            <span class="font-semibold" :style="{ color: s.color }">{{ s.studentCount }}</span> 人
          </div>
        </div>
      </div>
    </div>

    <!-- 图表区 -->
    <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <div class="panel-card">
        <h3 class="mb-3 text-base font-medium text-gray-700">五育综合得分（雷达）</h3>
        <div class="h-72 w-full">
          <VChart :option="wuyuOption" autoresize />
        </div>
      </div>
      <div class="panel-card">
        <h3 class="mb-3 text-base font-medium text-gray-700">近 7 天评价趋势</h3>
        <div class="h-72 w-full">
          <VChart :option="trendOption" autoresize />
        </div>
      </div>
      <div class="panel-card xl:col-span-2">
        <h3 class="mb-3 text-base font-medium text-gray-700">班级积分对比</h3>
        <div class="h-72 w-full">
          <VChart :option="classOption" autoresize />
        </div>
      </div>
    </div>

    <!-- 班级积分对比表（最高/最低高亮） -->
    <div class="panel-card">
      <h3 class="mb-3 text-base font-medium text-gray-700">跨班级积分对比</h3>
      <el-table :data="classCompare ?? []" border size="small">
        <el-table-column prop="studentDepName" label="班级" min-width="160" />
        <el-table-column prop="studentCount" label="学生数" width="100" align="center" />
        <el-table-column label="总积分" width="120" align="center">
          <template #default="{ row }"
            ><span :class="classScoreClass(row.totalScore)">{{ row.totalScore }}</span></template
          >
        </el-table-column>
        <el-table-column prop="evalCount" label="评价次数" width="120" align="center" />
        <el-table-column label="人均积分" width="120" align="center">
          <template #default="{ row }">{{
            row.studentCount ? Math.round(row.totalScore / row.studentCount) : 0
          }}</template>
        </el-table-column>
      </el-table>
      <p class="mt-2 text-xs text-gray-400">🟢 最高分 · 🔴 最低分（同班级时不高亮）</p>
    </div>

    <!-- 维度热力图（表格） -->
    <div class="panel-card">
      <h3 class="mb-3 text-base font-medium text-gray-700">维度评价统计</h3>
      <el-table :data="heatmap ?? []" border size="small">
        <el-table-column prop="dimName" label="维度" min-width="160" />
        <el-table-column label="归入五育" width="120" align="center">
          <template #default="{ row }">
            <el-tag
              :color="(WUYU_COLOR[row.wuyu] || '#999') + '22'"
              :style="{
                color: WUYU_COLOR[row.wuyu] || '#999',
                borderColor: (WUYU_COLOR[row.wuyu] || '#999') + '55',
              }"
              effect="plain"
              size="small"
            >
              {{ WUYU_LABEL[row.wuyu] || row.wuyu }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="count" label="评价次数" width="120" align="center" />
        <el-table-column prop="totalScore" label="累计积分" width="120" align="center" />
      </el-table>
    </div>

    <!-- 教师评价统计 -->
    <div class="panel-card">
      <h3 class="mb-3 text-base font-medium text-gray-700">教师评价统计</h3>
      <el-table :data="teacherStats ?? []" border size="small">
        <el-table-column prop="evaluatorName" label="教师" min-width="140" />
        <el-table-column prop="evalCount" label="评价次数" width="120" align="center" />
        <el-table-column prop="totalScore" label="累计积分" width="120" align="center" />
        <el-table-column label="人均积分" width="120" align="center">
          <template #default="{ row }">{{
            row.avgPerStudent?.toFixed?.(1) ?? row.avgPerStudent
          }}</template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>
