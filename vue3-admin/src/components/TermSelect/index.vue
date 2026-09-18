<script setup lang="ts">
/**
 * TermSelect 学期选择器
 *
 * 学期数据来源：后端 GET /api/PcCommon/GetTerms（数据库来源：当前学期 + 各业务表已落库学期）。
 * - 外部通过 `options` 注入时优先使用外部数据；
 * - 否则默认从接口拉取学期列表；
 * - 接口失败时回退到本地 generateRecentTerms，避免下拉为空。
 *
 * 自动默认选本学期：
 * - 若外部 v-model 为空，且 list 里有 current=true 的项，自动选中并 emit update:modelValue。
 * - 仅在挂载后执行一次（首次进入时初始化），避免覆盖用户后续手动选择。
 */
import { computed, ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { generateRecentTerms, type TermOption } from './types'
import { fetchTerms, pcCommonKeys } from '@/api/pcCommon'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    options?: TermOption[]
    placeholder?: string
    disabled?: boolean
    clearable?: boolean
    /** 显示名称而非编码（默认 true） */
    showLabel?: boolean
    /** 是否从后端拉取学期列表（默认 true）。为 false 时仅用本地生成 */
    remote?: boolean
  }>(),
  {
    placeholder: '请选择学期',
    clearable: true,
    showLabel: true,
    remote: true,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
  change: [value: string | undefined, option: TermOption | undefined]
}>()

// 从后端读取学期列表（数据库来源：当前学期 + 各业务表已落库学期）
const { data: remoteTerms } = useQuery({
  queryKey: pcCommonKeys.terms(),
  queryFn: ({ signal }) => fetchTerms(signal),
  enabled: () => props.remote && !(props.options && props.options.length > 0),
  staleTime: 10 * 60 * 1000,
})

// 优先级：外部 options > 后端学期列表 > 本地兜底生成
const list = computed<TermOption[]>(() => {
  if (props.options && props.options.length > 0) return props.options

  const rt = remoteTerms.value
  if (rt && rt.length > 0) {
    return rt.map(t => ({
      code: t.code,
      name: t.name,
      sortNo: undefined,
      current: t.isCurrent,
    }))
  }

  return generateRecentTerms()
})

const selectedOption = computed<TermOption | undefined>(() =>
  list.value.find(o => o.code === props.modelValue),
)

// 自动选本学期：
// 外部 options / 后端接口为异步加载，首次渲染时 list 可能还是本地兜底值。
// 因此改用 watch 响应式：只要「真实数据」就绪且用户尚未手动选择，就（重新）选中 current=true 项，
// 兜底推算一旦与真实数据不一致也能自动纠正（如旧版兜底把下学期误当本学期）。
const hasResolved = computed(() => {
  if (props.options && props.options.length > 0) return true
  return !!(remoteTerms.value && remoteTerms.value.length > 0)
})
const autoPickedCode = ref<string | null>(null)
const userTouched = ref(false)

watch(
  list,
  val => {
    if (userTouched.value) return
    const current = val.find(o => o.current)
    if (!current) return
    // 避免在真实数据就绪前用兜底值反复触发；就绪后若与已选值不同则纠正
    if (!hasResolved.value && autoPickedCode.value === current.code) return
    if (autoPickedCode.value === current.code) return
    autoPickedCode.value = current.code
    emit('update:modelValue', current.code)
    emit('change', current.code, current)
  },
  { immediate: true },
)

function handleChange(value: string | undefined) {
  userTouched.value = true
  emit('update:modelValue', value)
  emit(
    'change',
    value,
    list.value.find(o => o.code === value),
  )
}
</script>

<template>
  <el-select
    :model-value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :clearable="clearable"
    filterable
    style="width: 200px"
    @change="handleChange"
  >
    <el-option
      v-for="opt in list"
      :key="opt.code"
      :value="opt.code"
      :label="showLabel ? opt.name : opt.code"
    >
      <span class="float-left">{{ showLabel ? opt.name : opt.code }}</span>
      <span
        v-if="opt.current"
        class="float-right ml-2 rounded bg-emerald-50 px-1 text-xs text-emerald-600"
      >本学期</span>
    </el-option>
  </el-select>
</template>
