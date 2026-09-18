<script setup lang="ts">
import { ref, reactive, computed, useTemplateRef } from 'vue'
import { useMutation } from '@tanstack/vue-query'
import type { FormRules, FormInstance } from 'element-plus'
import type {
  CreatePatrolItemRequest,
  PatrolCategory,
  PatrolItem,
  UpdatePatrolItemRequest,
} from '@/api/pcPatrol'
import * as pcPatrolApi from '@/api/pcPatrol'
import { confirm, message, withLoading } from '@/utils/feedback'

const emit = defineEmits<{
  success: []
  expandItems: [ids: string[]]
}>()

interface ItemFormModel {
  id?: string
  categoryId: string | null
  name: string
  startTime: string
  endTime: string
  sortNo: number
  /** 1=教师 2=学生督查；null 时提交时不带，由后端默认跟随分类 */
  role: number | null
}

const ROLE_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: '教师' },
  { value: 2, label: '学生督查' },
]

const visible = ref(false)
const editingRow = ref<PatrolItem | null>(null)
const formRef = useTemplateRef<FormInstance>('formRef')
/** 可选的分类列表（父级） */
const categoryList = ref<PatrolCategory[]>([])

function createDefaultModel(): ItemFormModel {
  return {
    categoryId: null,
    name: '',
    startTime: '',
    endTime: '',
    sortNo: 1,
    role: null,
  }
}

const model = reactive<ItemFormModel>(createDefaultModel())

const isEdit = computed(() => !!editingRow.value)
/** 根据已选分类自动推断默认巡查角色（跟随所属分类） */
const autoFollowRole = computed(() => {
  const cat = categoryList.value.find(c => c.id === model.categoryId)
  return cat?.role ?? 1
})

const timeRe = /^([01]\d|2[0-3]):([0-5]\d)$/

const startTimeValidator = (_rule: unknown, value: string, callback: (err?: Error) => void) => {
  if (!value) {
    callback(new Error('请选择开始时间'))
  } else if (!timeRe.test(value)) {
    callback(new Error('格式应为 HH:MM'))
  } else if (model.endTime && parseTime(value) >= parseTime(model.endTime)) {
    callback(new Error('开始时间需早于结束时间'))
  } else {
    callback()
  }
}

const endTimeValidator = (_rule: unknown, value: string, callback: (err?: Error) => void) => {
  if (!value) {
    callback(new Error('请选择结束时间'))
  } else if (!timeRe.test(value)) {
    callback(new Error('格式应为 HH:MM'))
  } else if (model.startTime && parseTime(value) <= parseTime(model.startTime)) {
    callback(new Error('结束时间需晚于开始时间'))
  } else {
    callback()
  }
}

const rules = computed<FormRules<ItemFormModel>>(() => ({
  categoryId: [{ required: true, message: '请选择所属分类', trigger: 'change' }],
  name: [{ required: true, message: '请输入巡查项名称', trigger: 'blur' }],
  startTime: [{ required: true, validator: startTimeValidator, trigger: 'change' }],
  endTime: [{ required: true, validator: endTimeValidator, trigger: 'change' }],
  sortNo: [{ required: true, message: '请输入序号', trigger: 'blur' }],
}))

const saveMutation = useMutation({
  mutationFn: async () => {
    if (!model.categoryId) return
    if (isEdit.value) {
      const payload: UpdatePatrolItemRequest = {
        id: model.id,
        categoryId: model.categoryId,
        name: model.name,
        startTime: model.startTime,
        endTime: model.endTime,
        sortNo: model.sortNo,
        enabled: editingRow.value?.enabled ?? true,
        role: model.role,
      }
      return pcPatrolApi.updateItem(payload)
    }
    const payload: CreatePatrolItemRequest = {
      categoryId: model.categoryId,
      name: model.name,
      startTime: model.startTime,
      endTime: model.endTime,
      sortNo: model.sortNo,
      role: model.role ?? undefined,
    }
    return pcPatrolApi.createItem(payload)
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
    pcPatrolApi.updateItem({ id: payload.id, enabled: payload.enabled }),
  onSuccess: () => emit('success'),
  onError: () => message.error('操作失败'),
})

function parseTime(t: string) {
  const m = t.match(/^(\d{2}):(\d{2})$/)
  return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : 0
}

function resetForm() {
  Object.assign(model, createDefaultModel())
  formRef.value?.clearValidate()
}

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  saveMutation.mutate()
}

/**
 * 打开新增/编辑巡查项抽屉
 * @param row 编辑的巡查项；新增时为 null
 * @param categories 可选分类列表
 * @param defaultCategoryId 新增时默认选中的分类
 * @param options.defaultName 新增时默认巡查项名称
 */
function open(
  row?: PatrolItem | null,
  categories: PatrolCategory[] = [],
  defaultCategoryId?: string,
  options: { defaultName?: string } = {},
) {
  editingRow.value = row ?? null
  categoryList.value = categories
  resetForm()
  if (row) {
    model.id = row.id
    model.categoryId = row.categoryId
    model.name = row.name
    model.startTime = row.startTime
    model.endTime = row.endTime
    model.sortNo = row.sortNo
    // row.role 可能为 0（旧数据/漏赋值），回退到所属分类的角色
    const catRole = categoryList.value.find(c => c.id === row.categoryId)?.role ?? 1
    model.role = row.role > 0 ? row.role : catRole
  } else {
    model.categoryId = defaultCategoryId ?? null
    const cat = categories.find(c => c.id === defaultCategoryId)
    model.sortNo = (cat?.items ?? []).reduce((mx, it) => Math.max(mx, it.sortNo), 0) + 1
    model.role = cat?.role ?? null
    if (options.defaultName) model.name = options.defaultName
  }
  visible.value = true
}

/** 删除巡查项（其下执勤地点一并删除） */
async function remove(row: PatrolItem, cat: PatrolCategory) {
  const locs = row.locations?.length ?? 0
  let tip = `确认删除巡查项「${row.name}」（${cat.name} · ${row.startTime}-${row.endTime}）吗？`
  if (locs > 0) tip += `\n该巡查项下有 ${locs} 个执勤地点，将一并删除。`
  tip += '\n删除后无法恢复。'
  const ok = await confirm(tip, '删除确认', {
    type: 'error',
    confirmButtonText: '确认删除',
  })
  if (!ok) return
  await withLoading(pcPatrolApi.deleteItem({ id: row.id }), '删除中...')
  message.success('已删除巡查项')
  emit('success')
}

/** 复制地点到所有同时段 */
async function copyLocations(item: PatrolItem, cat: PatrolCategory) {
  const srcLocs = item.locations ?? []
  if (!srcLocs.length) {
    message.warning('当前巡查项无地点，无法复制')
    return
  }
  const siblings = (cat.items ?? []).filter(it => it.id !== item.id)
  if (!siblings.length) {
    message.warning('无其他同时段可复制')
    return
  }
  const ok = await confirm(
    `将巡查项「${item.name}」下的 ${srcLocs.length} 个执勤地点复制到以下 ${siblings.length} 个同时段？\n\n${siblings
      .map(s => `· ${s.name}（当前 ${s.locations?.length ?? 0} 个地点）`)
      .join('\n')}\n\n注意：目标巡查项的现有地点将被替换，此操作不可撤销。`,
    '复制地点到所有时段',
    { type: 'warning', confirmButtonText: '确认复制' },
  )
  if (!ok) return
  await withLoading(
    Promise.all(
      siblings.map(sib => pcPatrolApi.copyLocations({ fromItemId: item.id, toItemId: sib.id })),
    ),
    '复制中...',
  )
  message.success(`已复制 ${srcLocs.length} 个地点到 ${siblings.length} 个时段`)
  emit(
    'expandItems',
    siblings.map(sib => sib.id),
  )
  emit('success')
}

function toggle(id: string, enabled: boolean) {
  toggleMutation.mutate({ id, enabled })
}

defineExpose({
  open,
  remove,
  toggle,
  copyLocations,
  isToggling: () => toggleMutation.isPending.value,
})
</script>

<template>
  <el-drawer
    v-model="visible"
    :title="isEdit ? '编辑巡查项' : '新增巡查项'"
    direction="rtl"
    size="480px"
    :close-on-click-modal="false"
  >
    <el-form
      ref="formRef"
      :model="model"
      :rules="rules"
      label-width="100px"
      :disabled="saveMutation.isPending.value"
    >
      <el-form-item label="所属分类" prop="categoryId">
        <el-select v-model="model.categoryId" class="w-full" :disabled="isEdit">
          <el-option v-for="cat in categoryList" :key="cat.id" :value="cat.id" :label="cat.name" />
        </el-select>
      </el-form-item>

      <el-form-item label="巡查项名称" prop="name">
        <el-input
          v-model="model.name"
          placeholder="如：晨读、大课间"
          maxlength="20"
          show-word-limit
        />
      </el-form-item>

      <div class="mb-4.5 flex items-center">
        <el-form-item label="时间范围" prop="startTime" class="mb-0!">
          <el-time-select
            v-model="model.startTime"
            start="00:00"
            step="00:05"
            end="24:00"
            placeholder="开始时间"
            class="w-32!"
          />
        </el-form-item>
        <IconEpSemiSelect class="mx-2 text-gray-300" />
        <el-form-item prop="endTime" label-width="0" class="mb-0!">
          <el-time-select
            v-model="model.endTime"
            start="00:00"
            step="00:05"
            end="24:00"
            placeholder="结束时间"
            class="w-32!"
          />
        </el-form-item>
      </div>

      <el-form-item label="巡查角色">
        <el-select v-model="model.role" class="w-full" :placeholder="`跟随分类（${autoFollowRole === 2 ? '学生督查' : '教师'}）`" clearable>
          <el-option v-for="opt in ROLE_OPTIONS" :key="opt.value" :value="opt.value" :label="opt.label" />
        </el-select>
        <div class="mt-1 text-xs text-gray-400">不选则自动跟随所属分类的角色（新增场景）</div>
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
