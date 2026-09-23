import { Spin } from 'antd'
import { useFeedbackLoading } from '@/utils/feedback'

/** 全屏加载态：feedback 的 showLoading / withLoading 驱动（zustand 嵌套计数器） */
export function LoadingHost() {
  const count = useFeedbackLoading(s => s.count)
  const text = useFeedbackLoading(s => s.text)

  if (count <= 0) return null
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[var(--ant-color-bg-mask)]">
      {/* antd Spin 的 tip 需配合子元素展示 */}
      <Spin size="large" tip={text}>
        <div className="h-16 w-40" />
      </Spin>
    </div>
  )
}
