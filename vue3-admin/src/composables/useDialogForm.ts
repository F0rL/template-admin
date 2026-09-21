import { computed, ref } from 'vue'
import { useMutation } from '@tanstack/vue-query'
import type { FormInstance } from 'element-plus'
import { message } from '@/utils/feedback'

/**
 * 弹窗表单（抽屉/对话框）通用骨架，收敛 visible / editingRow / loading /
 * 表单校验 / 保存 mutation（成功 toast + 关闭弹窗）等样板。
 *
 * - open(row)：标记编辑态 → reset() 重置表单 → 显示 → load() 加载数据（可省）
 * - load 的错误处理由调用方自理（保持各表单原有失败行为：关抽屉 / 提示等）
 * - 保存成功统一：toast + close() + onSaveSuccess()（通常 emit('success') 通知父组件刷新）
 */
export function useDialogForm<TRow extends { id: string } = { id: string }>(options: {
  /** 打开抽屉时重置表单及附加状态（fileList、树勾选等） */
  reset: () => void
  /** 打开抽屉后的异步数据加载（实体回填等）；缺省无加载，调用期间 loading 自动置位 */
  load?: (editing: TRow | null) => Promise<void> | void
  /** 保存成功后的附加回调 */
  onSaveSuccess?: () => void
}) {
  const visible = ref(false)
  const loading = ref(false)
  /** 编辑行数据：open(row) 传入，null 表示新增 */
  const editingRow = ref<TRow | null>(null)
  const isEdit = computed(() => !!editingRow.value)
  const formRef = ref<FormInstance>()

  async function open(row?: TRow) {
    editingRow.value = row ?? null
    options.reset()
    visible.value = true
    if (!options.load) return
    loading.value = true
    try {
      await options.load(editingRow.value)
    } finally {
      loading.value = false
    }
  }

  function close() {
    visible.value = false
  }

  /** 表单整体校验，通过返回 true（el-form validate reject 视为 false） */
  async function validate(): Promise<boolean> {
    return (await formRef.value?.validate().catch(() => false)) ?? false
  }

  function clearValidate() {
    formRef.value?.clearValidate()
  }

  /** 保存 mutation：成功后 toast + 关闭弹窗 + 附加回调 */
  function createSaveMutation<TPayload>(mutationFn: (payload: TPayload) => Promise<unknown>) {
    return useMutation({
      mutationFn,
      onSuccess: () => {
        message.success('保存成功')
        close()
        options.onSaveSuccess?.()
      },
    })
  }

  return {
    visible,
    loading,
    editingRow,
    isEdit,
    formRef,
    open,
    close,
    validate,
    clearValidate,
    createSaveMutation,
  }
}
