<script setup lang="ts">
/**
 * 积分规则配置 — 评价维度 新增/编辑弹窗
 * 通过 open(row?) 打开：无参为新增，有参为编辑；保存成功后 emit('success')
 */
import { ref, reactive } from 'vue'
import { useMutation } from '@tanstack/vue-query'
import type { UploadFile, UploadRawFile, UploadRequestOptions } from 'element-plus'
import { createScoreRule, updateScoreRule, IconType, type ScoreRuleItem } from '@/api/pcScoreRule'
import { EvalSection } from '@/api/pcEval'
import * as sysFileApi from '@/api/system/sysFile'
import { message, withLoading } from '@/utils/feedback'
import { resolveFileUrl, validateImageFile } from '@/utils/file'

defineOptions({ name: 'ScoreRuleFormDialog' })
const emit = defineEmits<{ success: [] }>()

const visible = ref(false)
const isEdit = ref(false)
const fileList = ref<UploadFile[]>([])

const WUYU_LABEL: Record<string, string> = {
  de: '德育',
  zhi: '智育',
  ti: '体育',
  mei: '美育',
  lao: '劳育',
}

/** 新增时的表单初始值，用于 resetForm 整体重置 */
const INITIAL_FORM: Partial<ScoreRuleItem> = {
  section: EvalSection.GoodStudent,
  dimName: '',
  wuyu: 'de',
  score: 2,
  iconType: IconType.Image,
  icon: '',
  emoji: '⭐',
  sortNo: 99,
  enabled: true,
  starMax: 3,
  remark: '',
}
const formModel = reactive<Partial<ScoreRuleItem>>({ ...INITIAL_FORM })

/** 打开弹窗：无参为新增，传入 row 为编辑 */
function open(row?: ScoreRuleItem) {
  isEdit.value = !!row
  if (row) {
    Object.assign(formModel, row)
    fileList.value =
      row.icon && row.iconType === IconType.Image
        ? [{ name: 'icon', url: previewUrl(row.icon), status: 'success', uid: Date.now() }]
        : []
  } else {
    Object.assign(formModel, INITIAL_FORM)
    fileList.value = []
  }
  visible.value = true
}
defineExpose({ open })

const createMut = useMutation({ mutationFn: (d: ScoreRuleItem) => createScoreRule(d) })
const updateMut = useMutation({ mutationFn: (d: ScoreRuleItem) => updateScoreRule(d) })

async function submitForm() {
  if (!formModel.dimName) {
    message.warning('请填写维度名称')
    return
  }
  if (formModel.section === EvalSection.GoodStudent) {
    if (formModel.score == null || formModel.score < 0 || formModel.score > 100) {
      message.warning('单次积分需为 0-100')
      return
    }
    if (formModel.iconType === IconType.Image && !formModel.icon) {
      message.warning('请上传奖章图片')
      return
    }
  }
  if (formModel.section === EvalSection.GoodChild) formModel.starMax = formModel.starMax ?? 3
  const payload = { ...formModel } as ScoreRuleItem
  await withLoading(
    (async () => {
      if (isEdit.value) await updateMut.mutateAsync(payload)
      else await createMut.mutateAsync(payload)
    })(),
    '提交中...',
  )
  message.success('已保存')
  visible.value = false
  emit('success')
}

/** 图标图片地址：上传后的相对路径走文件服务；旧数据为奖章文件名（/medals/ 下） */
function previewUrl(icon: string) {
  if (!icon) return ''
  if (/^(https?:)?\/\//.test(icon) || /^(data|blob):/.test(icon)) return icon
  return icon.startsWith('/') ? resolveFileUrl(icon) : `/medals/${icon}`
}

// ───────────── 奖章图片上传（参考用户头像上传 UserForm.vue） ─────────────
function handleBeforeUpload(file: UploadRawFile) {
  return validateImageFile(file)
}
async function handleUpload(options: UploadRequestOptions) {
  const formData = new FormData()
  formData.append('file', options.file)
  try {
    const res = await sysFileApi.sysFileUpload(formData)
    formModel.icon = res.path
    options.onSuccess(res)
    const item = fileList.value.find(f => f.uid === options.file.uid)
    if (item) item.url = resolveFileUrl(res.path)
  } catch {
    message.error('上传失败')
    const error = Object.assign(new Error('上传失败'), {
      status: -1,
      method: options.method,
      url: options.action,
    })
    options.onError(error as Parameters<typeof options.onError>[0])
  }
}
function handleRemove() {
  formModel.icon = ''
}
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑评价维度' : '新增评价维度'"
    width="540px"
    destroy-on-close
  >
    <el-form :model="formModel" label-width="92px">
      <el-form-item label="所属板块">
        <el-select v-model="formModel.section" class="!w-full" :disabled="isEdit">
          <el-option :value="EvalSection.GoodStudent" label="好学生" />
          <el-option :value="EvalSection.GoodChild" label="好孩子" />
        </el-select>
        <span v-if="isEdit" class="ml-2 text-xs text-gray-400"
          >好公民为统一配置，不支持新增维度</span
        >
      </el-form-item>
      <el-form-item label="维度名称">
        <el-input v-model="formModel.dimName" maxlength="15" />
      </el-form-item>
      <el-form-item label="归入五育">
        <el-select v-model="formModel.wuyu" class="!w-full">
          <el-option v-for="(label, k) in WUYU_LABEL" :key="k" :label="label" :value="k" />
        </el-select>
      </el-form-item>
      <template v-if="formModel.section === EvalSection.GoodStudent">
        <el-form-item label="图标类型">
          <el-radio-group v-model="formModel.iconType">
            <el-radio :value="IconType.Image">图片奖章</el-radio>
            <el-radio :value="IconType.Emoji">emoji</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="formModel.iconType === IconType.Image" label="奖章图片">
          <div :class="{ 'is-full': fileList.length >= 1 }">
            <el-upload
              v-model:file-list="fileList"
              list-type="picture-card"
              :limit="1"
              :before-upload="handleBeforeUpload"
              :http-request="handleUpload"
              :on-remove="handleRemove"
            >
              <IconEpPlus v-if="fileList.length < 1" />
            </el-upload>
          </div>
          <div class="mt-1 text-xs text-gray-400">支持 jpg/png/bmp，≤2MB</div>
        </el-form-item>
        <el-form-item v-else label="emoji">
          <el-input v-model="formModel.emoji" maxlength="2" style="width: 100px" />
        </el-form-item>
        <el-form-item label="单次分值">
          <el-input-number v-model="formModel.score" :min="0" :max="100" />
        </el-form-item>
      </template>
      <el-form-item v-else-if="formModel.section === EvalSection.GoodChild" label="评分方式">
        <span class="font-semibold text-[#faad14]">★ ★ ★</span>
        <span class="ml-2 text-xs text-gray-400"
          >家长端 1-3 星打分，1 星 = 1 分，量表总分归入劳育</span
        >
      </el-form-item>
      <el-form-item label="序号">
        <el-input-number v-model="formModel.sortNo" :min="1" :max="99" />
      </el-form-item>
      <el-form-item label="说明">
        <el-input v-model="formModel.remark" type="textarea" :rows="2" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button
        type="primary"
        :loading="createMut.isPending.value || updateMut.isPending.value"
        @click="submitForm"
        >确定</el-button
      >
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.is-full :deep(.el-upload--picture-card) {
  display: none;
}
</style>
