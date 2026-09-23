import { useNavigate, useSearchParams } from 'react-router'
import { Button } from 'antd'
import errorSvg from '@/assets/img/error.svg'

/** 按 status 查询参数展示对应文案；支持 title / message 覆盖（与 vue3-admin 同约定） */
const statusMap: Record<string, { title: string; message: string }> = {
  '401': { title: '未授权', message: '登录已过期，请重新登录' },
  '403': { title: '没有权限', message: '抱歉，您没有权限访问此页面' },
  '404': { title: '页面不存在', message: '抱歉，您访问的页面不存在' },
  '500': { title: '服务器错误', message: '服务器内部错误，请稍后重试' },
  BusinessError: { title: '操作失败', message: '发生未知错误，请稍后重试' },
  NetworkError: { title: '网络错误', message: '网络连接失败，请检查网络后重试' },
}

/** 错误页：/error 与 404 兜底共用 */
export default function ErrorPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const status = searchParams.get('status') ?? '404'
  const defaultInfo = statusMap[status] ?? statusMap['404']
  const displayTitle = searchParams.get('title') ?? defaultInfo.title
  const displayMessage = searchParams.get('message') ?? defaultInfo.message

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <img src={errorSvg} className="h-[300px] w-auto object-contain" alt="错误" />
      <div className="ml-10">
        <div className="text-2xl font-bold text-[var(--ant-color-text)]">{displayTitle}</div>
        <div className="mt-1 mb-6 text-base text-[var(--ant-color-text-secondary)]">
          {displayMessage}
        </div>
        <div className="flex gap-3">
          <Button type="primary" onClick={() => navigate('/')}>
            返回首页
          </Button>
          <Button onClick={() => navigate(-1)}>返回上一页</Button>
        </div>
      </div>
    </div>
  )
}
