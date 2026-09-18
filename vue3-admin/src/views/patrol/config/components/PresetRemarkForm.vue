<script setup lang="ts">
import { computed, reactive, ref, useTemplateRef, watch } from 'vue'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import dayjs from 'dayjs'
import type { FormRules, FormInstance } from 'element-plus'
import type { PatrolPresetRemark } from '@/api/pcPatrol'
import { pcPatrolKeys } from '@/api/pcPatrol'
import * as pcPatrolApi from '@/api/pcPatrol'
import { confirm, message, withLoading } from '@/utils/feedback'

defineOptions({ name: 'PatrolPresetRemarkForm' })

const emit = defineEmits<{ success: [] }>()

/** 通用意见：不归属具体巡查项，移动端所有班级巡查项都能选到 */
const GENERAL_ITEM_ID = '0'

const queryClient = useQueryClient()
const formRef = useTemplateRef<FormInstance>('formRef')

const visible = ref(false)
const searchKey = ref('')
/** 当前选中的巡查项（'0' = 通用） */
const curItemId = ref<string>(GENERAL_ITEM_ID)
/** 当前编辑行（null = 新增） */
const editingRow = ref<PatrolPresetRemark | null>(null)
const dialogVisible = ref(false)

/* ================= 巡查项选项：仅「按班级评价」分类下的子项 + 通用 ================= */

const { data: treeData } = useQuery({
  queryKey: pcPatrolKeys.categoryTree(),
  queryFn: ({ signal }) => pcPatrolApi.fetchCategoryTree(signal),
  enabled: computed(() => visible.value),
})

interface ItemOption {
  id: string
  name: string
}
interface ItemGroup {
  label: string
  options: ItemOption[]
}

const itemGroups = computed<ItemGroup[]>(() =>
  (treeData.value ?? [])
    .filter(c => c.evalMode === 1)
    .slice()
    .sort((a, b) => a.sortNo - b.sortNo)
    .map(c => ({
      label: c.name,
      options: (c.items ?? [])
        .slice()
        .sort((a, b) => a.sortNo - b.sortNo)
        .map(i => ({ id: i.id, name: i.name })),
    }))
    .filter(g => g.options.length),
)

const firstItemId = computed(() => itemGroups.value[0]?.options[0]?.id ?? GENERAL_ITEM_ID)

/** 用户是否手动切换过巡查项（未手动切换时，巡查项下拉加载完成后自动落到第一个班级巡查子项） */
const userPickedItem = ref(false)

watch(itemGroups, groups => {
  if (!visible.value || userPickedItem.value) return
  const first = groups[0]?.options[0]?.id
  if (first && curItemId.value === GENERAL_ITEM_ID) curItemId.value = first
})

/* ================= 列表 ================= */

const { data: remarks, isFetching: loading } = useQuery({
  queryKey: computed(() => [...pcPatrolKeys.presetRemarks(), curItemId.value, searchKey.value]),
  queryFn: ({ signal }) =>
    pcPatrolApi.fetchPresetRemarks(
      {
        itemId: curItemId.value,
        searchKey: searchKey.value.trim() || undefined,
      },
      signal,
    ),
  enabled: computed(() => visible.value),
})

const list = computed(() => remarks.value ?? [])

/** 新增时默认序号 = 当前巡查项下最大序号 + 1 */
function nextSortNo() {
  return list.value.reduce((mx, r) => Math.max(mx, r.sortNo), 0) + 1
}

/* ================= 新增 / 编辑 ================= */

interface RemarkModel {
  id?: string
  itemId: string
  content: string
  sortNo: number
}

const model = reactive<RemarkModel>({ itemId: GENERAL_ITEM_ID, content: '', sortNo: 1 })

const rules: FormRules<RemarkModel> = {
  itemId: [{ required: true, message: '请选择所属巡查项', trigger: 'change' }],
  content: [{ required: true, message: '请输入意见内容', trigger: 'blur' }],
  sortNo: [{ required: true, message: '请输入排序号', trigger: 'blur' }],
}

const saveMutation = useMutation({
  mutationFn: async () => {
    if (editingRow.value) {
      return pcPatrolApi.updatePresetRemark({
        id: model.id!,
        content: model.content,
        itemId: model.itemId,
        sortNo: model.sortNo,
      })
    }
    return pcPatrolApi.createPresetRemark({
      itemId: model.itemId,
      content: model.content,
      sortNo: model.sortNo,
    })
  },
  onSuccess: () => {
    message.success(editingRow.value ? '保存成功' : '新增成功')
    dialogVisible.value = false
    // 新增/编辑后可能改变了归属项，切到目标项以便立即看到
    curItemId.value = model.itemId
    refresh()
  },
})

function refresh() {
  queryClient.invalidateQueries({ queryKey: pcPatrolKeys.presetRemarks() })
  emit('success')
}

/** 打开抽屉；itemId 为空则默认落到第一个班级巡查子项 */
function open(itemId?: string) {
  const picked = !!itemId && itemId !== GENERAL_ITEM_ID
  userPickedItem.value = picked
  curItemId.value = (picked ? itemId : firstItemId.value) || GENERAL_ITEM_ID
  searchKey.value = ''
  visible.value = true
}

function handleAdd() {
  editingRow.value = null
  model.id = undefined
  model.itemId = curItemId.value
  model.content = ''
  model.sortNo = nextSortNo()
  formRef.value?.clearValidate()
  dialogVisible.value = true
}

function handleEdit(row: PatrolPresetRemark) {
  editingRow.value = row
  model.id = row.id
  model.itemId = row.itemId || GENERAL_ITEM_ID
  model.content = row.content
  model.sortNo = row.sortNo
  formRef.value?.clearValidate()
  dialogVisible.value = true
}

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  saveMutation.mutate()
}

async function handleRemove(row: PatrolPresetRemark) {
  const ok = await confirm(
    `确认删除预设意见「${row.content}」吗？删除后移动端将不再提供该快捷选项。`,
    '删除确认',
    { type: 'error', confirmButtonText: '确认删除' },
  )
  if (!ok) return
  await withLoading(pcPatrolApi.deletePresetRemark({ id: row.id }), '删除中...')
  message.success('已删除')
  refresh()
}

defineExpose({ open })
</script>

<template>
  <el-drawer v-model="visible" title="预设意见管理" direction="rtl" size="620px">
    <div class="mb-3 flex items-center gap-2">
      <el-select
        v-model="curItemId"
        placeholder="选择巡查项"
        class="w-64"
        @change="userPickedItem = true"
      >
        <el-option :label="'通用（所有巡查项）'" :value="GENERAL_ITEM_ID" />
        <el-option-group v-for="g in itemGroups" :key="g.label" :label="g.label">
          <el-option v-for="o in g.options" :key="o.id" :label="o.name" :value="o.id" />
        </el-option-group>
      </el-select>
      <el-input
        v-model="searchKey"
        placeholder="搜索意见内容"
        clearable
        class="w-40"
        :prefix-icon="undefined"
      />
      <el-button type="primary" class="ml-auto" @click="handleAdd">
        <template #icon><IconEpPlus /></template>
        新增意见
      </el-button>
    </div>

    <el-alert
      type="info"
      :closable="false"
      class="mb-3"
      title="预设意见按「班级巡查」的子巡查项分别维护，每项可设多条；移动端填写备注时按当前巡查项加载对应意见，选中后可再修改。"
    />

    <el-table
      :data="list as PatrolPresetRemark[]"
      v-loading="loading"
      row-key="id"
      border
      size="small"
    >
      <el-table-column type="index" label="序号" width="60" align="center" />
      <el-table-column prop="content" label="意见内容" min-width="220" show-overflow-tooltip />
      <el-table-column prop="sortNo" label="排序号" width="90" align="center" />
      <el-table-column label="添加时间" width="140" align="center">
        <template #default="{ row }">
          <span class="text-xs text-gray-500">
            {{ row.createTime ? dayjs(row.createTime).format('YYYY-MM-DD HH:mm') : '—' }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right" align="center">
        <template #default="{ row }">
          <el-button type="primary" link @click="handleEdit(row as PatrolPresetRemark)">
            编辑
          </el-button>
          <el-button type="danger" link @click="handleRemove(row as PatrolPresetRemark)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty
      v-if="!list.length && !loading"
      :description="itemGroups.length ? '该巡查项下暂无预设意见' : '请先在「按班级评价」分类下添加巡查项'"
      :image-size="60"
    />

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="editingRow ? '编辑预设意见' : '新增预设意见'"
      width="440px"
      append-to-body
      :close-on-click-modal="false"
      align-center
    >
      <el-form ref="formRef" :model="model" :rules="rules" label-width="80px">
        <el-form-item label="巡查项" prop="itemId">
          <el-select v-model="model.itemId" placeholder="选择巡查项" class="w-full">
            <el-option label="通用（所有巡查项）" :value="GENERAL_ITEM_ID" />
            <el-option-group v-for="g in itemGroups" :key="g.label" :label="g.label">
              <el-option v-for="o in g.options" :key="o.id" :label="o.name" :value="o.id" />
            </el-option-group>
          </el-select>
        </el-form-item>
        <el-form-item label="意见内容" prop="content">
          <el-input
            v-model="model.content"
            type="textarea"
            :rows="3"
            placeholder="如：晨读整齐声音洪亮，提出表扬"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="排序号" prop="sortNo">
          <el-input-number v-model="model.sortNo" :min="1" controls-position="right" />
          <span class="ml-2 text-xs text-gray-400">数值越小越靠前</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saveMutation.isPending.value" @click="handleSave">
          {{ editingRow ? '保存' : '确认新增' }}
        </el-button>
      </template>
    </el-dialog>
  </el-drawer>
</template>

<style lang="scss" scoped></style>
