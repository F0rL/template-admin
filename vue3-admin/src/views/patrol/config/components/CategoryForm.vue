<script setup lang="ts">
import { ref, reactive, computed, useTemplateRef } from 'vue'
import { useMutation } from '@tanstack/vue-query'
import type { FormRules, FormInstance } from 'element-plus'
import type {
  CreatePatrolCategoryRequest,
  EvalMode,
  PatrolCategory,
  ScoreTarget,
  UpdatePatrolCategoryRequest,
} from '@/api/pcPatrol'
import * as pcPatrolApi from '@/api/pcPatrol'
import { confirm, message, withLoading } from '@/utils/feedback'

const emit = defineEmits<{ success: [] }>()

interface CategoryFormModel {
  id?: string
  name: string
  code: string
  evalMode: EvalMode
  scoreTarget: ScoreTarget
  /** 1=教师 2=学生督查 */
  role: number
  scoreGood: number | null
  scoreMid: number | null
  scoreBad: number | null
  sortNo: number
}

const EVAL_MODE_OPTIONS: { value: EvalMode; label: string; tip: string }[] = [
  { value: 1, label: '按班级评价', tip: '巡查人对班级进行好评/待改进评价，积分归入班级所属年级组' },
  {
    value: 2,
    label: '按教师执勤评价',
    tip: '巡查人对执勤岗教师到岗情况评价，需选择被评价教师，积分归入教师所属年级组',
  },
  { value: 3, label: '文本记录', tip: '仅记录文字事项，不参与积分' },
]

const SCORE_TARGET_OPTIONS: { value: ScoreTarget; label: string }[] = [
  { value: 1, label: '年级组' },
  { value: 2, label: '不积分' },
]

const ROLE_OPTIONS: { value: number; label: string; tip: string }[] = [
  { value: 1, label: '教师', tip: '教师巡查账号，移动端可见全部巡查板块' },
  { value: 2, label: '学生督查', tip: '学生巡查账号（专用企微账号），移动端仅可见本板块' },
]

const visible = ref(false)
const editingRow = ref<PatrolCategory | null>(null)
const formRef = useTemplateRef<FormInstance>('formRef')

function createDefaultModel(): CategoryFormModel {
  return {
    name: '',
    code: '',
    evalMode: 1,
    scoreTarget: 1,
    role: 1,
    scoreGood: 2,
    scoreMid: 1,
    scoreBad: -1,
    sortNo: 1,
  }
}

const model = reactive<CategoryFormModel>(createDefaultModel())

const isEdit = computed(() => !!editingRow.value)
const isSpecial = computed(() => model.evalMode === 3)
const currentModeTip = computed(
  () => EVAL_MODE_OPTIONS.find(m => m.value === model.evalMode)?.tip ?? '',
)
const currentRoleTip = computed(
  () => ROLE_OPTIONS.find(r => r.value === model.role)?.tip ?? '',
)

const rules = computed<FormRules<CategoryFormModel>>(() => ({
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
  code: [
    { required: true, message: '请输入编码', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z][a-zA-Z0-9_]{0,19}$/,
      message: '编码需以字母开头，仅含字母/数字/下划线',
      trigger: 'blur',
    },
  ],
  evalMode: [{ required: true, message: '请选择评价模式', trigger: 'change' }],
  role: [{ required: true, message: '请选择巡查角色', trigger: 'change' }],
  sortNo: [{ required: true, message: '请输入序号', trigger: 'blur' }],
}))

const saveMutation = useMutation({
  mutationFn: async () => {
    if (isEdit.value) {
      const payload: UpdatePatrolCategoryRequest = {
        id: model.id!,
        name: model.name,
        code: model.code,
        evalMode: model.evalMode,
        scoreTarget: model.scoreTarget,
        role: model.role,
        scoreGood: isSpecial.value ? null : model.scoreGood,
        scoreMid: isSpecial.value ? null : model.scoreMid,
        scoreBad: isSpecial.value ? null : model.scoreBad,
        sortNo: model.sortNo,
        enabled: editingRow.value?.enabled ?? true,
      }
      return pcPatrolApi.updateCategory(payload)
    }
    const payload: CreatePatrolCategoryRequest = {
      name: model.name,
      code: model.code,
      evalMode: model.evalMode,
      scoreTarget: model.scoreTarget,
      role: model.role,
      scoreGood: isSpecial.value ? null : model.scoreGood,
      scoreMid: isSpecial.value ? null : model.scoreMid,
      scoreBad: isSpecial.value ? null : model.scoreBad,
      sortNo: model.sortNo,
    }
    return pcPatrolApi.createCategory(payload)
  },
  onSuccess: () => {
    message.success(isEdit.value ? '保存成功' : '新增成功')
    visible.value = false
    emit('success')
  },
})

/** 切换启用/停用 */
const toggleMutation = useMutation({
  mutationFn: async (payload: { id: string; enabled: boolean }) =>
    pcPatrolApi.updateCategoryEnabled({ id: payload.id, enabled: payload.enabled }),
  onSuccess: () => emit('success'),
  onError: () => message.error('操作失败'),
})

function resetForm() {
  Object.assign(model, createDefaultModel())
  formRef.value?.clearValidate()
}

/** 切换评价模式：选择"文本记录"时自动禁用积分相关字段 */
function handleModeChange() {
  if (isSpecial.value) {
    model.scoreTarget = 2
    model.scoreGood = 0
    model.scoreBad = 0
  } else {
    if (model.scoreGood === 0) model.scoreGood = 2
    if (model.scoreBad === 0) model.scoreBad = -1
  }
}

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  saveMutation.mutate()
}

/**
 * 打开新增/编辑分类抽屉。
 * options.studentPatrol = true 时预设「学生督查」默认值（角色=2、名称=学生督查、编码=studentPatrol）。
 */
function open(
  row?: PatrolCategory,
  categories: PatrolCategory[] = [],
  options: { studentPatrol?: boolean } = {},
) {
  editingRow.value = row ?? null
  resetForm()
  if (row) {
    model.id = row.id
    model.name = row.name
    model.code = row.code
    model.evalMode = row.evalMode
    model.scoreTarget = row.scoreTarget
    // row.role 可能为 0（旧数据/漏赋值），回退到教师默认值
    model.role = row.role > 0 ? row.role : 1
    model.scoreGood = row.scoreGood ?? 0
    model.scoreMid = row.scoreMid ?? 1
    model.scoreBad = row.scoreBad ?? 0
    model.sortNo = row.sortNo
  } else {
    model.sortNo = categories.reduce((mx, c) => Math.max(mx, c.sortNo), 0) + 1
    if (options.studentPatrol) {
      model.name = '学生督查'
      model.code = 'studentPatrol'
      model.role = 2
      model.evalMode = 1
      model.scoreTarget = 1
      model.scoreGood = 2
      model.scoreMid = 1
      model.scoreBad = -1
    }
  }
  visible.value = true
}

/** 删除分类（其下巡查项、执勤点位一并删除） */
async function remove(row: PatrolCategory) {
  const items = row.items ?? []
  const totalLocs =
    items.reduce((s, it) => s + (it.locations?.length ?? 0), 0) + (row.locations?.length ?? 0)
  let tip = `确认删除分类「${row.name}」（编码 ${row.code}）吗？`
  if (items.length > 0 || totalLocs > 0) {
    tip += `\n该分类下有 ${items.length} 个巡查项${totalLocs > 0 ? `、${totalLocs} 个执勤点位` : ''}，将一并删除。`
  }
  tip += '\n删除后无法恢复。'
  const ok = await confirm(tip, '删除确认', {
    type: 'error',
    confirmButtonText: '确认删除',
  })
  if (!ok) return
  await withLoading(pcPatrolApi.deleteCategory({ id: row.id }), '删除中...')
  message.success('已删除分类')
  emit('success')
}

function toggle(id: string, enabled: boolean) {
  toggleMutation.mutate({ id, enabled })
}

defineExpose({ open, remove, toggle, isToggling: () => toggleMutation.isPending.value })
</script>

<template>
  <el-drawer
    v-model="visible"
    :title="isEdit ? '编辑巡查分类' : '新增巡查分类'"
    direction="rtl"
    size="500px"
    :close-on-click-modal="false"
  >
    <el-form
      ref="formRef"
      :model="model"
      :rules="rules"
      label-width="100px"
      :disabled="saveMutation.isPending.value"
    >
      <el-form-item label="分类名称" prop="name">
        <el-input
          v-model="model.name"
          placeholder="如：班级巡查、教师执勤、学生督查"
          maxlength="20"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="编码" prop="code">
        <el-input v-model="model.code" placeholder="英文/数字，如 class、duty、studentPatrol" maxlength="20" />
      </el-form-item>

      <el-form-item label="巡查角色" prop="role">
        <el-select v-model="model.role" class="w-full">
          <el-option
            v-for="opt in ROLE_OPTIONS"
            :key="opt.value"
            :value="opt.value"
            :label="opt.label"
          />
        </el-select>
        <div class="mt-1 text-xs text-gray-400">{{ currentRoleTip }}</div>
      </el-form-item>

      <el-form-item label="评价模式" prop="evalMode">
        <el-select v-model="model.evalMode" class="w-full" @change="handleModeChange">
          <el-option
            v-for="opt in EVAL_MODE_OPTIONS"
            :key="opt.value"
            :value="opt.value"
            :label="opt.label"
          />
        </el-select>
        <div class="mt-1 text-xs text-gray-400">{{ currentModeTip }}</div>
      </el-form-item>

      <el-form-item label="积分归集" prop="scoreTarget">
        <el-select v-model="model.scoreTarget" class="w-full" :disabled="isSpecial">
          <el-option
            v-for="opt in SCORE_TARGET_OPTIONS"
            :key="opt.value"
            :value="opt.value"
            :label="opt.label"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="好评分值" prop="scoreGood">
        <el-input-number
          v-model="model.scoreGood"
          :min="0"
          :disabled="isSpecial"
          controls-position="right"
        />
        <span class="ml-2 text-xs text-gray-400">好评时增加的分值（正整数）</span>
      </el-form-item>

      <el-form-item label="中评分值" prop="scoreMid">
        <el-input-number
          v-model="model.scoreMid"
          :min="0"
          :disabled="isSpecial"
          controls-position="right"
        />
        <span class="ml-2 text-xs text-gray-400">中评时增加的分值（默认 1）</span>
      </el-form-item>

      <el-form-item label="差评分值" prop="scoreBad">
        <el-input-number
          v-model="model.scoreBad"
          :max="0"
          :disabled="isSpecial"
          controls-position="right"
        />
        <span class="ml-2 text-xs text-gray-400">待改进时增减的分值（负数或0）</span>
      </el-form-item>

      <el-form-item label="序号" prop="sortNo">
        <el-input-number v-model="model.sortNo" :min="1" controls-position="right" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saveMutation.isPending.value" @click="handleSave">
        {{ isEdit ? '保存' : '确认新增' }}
      </el-button>
    </template>
  </el-drawer>
</template>

<style lang="scss" scoped></style>
