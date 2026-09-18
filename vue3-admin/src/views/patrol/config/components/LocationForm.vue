<script setup lang="ts">
import { ref, reactive, computed, useTemplateRef } from 'vue'
import { useMutation } from '@tanstack/vue-query'
import dayjs from 'dayjs'
import type { FormRules, FormInstance } from 'element-plus'
import ContactSelect from '@/components/ContactSelect/index.vue'
import type {
  CreatePatrolLocationRequest,
  PatrolCategory,
  PatrolLocation,
  PatrolLocationOverrideReq,
} from '@/api/pcPatrol'
import * as pcPatrolApi from '@/api/pcPatrol'
import { confirm, message, withLoading } from '@/utils/feedback'

const emit = defineEmits<{ success: [] }>()

interface LocationFormModel {
  id?: string
  categoryId?: string
  name: string
  shortName: string
  sortNo: number
  defaultTeacherId: string | null
  defaultTeacherName: string | null
}

interface OverrideRow {
  overrideDate: string
  teacherId: string | null
  teacherName: string
}

const visible = ref(false)
const editingRow = ref<PatrolLocation | null>(null)
const parentCategory = ref<PatrolCategory | null>(null)
const formRef = useTemplateRef<FormInstance>('formRef')
const contactRef = useTemplateRef('contactRef')

function createDefaultModel(): LocationFormModel {
  return {
    name: '',
    shortName: '',
    sortNo: 1,
    defaultTeacherId: null,
    defaultTeacherName: null,
  }
}

const model = reactive<LocationFormModel>(createDefaultModel())

/** 日期覆盖例外（编辑时全量提交） */
const overrides = ref<OverrideRow[]>([])

const isEdit = computed(() => !!editingRow.value)

const rules = computed<FormRules<LocationFormModel>>(() => ({
  name: [{ required: true, message: '请输入点位名称', trigger: 'blur' }],
  sortNo: [{ required: true, message: '请输入序号', trigger: 'blur' }],
}))

const saveMutation = useMutation({
  mutationFn: async () => {
    const overridePayload: PatrolLocationOverrideReq[] = overrides.value.map(o => ({
      overrideDate: o.overrideDate,
      teacherId: o.teacherId,
      teacherName: o.teacherName,
    }))
    if (isEdit.value) {
      return pcPatrolApi.updateLocation({
        id: model.id!,
        categoryId: model.categoryId ?? null,
        name: model.name,
        shortName: model.shortName,
        sortNo: model.sortNo,
        enabled: editingRow.value?.enabled ?? true,
        defaultTeacherId: model.defaultTeacherId,
        defaultTeacherName: model.defaultTeacherName,
        overrides: overridePayload,
      })
    }
    const payload: CreatePatrolLocationRequest = {
      categoryId: model.categoryId ?? null,
      name: model.name,
      shortName: model.shortName,
      sortNo: model.sortNo,
      enabled: true,
      defaultTeacherId: model.defaultTeacherId,
      defaultTeacherName: model.defaultTeacherName,
      overrides: overridePayload,
    }
    return pcPatrolApi.createLocation(payload)
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
    pcPatrolApi.updateLocation({ id: payload.id, enabled: payload.enabled }),
  onSuccess: () => emit('success'),
  onError: () => message.error('操作失败'),
})

function resetForm() {
  Object.assign(model, createDefaultModel())
  overrides.value = []
  formRef.value?.clearValidate()
}

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  saveMutation.mutate()
}

/** 选择默认执勤教师（单选，可重选） */
async function pickDefaultTeacher() {
  const picked = await contactRef.value?.open({
    selectType: 'user',
    selectNum: 'min',
    selected: model.defaultTeacherId
      ? [{ id: model.defaultTeacherId, name: model.defaultTeacherName ?? '', type: 2 }]
      : [],
  })
  if (!picked?.length) return
  model.defaultTeacherId = picked[0].id
  model.defaultTeacherName = picked[0].name
}

/** 清除默认教师 */
function clearDefaultTeacher() {
  model.defaultTeacherId = null
  model.defaultTeacherName = null
}

/** 添加日期覆盖例外：先选日期，再选老师 */
async function addOverride() {
  const date = dayjs().format('YYYY-MM-DD')
  const picked = await contactRef.value?.open({ selectType: 'user', selectNum: 'min' })
  if (!picked?.length) return
  const teacher = picked[0]
  const exist = overrides.value.find(o => o.overrideDate === date)
  if (exist) {
    exist.teacherId = teacher.id
    exist.teacherName = teacher.name
    message.success(`已更新 ${date} 的例外教师`)
    return
  }
  overrides.value.push({ overrideDate: date, teacherId: teacher.id, teacherName: teacher.name })
}

/** 修改某条例外的教师 */
async function editOverride(row: OverrideRow) {
  const picked = await contactRef.value?.open({
    selectType: 'user',
    selectNum: 'min',
    selected: row.teacherId ? [{ id: row.teacherId, name: row.teacherName, type: 2 }] : [],
  })
  if (!picked?.length) return
  row.teacherId = picked[0].id
  row.teacherName = picked[0].name
}

/** 选择某条例外的日期 */
function pickOverrideDate(row: OverrideRow, value: string | null) {
  if (!value) return
  row.overrideDate = value
}

function removeOverride(idx: number) {
  overrides.value.splice(idx, 1)
}

/**
 * 打开新增/编辑执勤点位抽屉（教师执勤分类：点位直挂分类，不区分时段）
 * @param row 编辑的点位；新增时为 null
 * @param category 所属巡查分类
 */
function open(row?: PatrolLocation | null, category?: PatrolCategory | null) {
  editingRow.value = row ?? null
  parentCategory.value = category ?? null
  resetForm()
  if (row) {
    model.id = row.id
    model.categoryId = row.categoryId ?? category?.id
    model.name = row.name
    model.shortName = row.shortName ?? ''
    model.sortNo = row.sortNo
    model.defaultTeacherId = row.defaultTeacherId ?? null
    model.defaultTeacherName = row.defaultTeacherName ?? null
    overrides.value = (row.overrides ?? []).map(o => ({
      overrideDate: dayjs(o.overrideDate).format('YYYY-MM-DD'),
      teacherId: o.teacherId ?? null,
      teacherName: o.teacherName,
    }))
  } else {
    model.categoryId = category?.id
    model.sortNo = (category?.locations ?? []).reduce((mx, l) => Math.max(mx, l.sortNo), 0) + 1
  }
  visible.value = true
}

/** 删除执勤点位 */
async function remove(row: PatrolLocation, category: PatrolCategory) {
  const ok = await confirm(
    `确认删除执勤点位「${row.name}」（${category.name} · 序号 ${row.sortNo}）吗？\n删除后无法恢复。如仅需临时下线，建议使用「停用」。`,
    '删除确认',
    { type: 'error', confirmButtonText: '确认删除' },
  )
  if (!ok) return
  await withLoading(pcPatrolApi.deleteLocation({ id: row.id }), '删除中...')
  message.success('已删除点位')
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
    :title="isEdit ? '编辑执勤点位' : '新增执勤点位'"
    direction="rtl"
    size="520px"
    :close-on-click-modal="false"
  >
    <el-form
      ref="formRef"
      :model="model"
      :rules="rules"
      label-width="100px"
      :disabled="saveMutation.isPending.value"
    >
      <el-form-item v-if="parentCategory" label="所属分类">
        <span class="text-gray-500">{{ parentCategory.name }}</span>
      </el-form-item>

      <el-form-item label="点位名称" prop="name">
        <el-input
          v-model="model.name"
          placeholder="如：操场东边攀爬区域"
          maxlength="30"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="简称">
        <el-input
          v-model="model.shortName"
          placeholder="如：东·攀爬（选填，移动端窄空间展示）"
          maxlength="10"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="默认执勤教师">
        <div class="flex w-full items-center gap-2">
          <el-input
            :model-value="model.defaultTeacherName ?? ''"
            placeholder="未设置（移动端评价时需手动选教师）"
            readonly
            class="flex-1"
          >
            <template #suffix>
              <el-icon
                v-if="model.defaultTeacherName"
                class="cursor-pointer"
                @click="clearDefaultTeacher"
              >
                <IconEpCircleClose />
              </el-icon>
            </template>
          </el-input>
          <el-button @click="pickDefaultTeacher">选择教师</el-button>
        </div>
        <div class="mt-1 w-full text-xs text-gray-400">
          移动端评价该点位时自动带入默认教师，评价时可临时改选
        </div>
      </el-form-item>

      <el-form-item label="序号" prop="sortNo">
        <el-input-number v-model="model.sortNo" :min="1" controls-position="right" />
      </el-form-item>

      <!-- 日期覆盖例外 -->
      <el-form-item label="日期例外">
        <div class="w-full">
          <div v-if="overrides.length" class="mb-2 w-full">
            <div
              v-for="(row, idx) in overrides"
              :key="idx"
              class="mb-1.5 flex w-full items-center gap-2"
            >
              <el-date-picker
                :model-value="row.overrideDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="选择日期"
                :clearable="false"
                style="width: 150px"
                @update:model-value="(v: string | null) => pickOverrideDate(row, v)"
              />
              <el-input :model-value="row.teacherName" readonly class="flex-1" />
              <el-button link type="primary" @click="editOverride(row)">换教师</el-button>
              <el-button link type="danger" @click="removeOverride(idx)">删除</el-button>
            </div>
          </div>
          <el-button
            type="primary"
            plain
            class="w-full"
            :icon="undefined"
            @click="addOverride"
          >
            添加日期例外（指定日期临时换教师）
          </el-button>
          <div class="mt-1 text-xs text-gray-400">
            例外的优先级高于默认教师，如教师请假由他人代班时使用
          </div>
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saveMutation.isPending.value" @click="handleSave">
        {{ isEdit ? '保存' : '确认新增' }}
      </el-button>
    </template>
  </el-drawer>

  <ContactSelect ref="contactRef" />
</template>

<style lang="scss" scoped></style>
