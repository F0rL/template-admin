<script setup lang="ts">
import { ref } from 'vue'

defineOptions({ name: 'PatrolGuide', inheritAttrs: false })

const visible = ref(false)
</script>

<template>
  <div class="inline-flex" v-bind="$attrs">
    <el-tooltip content="操作说明" placement="top">
      <IconEpQuestionFilled class="cursor-pointer" @click="visible = true" />
    </el-tooltip>
  </div>

  <el-dialog v-model="visible" title="巡查配置说明" width="600px" align-center>
    <div class="flex items-baseline gap-2.5">
      <span class="shrink-0 text-xs font-semibold">层级关系</span>
      <span class="text-[13px] leading-relaxed text-(--el-text-color-regular)">
        班级巡查 / 特别事项：巡查分类（一级）→ 巡查项（二级）；教师执勤：巡查分类（一级）→ 执勤点位（二级）。
      </span>
    </div>
    <ol
      class="mt-3 list-decimal space-y-1.5 pl-5 text-[13px] leading-relaxed text-(--el-text-color-regular) [&_li::marker]:font-semibold"
    >
      <li>点击行首的展开图标可展开 / 折叠子节点。</li>
      <li>
        <b class="text-(--el-text-color-primary)">教师执勤</b>
        分类按执勤点位评价（不再区分时段），每个点位可设置默认执勤教师与日期例外。
      </li>
      <li>
        评价积分规则：<b class="text-green-600">好评 +2</b> /
        <b style="color: #faad14">中评 +1</b> /
        <b class="text-red-500">待改进 -1</b>，可在分类编辑中按需调整分值。
      </li>
      <li>
        默认教师在移动端评价该点位时自动带入（可临时改选）；日期例外优先级最高，适合教师请假代班场景。
      </li>
    </ol>
    <template #footer>
      <el-button type="primary" @click="visible = false">我知道了</el-button>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped></style>
