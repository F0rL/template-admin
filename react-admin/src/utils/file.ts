import { config } from '@/config'
import { message } from '@/utils/feedback'
import { useUserStore } from '@/stores/modules/user'

/** 将后端返回的相对路径拼接为完整 URL；http(s)/协议相对/data/blob 地址原样返回 */
export function resolveFileUrl(url?: string | null): string {
  if (!url) return ''
  // 历史脏数据兜底：曾把带 http://127.0.0.1 / localhost 的绝对 URL 存进业务表，
  // 换环境后必然失效 —— 剥掉旧 origin，按当前接口域名重新拼接
  const stripped = url.replace(/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/, '')
  if (stripped !== url) return config.FILE_BASE_URL + stripped
  if (/^(https?:)?\/\//.test(url) || /^(data|blob):/.test(url)) return url
  return config.FILE_BASE_URL + url
}

/** 允许上传的图片 MIME 类型 */
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/bmp']

/** 最大文件大小（MB） */
const MAX_IMAGE_SIZE_MB = 2

/**
 * 校验图片上传文件：格式 + 大小。
 * 校验失败时自动弹出错误提示并返回 false，成功返回 true。
 * （antd Upload 的 beforeUpload 直接收原生 File 对象）
 */
export function validateImageFile(file: File): boolean {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    message.error('只支持 jpg/jpeg/png/bmp 格式')
    return false
  }
  if (file.size / 1024 / 1024 > MAX_IMAGE_SIZE_MB) {
    message.error('图片大小不能超过 2MB')
    return false
  }
  return true
}

/**
 * 通过 fetch 直接下载二进制文件，绕过 axios 响应拦截器。
 * 文件流（blob）不含 success 字段，走 axios 拦截器会被误判为业务错误，
 * 因此这里用原生 fetch 携带 Bearer 令牌拉取并触发浏览器下载。
 */
export async function downloadBlob(
  url: string,
  filename: string,
  params?: Record<string, unknown>,
) {
  const { token } = useUserStore.getState()
  const query = params
    ? '?' +
      new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== null && v !== '')
          .map(([k, v]) => [k, String(v)]),
      ).toString()
    : ''

  let resp: Response
  try {
    resp = await fetch(config.API_BASE_URL + url + query, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  } catch {
    message.error('下载失败，请检查网络')
    return
  }

  if (!resp.ok) {
    message.error(`下载失败（${resp.status}）`)
    return
  }

  const contentType = resp.headers.get('content-type') ?? ''
  // 后端若返回 JSON 错误（如未授权），给出业务提示而不是下载乱码文件
  if (contentType.includes('application/json')) {
    try {
      const err = await resp.json()
      message.error(err?.msg ? String(err.msg) : '导出失败')
    } catch {
      message.error('导出失败')
    }
    return
  }

  const blob = await resp.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(objectUrl)
}
