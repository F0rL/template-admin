<script setup lang="ts">
/**
 * 获奖统计 — 奖证库报表（按时间 / 分类 / 级别聚合）
 * 对接 /api/PcAward/GetReportStats
 */
import { ref, computed, shallowRef, watchEffect } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import type { EChartsOption } from 'echarts'
import VChart from 'vue-echarts'
import '@/lib/echarts'
import {
  fetchAwardReportStats,
  pcAwardKeys,
  type AwardReportStats,
  type AwardReportStatsParams,
} from '@/api/pcAward'
import {
  CATEGORY_OPTIONS,
  AWARD_LEVEL_OPTIONS,
  subCategoryOptionsFor,
  subCategoryLabelFor,
} from './dict'

defineOptions({ name: 'AwardStats' })

// ==================== 筛选条件 ====================

const startMonth = ref('')
const endMonth = ref('')
const categoryFilter = ref<number | undefined>(undefined)
const subCategoryFilter = ref<number | undefined>(undefined)
const awardLevelFilter = ref('')
const searchKey = ref('')
const appliedParams = ref<AwardReportStatsParams>({})

/** 当前大类下可选的获奖分类（教师竞赛类带论文、赛课后缀；未选大类时为全部分类） */
const subCategoryOptions = computed(() => {
  if (!categoryFilter.value) {
    return [1, 2, 3].map(v => ({ value: v, label: subCategoryLabelFor(0, v) }))
  }
  return subCategoryOptionsFor(categoryFilter.value)
})

function onCategoryChange() {
  const allowed = subCategoryOptions.value.map(o => o.value)
  if (subCategoryFilter.value != null && !allowed.includes(subCategoryFilter.value)) {
    subCategoryFilter.value = undefined
  }
}

/** yyyy-MM → yyyyMM */
function ymToCompact(s: string): string | undefined {
  if (!s) return undefined
  const [y, m] = s.split('-')
  return y && m ? `${y}${m}` : undefined
}

function handleSearch() {
  appliedParams.value = {
    startMonth: ymToCompact(startMonth.value),
    endMonth: ymToCompact(endMonth.value),
    category: categoryFilter.value,
    subCategory: subCategoryFilter.value,
    awardLevel: awardLevelFilter.value || undefined,
    searchKey: searchKey.value.trim() || undefined,
  }
}

function handleReset() {
  startMonth.value = ''
  endMonth.value = ''
  categoryFilter.value = undefined
  subCategoryFilter.value = undefined
  awardLevelFilter.value = ''
  searchKey.value = ''
  handleSearch()
}

// ==================== 查询 ====================

const { data: stats, isFetching } = useQuery({
  queryKey: computed(() => [...pcAwardKeys.reportStats(appliedParams.value)]),
  queryFn: ({ signal }) => fetchAwardReportStats(appliedParams.value, signal),
  initialData: {} as AwardReportStats,
})

const summary = computed(() => {
  const s = stats.value ?? ({} as AwardReportStats)
  return [
    { label: '获奖总数', value: s.total ?? 0 },
    { label: '学生获奖', value: s.studentCount ?? 0 },
    { label: '教师获奖', value: s.teacherCount ?? 0 },
    { label: '学校获奖', value: s.schoolCount ?? 0 },
    { label: '已同步好公民', value: s.syncedCount ?? 0 },
  ]
})

// ==================== 图表 ====================

const CATEGORY_COLOR: Record<number, string> = {
  1: '#2b85e4',
  2: '#722ed1',
  3: '#fa8c16',
}

/** 按月分布柱状图 */
const monthOption = shallowRef<EChartsOption>({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: 44, right: 16, bottom: 28, top: 16 },
  xAxis: { type: 'category', data: [], axisLabel: { rotate: 40 } },
  yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f0f0f0' } }, minInterval: 1 },
  series: [{ type: 'bar', data: [], barMaxWidth: 28, itemStyle: { borderRadius: [6, 6, 0, 0], color: '#2b85e4' } }],
})

watchEffect(() => {
  const byMonth = stats.value?.byMonth ?? []
  monthOption.value = {
    ...monthOption.value,
    xAxis: { type: 'category', data: byMonth.map(m => m.month), axisLabel: { rotate: 40 } },
    series: [
      {
        type: 'bar',
        data: byMonth.map(m => m.count),
        barMaxWidth: 28,
        itemStyle: { borderRadius: [6, 6, 0, 0], color: '#2b85e4' },
        label: { show: true, position: 'top', fontSize: 12, color: '#666' },
      },
    ],
  }
})

/** 按级别分布饼图 */
const levelOption = shallowRef<EChartsOption>({
  tooltip: { trigger: 'item' },
  legend: { bottom: 4, icon: 'circle', itemWidth: 8 },
  series: [
    {
      type: 'pie',
      radius: ['40%', '65%'],
      center: ['50%', '45%'],
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      data: [],
    },
  ],
})

watchEffect(() => {
  const byLevel = stats.value?.byLevel ?? []
  levelOption.value = {
    ...levelOption.value,
    series: [
      {
        type: 'pie',
        radius: ['40%', '65%'],
        center: ['50%', '45%'],
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        data: byLevel.map(l => ({ name: l.level, value: l.count })),
      },
    ],
  }
})

/** 按大类横向条形图（含小类明细表） */
const categoryOption = shallowRef<EChartsOption>({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: 60, right: 40, bottom: 28, top: 16 },
  xAxis: { type: 'value', splitLine: { lineStyle: { color: '#f0f0f0' } }, minInterval: 1 },
  yAxis: { type: 'category', data: [], axisLine: { show: false }, axisTick: { show: false } },
  series: [],
})

watchEffect(() => {
  const byCategory = stats.value?.byCategory ?? []
  categoryOption.value = {
    ...categoryOption.value,
    yAxis: {
      type: 'category',
      data: byCategory.map(c => c.categoryName),
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: byCategory.map(c => ({
          value: c.count,
          itemStyle: { color: CATEGORY_COLOR[c.category] ?? '#2b85e4' },
        })),
        label: { show: true, position: 'right', fontSize: 12, color: '#666' },
        barWidth: 16,
        itemStyle: { borderRadius: [0, 8, 8, 0] },
      },
    ],
  }
})

const subStatRows = computed(() => {
  const rows: { categoryName: string; subCategoryName: string; count: number }[] = []
  for (const c of stats.value?.byCategory ?? []) {
    for (const s of c.subs) {
      rows.push({ categoryName: c.categoryName, subCategoryName: s.subCategoryName, count: s.count })
    }
  }
  return rows
})
</script>

<template>
  <div class="space-y-4">
    <!-- 筛选区 -->
    <div class="panel-card">
      <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
        <el-date-picker
          v-model="startMonth"
          type="month"
          value-format="YYYY-MM"
          placeholder="起始月份"
          clearable
          class="!w-32"
        />
        <span class="text-gray-400">至</span>
        <el-date-picker
          v-model="endMonth"
          type="month"
          value-format="YYYY-MM"
          placeholder="结束月份"
          clearable
          class="!w-32"
        />
        <el-select
          v-model="categoryFilter"
          placeholder="获奖大类"
          clearable
          class="!w-28"
          @change="onCategoryChange"
        >
          <el-option v-for="c in CATEGORY_OPTIONS" :key="c.value" :label="c.label" :value="c.value" />
        </el-select>
        <el-select
          v-model="subCategoryFilter"
          placeholder="获奖分类"
          clearable
          class="!w-28"
        >
          <el-option
            v-for="s in subCategoryOptions"
            :key="s.value"
            :label="s.label"
            :value="s.value"
          />
        </el-select>
        <el-select
          v-model="awardLevelFilter"
          placeholder="获奖级别"
          clearable
          filterable
          allow-create
          class="!w-28"
        >
          <el-option v-for="l in AWARD_LEVEL_OPTIONS" :key="l" :label="l" :value="l" />
        </el-select>
        <el-input
          v-model="searchKey"
          class="!w-52"
          placeholder="搜索获奖者 / 获奖名称 / 颁奖单位"
          clearable
          @keyup.enter="handleSearch"
        />
        <el-button type="primary" :loading="isFetching" @click="handleSearch">
          <template #icon><IconEpSearch /></template>查询
        </el-button>
        <el-button @click="handleReset">
          <template #icon><IconEpRefresh /></template>重置
        </el-button>
      </div>
    </div>

    <!-- 汇总卡片 -->
    <div class="grid grid-cols-2 gap-4 md:grid-cols-5">
      <div v-for="s in summary" :key="s.label" class="panel-card">
        <div class="text-xs text-gray-500">{{ s.label }}</div>
        <div class="mt-1 text-2xl font-semibold text-gray-800">{{ s.value }}</div>
      </div>
    </div>

    <!-- 图表区 -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div class="panel-card">
        <div class="mb-2 text-sm font-medium text-gray-700">按月分布</div>
        <VChart :option="monthOption" autoresize style="height: 214px" />
      </div>
      <div class="panel-card">
        <div class="mb-2 text-sm font-medium text-gray-700">获奖级别分布</div>
        <VChart :option="levelOption" autoresize style="height: 214px" />
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div class="panel-card">
        <div class="mb-2 text-sm font-medium text-gray-700">获奖大类统计</div>
        <VChart :option="categoryOption" autoresize style="height: 174px" />
      </div>
      <div class="panel-card">
        <div class="mb-2 text-sm font-medium text-gray-700">分类明细</div>
        <el-table :data="subStatRows" size="small" max-height="174">
          <el-table-column prop="categoryName" label="获奖大类" width="100" />
          <el-table-column prop="subCategoryName" label="获奖分类" />
          <el-table-column prop="count" label="数量" width="90" align="center" />
        </el-table>
      </div>
    </div>
  </div>
</template>
