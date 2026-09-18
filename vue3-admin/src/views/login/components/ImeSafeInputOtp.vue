<script setup lang="ts">
/**
 * el-input-otp 的输入法（IME）安全封装。
 *
 * el-input-otp（Element Plus 2.14.x）未处理输入法组合事件，中文输入法（如微信
 * 输入法）组合期间触发的 input 会被立即填入格子并跳格，跳格又打断组合，迫使
 * 输入法把未确认的拼音二次上屏，导致一次按键填入两个相同字母。
 *
 * 处理方式：
 * 1. 捕获阶段拦截组合期间的 input（isComposing），仅放行组合结束后的最终输入；
 * 2. 组合期间给格子加 otp-composing 类，隐藏格子中的拼音/汉字中间态；
 * 3. 部分输入法组合结束后不再触发 input，组件无法清除非法文本，
 *    组合结束后兜底校验并恢复格子原值。
 *
 * 官方修复 IME 处理后，可移除此封装直接换回 el-input-otp。
 */
defineOptions({ inheritAttrs: false })

const model = defineModel<string>()

const props = defineProps<{
  /** 单字符校验，与 el-input-otp 的 validator 一致，用于组合结束后残留文本的兜底清理 */
  validator?: (value: string, index: number) => boolean
}>()

const emit = defineEmits<{ finish: [value: string] }>()

let prevValue = ''

function guardImeInput(event: Event) {
  if ((event as InputEvent).isComposing) {
    event.stopPropagation()
  }
}

function handleCompositionStart(event: CompositionEvent) {
  const target = event.target as HTMLInputElement
  prevValue = target.value
  target.classList.add('otp-composing')
}

function handleCompositionEnd(event: CompositionEvent) {
  const target = event.target as HTMLInputElement
  target.classList.remove('otp-composing')
  setTimeout(() => {
    if (target.value.length > 1 || (props.validator && !props.validator(target.value, 0))) {
      target.value = prevValue
    }
  })
}
</script>

<template>
  <el-input-otp
    v-bind="$attrs"
    v-model="model"
    :validator="validator"
    @finish="emit('finish', $event)"
    @input.capture="guardImeInput"
    @compositionstart="handleCompositionStart"
    @compositionend="handleCompositionEnd"
  />
</template>

<style scoped>
/* 输入法组合期间隐藏格子中的拼音/汉字中间态，仅保留最终合法字符 */
:deep(.el-input-otp__input.otp-composing) {
  color: transparent;
  caret-color: transparent;
}
</style>
