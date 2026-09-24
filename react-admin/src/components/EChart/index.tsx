/**
 * EChart — ECharts 轻量封装（ADR-0010）
 * ---------------------------------------------
 * - 自写封装而非引入 echarts-for-react（社区封装维护停滞）
 * - ResizeObserver 自适应；初始化 / 销毁在 effect 中成对完成（StrictMode 兼容）
 * - option 直接传普通对象（React 无 Vue 深响应问题，不需要 shallowRef 等价物）
 * - 尺寸约定：外层容器定高，图表 100% 填充
 *
 * 用法：
 *   <div className="h-80"><EChart option={lineOption} /></div>
 */
import { useEffect, useRef } from 'react'
import { init } from 'echarts/core'
import type { EChartsOption } from 'echarts'
import '@/lib/echarts'

interface EChartProps {
  option: EChartsOption
  className?: string
}

function EChart({ option, className }: EChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<ReturnType<typeof init> | null>(null)

  // 初始化 + 尺寸自适应（仅挂载/卸载时执行）
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const chart = init(container)
    chartRef.current = chart
    const observer = new ResizeObserver(() => chart.resize())
    observer.observe(container)
    return () => {
      observer.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  // option 变更整体替换（notMerge，避免残留旧系列）
  useEffect(() => {
    chartRef.current?.setOption(option, true)
  }, [option])

  return <div ref={containerRef} className={className ?? 'h-full w-full'} />
}

export default EChart
