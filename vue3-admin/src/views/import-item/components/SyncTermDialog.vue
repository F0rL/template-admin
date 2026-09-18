<script setup lang="ts">
import { ref } from 'vue'
import { message } from '@/utils/feedback'
import type { TermOption as TermSelectOption } from '@/components/TermSelect/types'
import { syncImportItems } from '@/api/importItem'

const props = defineProps<{
  termOptions: TermSelectOption[]
  termCode?: string
}>()

const emit = defineEmits<{
  success: []
}>()

const visible = ref(false)
const syncing = ref(false)
const form = ref({ sourceTermCode: '', targetTermCode: '' })

function open() {
  form.value = { sourceTermCode: props.termCode ?? '', targetTermCode: '' }
  visible.value = true
}

async function handleSync() {
  if (!form.value.sourceTermCode || !form.value.targetTermCode) {
    message.warning('请选择源学期与目标学期')
    return
  }
  syncing.value = true
  try {
    const n = await syncImportItems(form.value)
    message.success(`已复制 ${n} 条导入项`)
    visible.value = false
    emit('success')
  } finally {
    syncing.value = false
  }
}

defineExpose({ open })
</script>

<template>
  <el-dialog v-model="visible" title="整学期同步（复制整盘导入项）" width="460px">
    <el-form label-width="90px">
      <el-form-item label="源学期" required>
        <el-select v-model="form.sourceTermCode" class="w-full" placeholder="选择源学期">
          <el-option v-for="t in termOptions" :key="t.code" :label="t.name" :value="t.code" />
        </el-select>
      </el-form-item>
      <el-form-item label="目标学期" required>
        <el-select v-model="form.targetTermCode" class="w-full" placeholder="选择目标学期">
          <el-option v-for="t in termOptions" :key="t.code" :label="t.name" :value="t.code" />
        </el-select>
      </el-form-item>
      <div class="text-xs text-gray-400">
        将源学期导入项（含整棵树）按顺序复制到目标学期，目标学期已有同名项目会自动跳过整棵子树。
      </div>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="syncing" @click="handleSync">复制</el-button>
    </template>
  </el-dialog>
</template>
