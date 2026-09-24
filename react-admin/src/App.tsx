import { App as AntdApp, ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { QueryClientProvider } from '@tanstack/react-query'
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
        </QueryClientProvider>
        {/* 全屏加载态独立于路由树，保证任意页面均可触发 */}
        <LoadingHost />
      </AntdApp>
    </ConfigProvider>
  )
}
