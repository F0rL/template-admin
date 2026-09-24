import { App as AntdApp, ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { BrowserRouter } from 'react-router'
import { config } from '@/config'
import { queryClient } from '@/lib/queryClient'
import { FeedbackBridge } from '@/components/FeedbackBridge'
import { LoadingHost } from '@/components/LoadingHost'
import { antdTheme } from '@/theme'
import RouterRoot from '@/router'

export default function App() {
  return (
    <ConfigProvider theme={antdTheme} locale={zhCN}>
      <AntdApp message={{ maxCount: 3 }} notification={{ maxCount: 3 }}>
        {/* FeedbackBridge 需位于 AntdApp 子级才能拿到上下文实例 */}
        <FeedbackBridge />
        <QueryClientProvider client={queryClient}>
          <BrowserRouter basename={config.BASE_URL}>
            <RouterRoot />
          </BrowserRouter>
          {/* 查询调试面板开关由 VITE_APP_ENABLE_DEVTOOLS 控制（经 config 出口，与 vue3-admin 一致），生产环境请保持关闭 */}
          {config.ENABLE_DEVTOOLS && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
        {/* 全屏加载态独立于路由树，保证任意页面均可触发 */}
        <LoadingHost />
      </AntdApp>
    </ConfigProvider>
  )
}
