<script setup lang="ts">
/**
 * 概览（首页）— 按业务拆分为「素养评价 / 校务巡查 / 奖证库」三大统计块
 *
 * 素养评价：对接 PcDashboard（概览、五育分布、趋势）+ PcAnalysis（三类评价模块）
 * 校务巡查：对接 PcDashboard（今日进度）+ PcPatrol（累计记录、最近记录）
 * 奖证库：对接 PcAward（获奖总数、学生/教师/学校、已同步、级别分布）
 */
import { ref, computed, shallowRef, watchEffect } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useRouter } from 'vue-router'
import type { EChartsOption } from 'echarts'
import VChart from 'vue-echarts'
import '@/lib/echarts'
import iconMap from '@/icons'
import TermSelect from '@/components/TermSelect/index.vue'
import {
  pcDashboardKeys,
  fetchOverview,
  fetchWuyuDistribution,
  fetchTrend,
  fetchTodos,
  type DashboardTodo,
} from '@/api/pcDashboard'
import { pcAnalysisKeys, fetchSectionOverview } from '@/api/pcAnalysis'
import { pcAwardKeys, fetchAwardReportStats } from '@/api/pcAward'
import { pcPatrolKeys, fetchList as fetchPatrolList, fetchLatestOps } from '@/api/pcPatrol'

defineOptions({ name: 'Dashboard' })

const router = useRouter()
const termCode = ref<string | undefined>(undefined)

// ─── 素养评价：概览 ───
const { data: overview } = useQuery({
  queryKey: computed(() => [...pcDashboardKeys.overview(), termCode.value]),
  queryFn: ({ signal }) => fetchOverview({ termCode: termCode.value }, signal),
})

// ─── 素养评价：五育分布 ───
const { data: wuyu } = useQuery({
  queryKey: computed(() => [...pcDashboardKeys.wuyu(), termCode.value]),
  queryFn: ({ signal }) => fetchWuyuDistribution({ termCode: termCode.value }, signal),
})

const WUYU_COLOR: Record<string, string> = {
  de: '#faad14',
  zhi: '#722ed1',
  ti: '#52c41a',
  mei: '#eb2f96',
  lao: '#2b85e4',
}

const wuyuOption = shallowRef<EChartsOption>({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: 60, right: 40, bottom: 28, top: 16 },
  xAxis: { type: 'value', splitLine: { lineStyle: { color: '#f0f0f0' } } },
  yAxis: { type: 'category', data: [], axisLine: { show: false }, axisTick: { show: false } },
  series: [],
})

watchEffect(() => {
  const list = wuyu.value ?? []
  if (!list.length) return
  wuyuOption.value = {
    ...wuyuOption.value,
    yAxis: {
      type: 'category',
      data: list.map(w => w.name),
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: list.map(w => ({
          value: w.score,
          itemStyle: { color: WUYU_COLOR[w.wuyu] || '#2b85e4' },
        })),
        label: { show: true, position: 'right', fontSize: 12, color: '#666' },
        barWidth: 16,
        itemStyle: { borderRadius: [0, 8, 8, 0] },
      },
    ],
  }
})

// ─── 素养评价：三类评价模块（好学生 / 好公民 / 好孩子） ───
const { data: sectionsData } = useQuery({
  queryKey: computed(() => [...pcAnalysisKeys.sectionOverview(termCode.value ? { termCode: termCode.value } : {})]),
  queryFn: ({ signal }) => fetchSectionOverview({ termCode: termCode.value }, signal),
})

const SECTION_COLOR: Record<number, string> = {
  0: '#2b85e4',
  1: '#52c41a',
  2: '#faad14',
}

const sections = computed(() => sectionsData.value ?? [])

// ─── 素养评价：7 天趋势 ───
const { data: trend } = useQuery({
  queryKey: computed(() => [...pcDashboardKeys.trend(), termCode.value]),
  queryFn: ({ signal }) => fetchTrend({ termCode: termCode.value }, signal),
})

const trendOption = shallowRef<EChartsOption>({
  tooltip: { trigger: 'axis' },
  legend: { data: ['评价次数', '积分数'], bottom: 4, icon: 'circle', itemWidth: 8 },
  grid: { left: 44, right: 16, bottom: 52, top: 16 },
  xAxis: { type: 'category', data: [], boundaryGap: false },
  yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f0f0f0' } } },
  series: [],
})

watchEffect(() => {
  const points = trend.value ?? []
  if (!points.length) return
  trendOption.value = {
    ...trendOption.value,
    xAxis: { type: 'category', data: points.map(p => p.date), boundaryGap: false },
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

// ─── 校务巡查：累计记录 ───
const { data: patrolList } = useQuery({
  queryKey: pcPatrolKeys.lists({ page: 1, rows: 1 }),
  queryFn: ({ signal }) => fetchPatrolList({ page: 1, rows: 1 }, signal),
})

// ─── 校务巡查：最近操作记录 ───
const { data: latestOps } = useQuery({
  queryKey: pcPatrolKeys.latestOps(),
  queryFn: ({ signal }) => fetchLatestOps({ limit: 3 }, signal),
})

// ─── 奖证库：获奖统计报表（全量） ───
const { data: awardStats } = useQuery({
  queryKey: pcAwardKeys.reportStats({}),
  queryFn: ({ signal }) => fetchAwardReportStats(undefined, signal),
})

const LEVEL_COLORS = [
  '#faad14',
  '#722ed1',
  '#52c41a',
  '#2b85e4',
  '#eb2f96',
  '#13c2c2',
  '#fa8c16',
  '#a0d911',
]

const awardLevelOption = shallowRef<EChartsOption>({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: 60, right: 40, bottom: 28, top: 16 },
  xAxis: { type: 'value', splitLine: { lineStyle: { color: '#f0f0f0' } } },
  yAxis: { type: 'category', data: [], axisLine: { show: false }, axisTick: { show: false } },
  series: [],
})

watchEffect(() => {
  const levels = awardStats.value?.byLevel ?? []
  if (!levels.length) return
  const sorted = [...levels].sort((a, b) => b.count - a.count)
  awardLevelOption.value = {
    ...awardLevelOption.value,
    yAxis: {
      type: 'category',
      data: sorted.map(l => l.level),
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: sorted.map((l, i) => ({
          value: l.count,
          itemStyle: { color: LEVEL_COLORS[i % LEVEL_COLORS.length] },
        })),
        label: { show: true, position: 'right', fontSize: 12, color: '#666' },
        barWidth: 16,
        itemStyle: { borderRadius: [0, 8, 8, 0] },
      },
    ],
  }
})

// ─── 待办事项 ───
const { data: todos } = useQuery({
  queryKey: pcDashboardKeys.todos(),
  queryFn: ({ signal }) => fetchTodos(signal),
})

function goTodo(todo: DashboardTodo) {
  if (todo.action) router.push(todo.action)
}

function statusCls(status: string) {
  if (/待/.test(status)) return 'bg-amber-50 text-amber-600'
  if (/完成|已|通过/.test(status)) return 'bg-emerald-50 text-emerald-600'
  if (/驳回|拒绝|失败/.test(status)) return 'bg-red-50 text-red-500'
  return 'bg-gray-100 text-gray-500'
}

/** 巡查操作结果颜色：1好评 3中评 2待改进 0未评/取消 */
function patrolResultColor(result: number) {
  if (result === 1) return '#52c41a'
  if (result === 3) return '#faad14'
  if (result === 2) return '#f5222d'
  return '#c0c4cc'
}

// ─── 今日问候 ───
const today = new Date()
const todayText = computed(() => {
  const h = today.getHours()
  if (h < 6) return '凌晨好'
  if (h < 9) return '早上好'
  if (h < 12) return '上午好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

const dateText = computed(() => {
  const week = ['日', '一', '二', '三', '四', '五', '六'][today.getDay()]
  return `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日 星期${week}`
})

// ─── 指标卡片 ───
interface MetricCard {
  label: string
  value: string | number
  unit?: string
  color: string
  bg: string
  icon: string
  extra?: string
}

const totalScore = computed(() => (wuyu.value ?? []).reduce((s, w) => s + (w.score || 0), 0))

const evalCards = computed<MetricCard[]>(() => {
  const o = overview.value
  return [
    { label: '学生人数', value: o?.studentCount ?? 0, unit: '人', color: 'text-blue-600', bg: 'bg-blue-50', icon: 'ep:user' },
    { label: '班级数', value: o?.classCount ?? 0, unit: '个', color: 'text-cyan-600', bg: 'bg-cyan-50', icon: 'ep:grid' },
    { label: '累计评价', value: o?.totalEvalCount ?? 0, unit: '次', color: 'text-purple-600', bg: 'bg-purple-50', icon: 'ep:trend-charts' },
    { label: '累计积分', value: totalScore.value, unit: '分', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: 'ep:coin' },
    { label: '待认定锋范', value: o?.pendingFFCount ?? 0, unit: '条', color: 'text-pink-600', bg: 'bg-pink-50', icon: 'ep:star-filled' },
  ]
})

const patrolCards = computed<MetricCard[]>(() => {
  const o = overview.value
  return [
    { label: '今日班级巡查', value: o?.todayPatrolClassCount ?? 0, unit: '条', color: 'text-green-600', bg: 'bg-green-50', icon: 'ep:grid' },
    { label: '今日学生督查', value: o?.todayPatrolStudentCount ?? 0, unit: '条', color: 'text-cyan-600', bg: 'bg-cyan-50', icon: 'ep:user' },
    { label: '今日教师执勤', value: o?.todayPatrolDutyCount ?? 0, unit: '条', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: 'ep:location' },
    { label: '累计巡查天数', value: patrolList.value?.total ?? 0, unit: '天', color: 'text-purple-600', bg: 'bg-purple-50', icon: 'ep:data-line' },
  ]
})

const awardCards = computed<MetricCard[]>(() => {
  const a = awardStats.value
  return [
    { label: '获奖总数', value: a?.total ?? 0, unit: '项', color: 'text-amber-600', bg: 'bg-amber-50', icon: 'ep:trophy' },
    { label: '学生获奖', value: a?.studentCount ?? 0, unit: '项', color: 'text-blue-600', bg: 'bg-blue-50', icon: 'ep:user' },
    { label: '教师获奖', value: a?.teacherCount ?? 0, unit: '项', color: 'text-purple-600', bg: 'bg-purple-50', icon: 'ep:avatar' },
    { label: '学校获奖', value: a?.schoolCount ?? 0, unit: '项', color: 'text-pink-600', bg: 'bg-pink-50', icon: 'ep:school' },
    { label: '已同步好公民', value: a?.syncedCount ?? 0, unit: '次', color: 'text-green-600', bg: 'bg-green-50', icon: 'ep:medal' },
  ]
})
</script>

<template>
  <div class="space-y-4">
    <!-- 顶部工具栏 -->
    <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm">
      <div class="flex items-center gap-4">
        <div>
          <div class="text-base font-semibold text-gray-800">{{ todayText }}，欢迎回来</div>
          <div class="mt-0.5 text-xs text-gray-400">{{ dateText }}</div>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-sm text-gray-500">学期</span>
        <TermSelect v-model="termCode" />
        <span v-if="overview?.termName" class="text-sm text-gray-400">{{ overview.termName }}</span>
      </div>
    </div>

    <!-- 待办（快速入口） -->
    <div
      v-if="todos?.length"
      class="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 shadow-sm"
    >
      <span class="mr-1 flex items-center gap-1 text-sm text-gray-500">
        <component :is="iconMap['ep:bell']" class="text-base text-amber-500" />
        待办
      </span>
      <button
        v-for="t in todos"
        :key="t.title"
        class="flex items-center gap-2 rounded-full border border-gray-100 px-3 py-1 text-xs text-gray-600 transition-colors hover:border-blue-200 hover:bg-blue-50/50"
        @click="goTodo(t)"
      >
        <span>{{ t.title }}</span>
        <span :class="['rounded-full px-1.5 py-0.5 text-[11px] font-medium', statusCls(t.status)]">
          {{ t.status }}
        </span>
      </button>
    </div>

    <!-- ① 素养评价 -->
    <section class="rounded-xl bg-white p-5 shadow-sm">
      <div class="mb-4 flex items-center gap-2.5">
        <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-xl text-blue-600">
          <component :is="iconMap['ep:school']" />
        </span>
        <div>
          <h2 class="text-base font-semibold text-gray-800">素养评价</h2>
          <p class="text-xs text-gray-400">
            本学期评价与积分情况
            <span v-if="overview?.goodChildOpenStatus" class="ml-1 text-emerald-500">
              · 好孩子评价{{ overview.goodChildOpenStatus }}
            </span>
          </p>
        </div>
      </div>

      <!-- 指标 -->
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div
          v-for="c in evalCards"
          :key="c.label"
          class="flex items-center gap-3 rounded-xl border border-gray-50 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <div
            :class="['flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[22px]', c.bg, c.color]"
          >
            <component :is="iconMap[c.icon]" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-baseline gap-1">
              <span class="truncate text-xl font-semibold text-gray-800">{{ c.value }}</span>
              <span v-if="c.unit" class="text-xs text-gray-400">{{ c.unit }}</span>
            </div>
            <div class="mt-0.5 text-xs text-gray-400">{{ c.label }}</div>
            <div v-if="c.extra" class="mt-0.5 text-xs text-green-500">{{ c.extra }}</div>
          </div>
        </div>
      </div>

      <!-- 三类评价模块 -->
      <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div
          v-for="s in sections"
          :key="s.section"
          class="flex items-center justify-between rounded-xl bg-gray-50/60 px-4 py-3"
        >
          <div class="flex items-center gap-2">
            <span
              class="h-2.5 w-2.5 rounded-full"
              :style="{ background: SECTION_COLOR[s.section] || '#2b85e4' }"
            />
            <span class="text-sm font-medium text-gray-700">{{ s.sectionName }}</span>
          </div>
          <div class="flex items-center gap-4 text-xs text-gray-500">
            <span>评价 <b class="text-sm text-gray-700">{{ s.evalCount }}</b> 次</span>
            <span>覆盖 <b class="text-sm text-gray-700">{{ s.studentCount }}</b> 人</span>
          </div>
        </div>
      </div>

      <!-- 图表 -->
      <div class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div class="rounded-xl border border-gray-50 p-4">
          <h3 class="mb-3 text-sm font-medium text-gray-600">五育积分分布</h3>
          <div class="h-64 w-full">
            <VChart :option="wuyuOption" autoresize />
          </div>
        </div>
        <div class="rounded-xl border border-gray-50 p-4">
          <h3 class="mb-3 text-sm font-medium text-gray-600">近 7 天评价趋势</h3>
          <div class="h-64 w-full">
            <VChart :option="trendOption" autoresize />
          </div>
        </div>
      </div>
    </section>

    <!-- ② 校务巡查 -->
    <section class="rounded-xl bg-white p-5 shadow-sm">
      <div class="mb-4 flex items-center gap-2.5">
        <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-xl text-green-600">
          <component :is="iconMap['ep:location']" />
        </span>
        <div>
          <h2 class="text-base font-semibold text-gray-800">校务巡查</h2>
          <p class="text-xs text-gray-400">每日校园巡查记录</p>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div
          v-for="c in patrolCards"
          :key="c.label"
          class="flex items-center gap-3 rounded-xl border border-gray-50 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <div
            :class="['flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[22px]', c.bg, c.color]"
          >
            <component :is="iconMap[c.icon]" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-baseline gap-1">
              <span class="truncate text-xl font-semibold text-gray-800">{{ c.value }}</span>
              <span v-if="c.unit" class="text-xs text-gray-400">{{ c.unit }}</span>
            </div>
            <div class="mt-0.5 text-xs text-gray-400">{{ c.label }}</div>
            <div v-if="c.extra" class="mt-0.5 text-xs text-green-500">{{ c.extra }}</div>
          </div>
        </div>
      </div>

      <!-- 最近操作记录 -->
      <div class="mt-4 rounded-xl border border-gray-50 p-4">
        <h3 class="mb-3 text-sm font-medium text-gray-600">最近操作记录</h3>
        <div v-if="(latestOps?.length ?? 0) === 0" class="py-8 text-center text-sm text-gray-400">
          暂无操作记录
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="(op, i) in latestOps"
            :key="`${op.opTime}-${i}`"
            class="rounded-lg border border-gray-100 px-3 py-2.5"
          >
            <div class="flex items-center gap-2 text-sm">
              <span
                class="h-2 w-2 shrink-0 rounded-full"
                :style="{ background: patrolResultColor(op.result) }"
              />
              <span class="font-medium text-gray-800">{{ op.operator || '—' }}</span>
              <span class="truncate text-gray-500">{{ op.target }}</span>
              <span class="ml-auto shrink-0 text-xs text-gray-400">{{ op.opTime?.slice(5, 16) }}</span>
            </div>
            <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span class="text-gray-400">{{ op.detailTypeName }}</span>
              <span>{{ op.item }}</span>
              <span class="font-medium" :style="{ color: patrolResultColor(op.result) }">
                {{ op.resultName }}
              </span>
              <span
                v-if="op.scoreChange !== 0"
                :class="op.scoreChange > 0 ? 'text-emerald-600' : 'text-red-500'"
              >
                {{ op.scoreChange > 0 ? `+${op.scoreChange}` : op.scoreChange }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ③ 奖证库 -->
    <section class="rounded-xl bg-white p-5 shadow-sm">
      <div class="mb-4 flex items-center gap-2.5">
        <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-xl text-amber-600">
          <component :is="iconMap['ep:medal']" />
        </span>
        <div>
          <h2 class="text-base font-semibold text-gray-800">奖证库</h2>
          <p class="text-xs text-gray-400">全校获奖证书登记与同步</p>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div
          v-for="c in awardCards"
          :key="c.label"
          class="flex items-center gap-3 rounded-xl border border-gray-50 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <div
            :class="['flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[22px]', c.bg, c.color]"
          >
            <component :is="iconMap[c.icon]" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-baseline gap-1">
              <span class="truncate text-xl font-semibold text-gray-800">{{ c.value }}</span>
              <span v-if="c.unit" class="text-xs text-gray-400">{{ c.unit }}</span>
            </div>
            <div class="mt-0.5 text-xs text-gray-400">{{ c.label }}</div>
          </div>
        </div>
      </div>

      <div class="mt-4 rounded-xl border border-gray-50 p-4">
        <h3 class="mb-3 text-sm font-medium text-gray-600">获奖级别分布</h3>
        <div class="h-64 w-full">
          <VChart :option="awardLevelOption" autoresize />
        </div>
      </div>
    </section>
  </div>
</template>