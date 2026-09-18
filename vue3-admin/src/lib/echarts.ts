import { use } from 'echarts/core'
import { BarChart, LineChart, PieChart, RadarChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  RadarComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import 'vue-echarts/style.css'

// 集中注册 echarts 模块（按需引入，tree-shake 未用到的图表/组件）
// 由 main.ts 引入一次全局生效；新增图表类型时在此追加对应 chart/component/renderer
use([
  CanvasRenderer,
  BarChart,
  LineChart,
  PieChart,
  RadarChart,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  RadarComponent,
])
