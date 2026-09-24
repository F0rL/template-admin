/**
 * ECharts 集中注册（按需引入，tree-shake 未用到的图表 / 组件）
 * ---------------------------------------------
 * 由 components/EChart 引入一次全局生效；新增图表类型时在此追加对应
 * chart / component / renderer，见 ADR-0010。
 */
// echarts 的模块注册函数名为 use，与 React Hook 同名：此处重命名导入，
// 避免 react-hooks/rules-of-hooks 误判为顶层调用 Hook
import { use as registerEchartsModules } from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

registerEchartsModules([
  CanvasRenderer,
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
])
