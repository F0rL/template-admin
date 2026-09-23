/**
 * antd 反馈类能力统一封装（message / notification / modal / loading）
 *
 * ------------------------------------------------------------------
 * 实例来源
 * ------------------------------------------------------------------
 * message / notification / modal 实例来自 <AntdApp> 上下文（App.useApp），
 * 由 <FeedbackBridge/>（App.tsx 内、AntdApp 子级）通过 setFeedbackHooks 注入，
 * 保证与 ConfigProvider 主题、locale 上下文一致；
 * App 挂载前的极端情况退化为 antd 静态方法（不消费主题上下文，仅应急）。
 *
 * 全局配置（maxCount / top 等）在 App.tsx 的 <AntdApp message={...}> 上统一设置。
 *
 * ------------------------------------------------------------------
 * 导入
 * ------------------------------------------------------------------
 *   import { message, notify, confirm, withLoading, showLoading } from '@/utils/feedback'
 *
 * ------------------------------------------------------------------
 *   message — antd message 轻提示（顶部居中）
 * ------------------------------------------------------------------
 *   message.success('保存成功')                     // 成功
 *   message.error('操作失败')                       // 错误
 *   message.warning('请注意检查')                    // 警告
 *   message.info('权限变更，请重新登录')              // 提示
 *
 *   message.success('保存成功', { duration: 5 })     // 覆盖时长（秒）
 *   message.create({ content: '自定义', type: 'error', duration: 0 }) // 完全自定义
 *   message.closeAll()                              // 关闭所有
 *
 * ------------------------------------------------------------------
 *   notify — antd notification 通知提醒（右上角）
 * ------------------------------------------------------------------
 *   notify.success('数据已同步')                          // 仅描述
 *   notify.success('数据已同步', '操作成功')               // 描述 + 标题
 *   notify.success('数据已同步', { duration: 5 })         // 描述 + 选项
 *   notify.success('数据已同步', '操作成功', { duration: 0 }) // 三元组
 *
 *   notify.error('文件上传失败')
 *   notify.warning('存储空间不足', '请及时清理')
 *   notify.create({ message: '紧急', description: '服务器异常', type: 'error' })
 *   notify.closeAll()
 *
 * ------------------------------------------------------------------
 *   confirm — 二次确认（Promise<boolean>：true=确定，false=取消/关闭）
 * ------------------------------------------------------------------
 *   if (await confirm('确定删除该记录？')) {
 *     await withLoading(api.delete(id), '删除中...')
 *     message.success('已删除')
 *   }
 *
 * ------------------------------------------------------------------
 *   showLoading / withLoading — 全屏加载态（<LoadingHost/> 渲染）
 * ------------------------------------------------------------------
 *   // 自动跟随 Promise
 *   const list = await withLoading(api.getList(), '加载列表中...')
 *
 *   // 也支持函数（延迟执行）
 *   const result = await withLoading(() => api.submit(form), '提交中...')
 *
 *   // 手动控制（一般用 withLoading 即可）
 *   const loading = showLoading('数据加载中...')
 *   loading.close()
 * ==================================================================
 */
import type { CSSProperties, ReactNode } from 'react'
import {
  App as AntdApp,
  message as staticMessage,
  notification as staticNotification,
  Modal as StaticModal,
} from 'antd'
import { create } from 'zustand'

type AppHooks = ReturnType<typeof AntdApp.useApp>

let hooks: AppHooks | null = null

/** 由 <FeedbackBridge/>（App.tsx 内、AntdApp 子级）注入上下文实例；卸载时传 null */
export function setFeedbackHooks(next: AppHooks | null) {
  hooks = next
}

function api(): AppHooks {
  if (hooks) return hooks
  // 兜底：App 挂载前调用的极端场景。静态方法不消费 ConfigProvider 上下文，仅应急使用
  return {
    message: staticMessage,
    notification: staticNotification,
    modal: StaticModal as unknown as AppHooks['modal'],
  }
}

// ============== Message ==============

export type MessageType = 'success' | 'error' | 'warning' | 'info'

/** message 单条附加选项（完整配置走 message.create / antd ArgsProps） */
export type MessageOptions = {
  /** 自动关闭时长（秒），antd 默认 3 */
  duration?: number
  /** 去重 key：相同 key 的消息只保留最新一条 */
  key?: string | number
  className?: string
  style?: CSSProperties
}

/** 完全自定义一条 message（等价 antd message.open） */
export function createMessage(options: MessageOptions & { content: ReactNode; type?: MessageType }) {
  return api().message.open(options)
}

function makeMessage(type: MessageType) {
  return (content: ReactNode, options: MessageOptions = {}) =>
    api().message.open({ content, type, ...options })
}

export const message = {
  success: makeMessage('success'),
  error: makeMessage('error'),
  warning: makeMessage('warning'),
  info: makeMessage('info'),
  create: createMessage,
  closeAll: () => api().message.destroy(),
}

// ============== Notification ==============

/** notification 附加选项（除 message/description/type 外透传 antd ArgsProps） */
export type NotifyOptions = Omit<
  Parameters<AppHooks['notification']['open']>[0],
  'message' | 'description' | 'type'
>

/**
 * notify.success(description, title?, options?)
 * notify.success('同步完成')                        // 仅描述
 * notify.success('同步完成', '操作成功')              // 标题+描述
 * notify.success('同步完成', { duration: 5 })        // 描述+选项
 * notify.success('同步完成', '操作成功', { ... })     // 全都指定
 */
function makeNotify(type: MessageType) {
  return (
    description: ReactNode,
    titleOrOptions?: string | NotifyOptions,
    options?: NotifyOptions,
  ) => {
    let title = ''
    let opts: NotifyOptions = {}
    if (typeof titleOrOptions === 'string') {
      title = titleOrOptions
      if (options) opts = options
    } else if (titleOrOptions) {
      opts = titleOrOptions
    }
    // 走具名方法（而非 open + type 字段），不依赖 ArgsProps.type 的版本兼容
    api().notification[type]({
      message: title || undefined,
      description,
      ...opts,
    })
  }
}

/** 完全自定义一条通知（等价 antd notification.open） */
export function createNotify(options: Parameters<AppHooks['notification']['open']>[0]) {
  return api().notification.open(options)
}

export const notify = {
  success: makeNotify('success'),
  error: makeNotify('error'),
  warning: makeNotify('warning'),
  info: makeNotify('info'),
  create: createNotify,
  closeAll: () => api().notification.destroy(),
}

// ============== Confirm ==============

/** confirm 附加选项（除 title/content 外透传 antd ModalFuncProps；勿传 onOk/onCancel，会覆盖布尔结果约定） */
export type ConfirmOptions = Omit<Parameters<AppHooks['modal']['confirm']>[0], 'title' | 'content'>

/**
 * 二次确认：true=确定，false=取消或关闭
 *
 *   if (await confirm('确定删除该记录？', '警告', { okText: '永久删除' })) { ... }
 */
export function confirm(content: ReactNode, title: ReactNode = '提示', options: ConfirmOptions = {}) {
  return new Promise<boolean>(resolve => {
    const merged: Parameters<AppHooks['modal']['confirm']>[0] = { title, content, ...options }
    api().modal.confirm({
      ...merged,
      onOk: async () => {
        await merged.onOk?.()
        resolve(true)
      },
      onCancel: async e => {
        await merged.onCancel?.(e)
        resolve(false)
      },
    })
  })
}

// ============== Loading ==============

interface LoadingState {
  /** 嵌套计数：并发 withLoading 时最外层 close 才真正隐藏 */
  count: number
  text: string
  show: (text?: string) => void
  hide: () => void
}

/**
 * 全局加载态 store：由 App.tsx 内的 <LoadingHost/> 订阅渲染全屏 Spin。
 * 经 zustand 而非 Context，保证非组件上下文（工具函数）可直接驱动。
 */
const useLoadingStore = create<LoadingState>(set => ({
  count: 0,
  text: '加载中...',
  show: text => set(s => ({ count: s.count + 1, text: text ?? s.text })),
  hide: () => set(s => ({ count: Math.max(0, s.count - 1) })),
}))

/** 供 App.tsx 的 <LoadingHost/> 订阅 */
export const useFeedbackLoading = useLoadingStore

export interface LoadingInstance {
  close: () => void
}

export function showLoading(text?: string): LoadingInstance {
  useLoadingStore.getState().show(text)
  return { close: () => useLoadingStore.getState().hide() }
}

export async function withLoading<T>(
  task: (() => Promise<T>) | Promise<T>,
  text?: string,
): Promise<T> {
  const loading = showLoading(text)
  try {
    return await (typeof task === 'function' ? task() : task)
  } finally {
    loading.close()
  }
}
