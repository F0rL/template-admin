/**
 * useDialogForm — 弹窗表单（抽屉/对话框）通用骨架
 * ---------------------------------------------
 * 收敛 visible 之外的样板：antd Form 实例、编辑态判定、保存 mutation
 * （成功 toast + 失效回调），使各表单组件只关注字段与 payload 组装。
 *
 * - 弹窗开关 / 编辑行由调用方以 props 受控（React 惯用法，不反向暴露 open 命令）
 * - 打开时的数据回填由调用方自理（各表单加载契约不同）
 * - 保存成功统一：toast + onSuccess()（通常用于 invalidateQueries）
 *
 * 用法：
 *   const { form, isEdit, saveMutation, pending } = useDialogForm<UserFormValues, UserListItem>({
 *     editingRow,
 *     submit: (values, editing) => (editing ? updateUser(payload) : createUser(payload)),
 *     onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.lists() }),
 *   })
 */
import { Form } from 'antd'
import { useMutation } from '@tanstack/react-query'
import { message } from '@/utils/feedback'

export interface UseDialogFormOptions<TValues extends object, TRow extends { id: string }> {
  /** 当前编辑行（null = 新增） */
  editingRow: TRow | null
  /** 提交：调用方组装 payload 并选择新增/更新接口 */
  submit: (values: TValues, editingRow: TRow | null) => Promise<unknown>
  /** 保存成功后的附加回调 */
  onSuccess?: () => void
}

export function useDialogForm<TValues extends object, TRow extends { id: string }>({
  editingRow,
  submit,
  onSuccess,
}: UseDialogFormOptions<TValues, TRow>) {
  const [form] = Form.useForm<TValues>()

  const saveMutation = useMutation({
    mutationFn: (values: TValues) => submit(values, editingRow),
    onSuccess: () => {
      message.success('保存成功')
      onSuccess?.()
    },
  })

  return {
    form,
    /** 是否编辑态（editingRow 非空） */
    isEdit: !!editingRow,
    saveMutation,
    /** 提交中（按钮 loading） */
    pending: saveMutation.isPending,
  }
}
