<script setup lang="ts">
/**
 * 新增 / 编辑获奖记录弹窗。
 * 大类由列表页当前页签决定，弹窗内只读展示，不允许切换。
 * 学生获奖：新增可多选学生；编辑单条；支持好公民自动同步（五育/积分可配，已同步的开关只读）。
 */
import { ref, computed, useTemplateRef } from 'vue'
import type { UploadFile, UploadRawFile, UploadRequestOptions } from 'element-plus'
import { message } from '@/utils/feedback'
import { saveAward, type AwardListItem, type SaveAwardPayload } from '@/api/pcAward'
import * as sysFileApi from '@/api/system/sysFile'
import ContactSelect from '@/components/ContactSelect/index.vue'
import StudentSelect, { type SelectedStudent } from '@/components/StudentSelect/index.vue'
import { resolveFileUrl, validateImageFile } from '@/utils/file'
import {
  SUB_CATEGORY_BY_CATEGORY,
  subCategoryOptionsFor,
  AWARD_LEVEL_OPTIONS,
  AWARD_GRADE_OPTIONS,
} from '../dict'

const SCHOOL_DEFAULT = '武汉市江汉区大兴路小学'

const emit = defineEmits<{
  success: []
}>()

const visible = ref(false)
const saving = ref(false)
const contactRef = useTemplateRef('contactRef')
const studentRef = useTemplateRef('studentRef')

const form = ref<SaveAwardPayload>(defaultForm())
/** 图片附件（上传后保存相对路径） */
const fileList = ref<UploadFile[]>([])
/** 新增模式下，学生获奖可一次选择多名获奖学生 */
const selectedStudents = ref<SelectedStudent[]>([])
/** 是否为编辑单条记录（编辑时学生获奖保持单条，不走多选） */
const isEdit = computed(() => !!form.value.id)

// ───────────── 好公民自动同步（仅学生获奖） ─────────────
/** 保存后自动同步开关（未同步的默认打开可选择；已同步的只读保持打开） */
const autoSync = ref(true)
/** 编辑目标已同步好公民（开关只读） */
const rowSynced = ref(false)
/** 自动同步五育归属（默认德育） */
const syncWuyu = ref('de')
/** 自动同步积分（默认 3） */
const syncScore = ref(3)

const WUYU_OPTIONS = [
  { value: 'de', label: '德育' },
  { value: 'zhi', label: '智育' },
  { value: 'ti', label: '体育' },
  { value: 'mei', label: '美育' },
  { value: 'lao', label: '劳育' },
]

function defaultForm(): SaveAwardPayload {
  return {
    category: 1,
    subCategory: 1,
    winnerName: '',
    winnerClass: '',
    awardName: '',
    awardLevel: '',
    awardGrade: '',
    awardTime: '',
    awardUnit: '',
    reward: '',
    remark: '',
    attachmentPath: '',
  }
}

/** 当前大类下可选的获奖分类（教师竞赛类带论文、赛课后缀） */
const subCategoryOptions = computed(() => subCategoryOptionsFor(form.value.category))

/** 大类由列表页 tab 决定，弹窗内不允许切换 */
const CATEGORY_LABELS: Record<number, string> = { 1: '学生', 2: '教师', 3: '学校' }

/** 库中获奖时间为 yyyyMM（如 202609），date-picker 需要 yyyy-MM（兼容历史 yyyy-MM 数据原样返回） */
function compactToDash(s?: string): string {
  if (!s) return ''
  const digits = s.replace(/\D/g, '')
  return digits.length === 6 ? `${digits.slice(0, 4)}-${digits.slice(4)}` : s
}

/** 打开新增（row 为空时可指定初始大类）或编辑弹窗 */
function open(row?: AwardListItem, category?: number) {
  if (row) {
    rowSynced.value = row.syncStatus === 1
    autoSync.value = true
    syncWuyu.value = 'de'
    syncScore.value = 3
    form.value = {
      id: row.id,
      category: row.category,
      subCategory: row.subCategory,
      winnerName: row.winnerName,
      winnerClass: row.winnerClass || '',
      awardName: row.awardName,
      awardLevel: row.awardLevel || '',
      awardGrade: row.awardGrade || '',
      awardTime: compactToDash(row.awardTime),
      awardUnit: row.awardUnit || '',
      reward: row.reward || '',
      remark: row.remark || '',
      attachmentPath: row.attachmentPath || '',
    }
    fileList.value = row.attachmentPath
      ? [{ name: 'attachment', url: resolveFileUrl(row.attachmentPath), status: 'success', uid: Date.now() }]
      : []
  } else {
    const cat = category ?? 1
    form.value = defaultForm()
    form.value.category = cat
    const allowed = SUB_CATEGORY_BY_CATEGORY[cat] ?? []
    if (!allowed.includes(form.value.subCategory)) {
      form.value.subCategory = allowed[0] ?? 1
    }
    if (cat === 3) form.value.winnerName = SCHOOL_DEFAULT
    selectedStudents.value = []
    fileList.value = []
    rowSynced.value = false
    autoSync.value = true
    syncWuyu.value = 'de'
    syncScore.value = 3
  }
  visible.value = true
}

/** 教师：从组织架构选择 */
async function pickTeacher() {
  const picked = await contactRef.value?.open({ selectType: 'user', selectNum: 'min' })
  if (picked?.length) {
    form.value.winnerName = picked[0].name
  }
}

/** 学生：选择学生（编辑模式取首位覆盖；新增模式存为多人列表） */
async function pickStudent() {
  const picked = await studentRef.value?.open()
  if (!picked || !picked.length) return
  if (isEdit.value) {
    form.value.winnerName = picked[0].name
    form.value.winnerClass = picked[0].className
  } else {
    selectedStudents.value = picked
  }
}

/** 移除已选中的某位获奖学生（新增多选模式） */
function removeStudent(s: SelectedStudent) {
  const idx = selectedStudents.value.findIndex(x => x.id === s.id)
  if (idx >= 0) selectedStudents.value.splice(idx, 1)
}

// ───────────── 图片附件上传（走系统上传接口，保存相对路径） ─────────────
function handleBeforeUpload(file: UploadRawFile) {
  return validateImageFile(file)
}

async function handleUpload(options: UploadRequestOptions) {
  const formData = new FormData()
  formData.append('file', options.file)
  try {
    const res = await sysFileApi.sysFileUpload(formData)
    form.value.attachmentPath = res.path
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
  form.value.attachmentPath = ''
}

async function handleSave() {
  if (!form.value.awardName.trim()) {
    message.warning('请填写获奖名称')
    return
  }

  // 汇总本次需要保存的获奖者名单（姓名 + 班级全名）
  let winners: { name: string; cls: string }[]
  if (form.value.category === 1) {
    if (isEdit.value) {
      if (!form.value.winnerName.trim()) {
        message.warning('请选择获奖学生')
        return
      }
      winners = [{ name: form.value.winnerName.trim(), cls: form.value.winnerClass || '' }]
    } else {
      if (!selectedStudents.value.length) {
        message.warning('请至少选择一名获奖学生')
        return
      }
      winners = selectedStudents.value.map(s => ({ name: s.name.trim(), cls: s.className || '' }))
    }
  } else {
    if (!form.value.winnerName.trim()) {
      message.warning('请填写获奖者')
      return
    }
    winners = [{ name: form.value.winnerName.trim(), cls: form.value.winnerClass || '' }]
  }

  // 公共字段（不含获奖者，循环里逐人注入）
  const base: Omit<SaveAwardPayload, 'winnerName' | 'winnerClass'> = {
    id: form.value.id,
    category: form.value.category,
    subCategory: form.value.subCategory,
    awardName: form.value.awardName.trim(),
    awardLevel: form.value.awardLevel || '',
    awardGrade: form.value.awardGrade || '',
    awardTime: form.value.awardTime || '',
    awardUnit: form.value.awardUnit || '',
    reward: form.value.reward || '',
    remark: form.value.remark || '',
    attachmentPath: form.value.attachmentPath || '',
    // 学生奖证：自动同步开关与五育/积分（已同步的后端自动跳过）
    ...(form.value.category === 1
      ? { autoSync: autoSync.value, syncWuyu: syncWuyu.value, syncScore: syncScore.value }
      : {}),
  }

  saving.value = true
  try {
    let ok = 0
    for (const w of winners) {
      await saveAward({ ...base, winnerName: w.name, winnerClass: w.cls })
      ok++
    }
    message.success(winners.length > 1 ? `已保存 ${ok} 条获奖记录` : '保存成功')
    visible.value = false
    emit('success')
  } finally {
    saving.value = false
  }
}

defineExpose({ open })
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="form.id ? '编辑获奖记录' : '新增获奖记录'"
    width="640px"
    destroy-on-close
  >
    <el-form :model="form" label-width="90px">
      <!-- 大类由列表页 tab 决定，弹窗内只读展示，不允许切换 -->
      <el-form-item label="获奖大类">
        <el-tag size="large" effect="plain">{{ CATEGORY_LABELS[form.category] ?? '未知' }}</el-tag>
        <span class="ml-2 text-xs text-gray-400">与当前页签一致，不支持切换</span>
      </el-form-item>

      <div class="grid grid-cols-2 gap-x-4">
        <el-form-item label="获奖分类" required>
          <el-select v-model="form.subCategory" class="w-full">
            <el-option v-for="s in subCategoryOptions" :key="s.value" :label="s.label" :value="s.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="获奖名称" required>
          <el-input v-model="form.awardName" placeholder="如：市三好学生 / 论文一等奖" maxlength="80" />
        </el-form-item>
      </div>

      <!-- 学生获奖：编辑单条 / 新增多选 -->
      <el-form-item v-if="form.category === 1" label="获奖学生" required>
        <!-- 编辑：保持单条记录 -->
        <div v-if="isEdit" class="flex w-full items-center gap-3">
          <template v-if="form.winnerName">
            <span class="text-(--el-text-color-primary)">{{ form.winnerName }}</span>
            <el-tag v-if="form.winnerClass" size="small" type="success" effect="plain">
              {{ form.winnerClass }}
            </el-tag>
            <el-link type="primary" :underline="false" @click="pickStudent">重新选择</el-link>
          </template>
          <el-button v-else type="primary" plain @click="pickStudent">
            <template #icon><IconEpPlus /></template>选择学生
          </el-button>
        </div>
        <!-- 新增：可一次选择多名获奖学生 -->
        <div v-else class="flex w-full flex-col gap-2">
          <div v-if="selectedStudents.length" class="flex flex-wrap gap-2">
            <el-tag
              v-for="s in selectedStudents"
              :key="s.id"
              type="success"
              closable
              @close="removeStudent(s)"
            >
              {{ s.name }}<span class="opacity-70">（{{ s.className }}）</span>
            </el-tag>
          </div>
          <el-button type="primary" plain @click="pickStudent">
            <template #icon><IconEpPlus /></template>{{ selectedStudents.length ? '继续添加' : '选择学生' }}
          </el-button>
        </div>
      </el-form-item>

      <!-- 教师获奖：手动输入 或 从组织架构选择 -->
      <el-form-item v-else-if="form.category === 2" label="获奖教师" required>
        <div class="flex w-full items-center gap-2">
          <el-input v-model="form.winnerName" placeholder="手动输入教师姓名，或点击下方按钮选择" maxlength="50" class="flex-1" />
          <el-button @click="pickTeacher">
            <template #icon><IconEpOfficeBuilding /></template>从组织架构选择
          </el-button>
        </div>
      </el-form-item>

      <!-- 学校获奖：默认学校名，可编辑 -->
      <el-form-item v-else label="获奖学校" required>
        <el-input v-model="form.winnerName" placeholder="获奖学校名称" maxlength="80" />
      </el-form-item>

      <div class="grid grid-cols-2 gap-x-4">
        <el-form-item label="获奖级别">
          <el-select v-model="form.awardLevel" class="w-full" placeholder="选择或输入级别" filterable allow-create clearable>
            <el-option v-for="l in AWARD_LEVEL_OPTIONS" :key="l" :label="l" :value="l" />
          </el-select>
        </el-form-item>
        <el-form-item label="奖次">
          <el-select v-model="form.awardGrade" class="w-full" placeholder="选择或输入奖次" filterable allow-create clearable>
            <el-option v-for="g in AWARD_GRADE_OPTIONS" :key="g" :label="g" :value="g" />
          </el-select>
        </el-form-item>
      </div>

      <div class="grid grid-cols-2 gap-x-4">
        <el-form-item label="获奖时间">
          <el-date-picker
            v-model="form.awardTime"
            type="month"
            value-format="YYYY-MM"
            placeholder="选择年月"
            class="w-full"
            clearable
          />
        </el-form-item>
        <el-form-item label="颁奖单位">
          <el-input v-model="form.awardUnit" placeholder="如：武汉市教育局" maxlength="80" />
        </el-form-item>
      </div>

      <el-form-item label="奖励">
        <el-input v-model="form.reward" placeholder="如：奖杯 / 奖金500元 / 荣誉证书" maxlength="200" />
      </el-form-item>

      <el-form-item label="补充信息">
        <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="其他需要补充说明的信息（可选）" />
      </el-form-item>

      <el-form-item label="图片附件">
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
        <div class="mt-1 text-xs text-gray-400">奖证图片（jpg/png/bmp，≤2MB）</div>
      </el-form-item>

      <!-- 学生获奖：保存后自动同步好公民 -->
      <template v-if="form.category === 1">
        <el-divider content-position="left">
          <span class="text-xs text-gray-400">同步到素养评价好公民</span>
        </el-divider>
        <el-form-item label="自动同步">
          <el-switch v-model="autoSync" :disabled="rowSynced" />
          <span v-if="rowSynced" class="ml-2 text-xs text-gray-400">
            该记录已同步好公民，保存后不会重复同步
          </span>
          <span v-else-if="autoSync" class="ml-2 text-xs text-gray-400">保存后自动同步（未填写班级的保存后可再手动同步）</span>
        </el-form-item>
        <template v-if="autoSync">
          <el-form-item label="归入五育">
            <el-radio-group v-model="syncWuyu">
              <el-radio-button v-for="w in WUYU_OPTIONS" :key="w.value" :value="w.value">
                {{ w.label }}
              </el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="积分">
            <el-input-number v-model="syncScore" :min="0" :max="100" :step="1" step-strictly />
            <span class="ml-2 text-xs text-gray-400">获奖时间不在本学期的同步记录、积分记 0</span>
          </el-form-item>
        </template>
      </template>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
    </template>

    <ContactSelect ref="contactRef" />
    <StudentSelect ref="studentRef" />
  </el-dialog>
</template>

<style lang="scss" scoped>
.is-full :deep(.el-upload--picture-card) {
  display: none;
}
</style>
