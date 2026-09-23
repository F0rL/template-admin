import { useEffect } from 'react'
import { App as AntdApp } from 'antd'
import { setFeedbackHooks } from '@/utils/feedback'

/**
 * 将 AntdApp 上下文实例（message / notification / modal）注入 feedback 工具，
 * 使非组件代码（utils / api 层）调用反馈能力时与主题、locale 上下文一致；卸载时置空。
 */
export function FeedbackBridge() {
  const app = AntdApp.useApp()

  useEffect(() => {
    setFeedbackHooks(app)
    return () => setFeedbackHooks(null)
  }, [app])

  return null
}
