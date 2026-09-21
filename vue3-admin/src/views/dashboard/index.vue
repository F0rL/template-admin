<script setup lang="ts">
/**
 * 首页 — 静态数据示例图表（骨架示例页）
 *
 * 演示 vue-echarts 用法：Option 用 shallowRef 维护，更新时整体替换触发重绘。
 * 图表按需注册见 @/lib/echarts，新增图表类型时在彼处追加。
 * 接入真实数据时：将静态常量替换为 useQuery 拉取结果，参考系统管理页面的写法。
 */
import { shallowRef } from 'vue'
import type { EChartsOption } from 'echarts'
import VChart from 'vue-echarts'
import '@/lib/echarts'

defineOptions({ name: 'Dashboard' })

// 折线图示例：月度访问趋势
const lineOption = shallowRef<EChartsOption>({
  tooltip: { trigger: 'axis' },
  grid: { left: 48, right: 24, bottom: 28, top: 40 },
  xAxis: { type: 'category', boundaryGap: false, data: ['1月', '2月', '3月', '4月', '5月', '6月'] },
  yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f0f0f0' } } },
  series: [
    {
      name: '访问量',
      type: 'line',
      smooth: true,
      data: [820, 932, 901, 1290, 1330, 1520],
      areaStyle: { opacity: 0.08 },
      itemStyle: { color: '#2563eb' },
    },
    {
      name: '活跃用户',
      type: 'line',
      smooth: true,
      data: [620, 712, 681, 890, 930, 1120],
      areaStyle: { opacity: 0.08 },
      itemStyle: { color: '#10b981' },
    },
  ],
  legend: { top: 4 },
})

// 柱状图示例：模块使用统计
const barOption = shallowRef<EChartsOption>({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { left: 48, right: 24, bottom: 28, top: 40 },
  xAxis: { type: 'category', data: ['账户管理', '角色管理', '菜单管理', '组织架构', '日志管理'] },
  yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f0f0f0' } } },
  series: [
    {
      name: '操作次数',
      type: 'bar',
      barMaxWidth: 32,
      data: [320, 254, 180, 96, 512],
      itemStyle: { color: '#2563eb', borderRadius: [4, 4, 0, 0] },
    },
  ],
  legend: { top: 4 },
})

// 饼图示例：浏览器占比
const pieOption = shallowRef<EChartsOption>({
  tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
  legend: { bottom: 0 },
  series: [
    {
      name: '浏览器占比',
      type: 'pie',
      radius: ['40%', '65%'],
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      data: [
        { value: 1048, name: 'Chrome' },
        { value: 735, name: 'Edge' },
        { value: 580, name: 'Firefox' },
        { value: 484, name: 'Safari' },
      ],
    },
  ],
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="panel-card">
      <div class="mb-4 font-semibold">访问趋势</div>
      <div class="h-80 w-full">
        <VChart :option="lineOption" autoresize />
      </div>
    </div>
    <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <div class="panel-card">
        <div class="mb-4 font-semibold">模块使用统计</div>
        <div class="h-80 w-full">
          <VChart :option="barOption" autoresize />
        </div>
      </div>
      <div class="panel-card">
        <div class="mb-4 font-semibold">浏览器占比</div>
        <div class="h-80 w-full">
          <VChart :option="pieOption" autoresize />
        </div>
      </div>
    </div>
  </div>
</template>
