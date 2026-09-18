<script setup lang="ts">
import { ref, computed } from 'vue'
import { message } from '@/utils/feedback'
import TermSelect from '@/components/TermSelect/index.vue'
import {
  saveImportItem,
  type ImportItemVM,
  type SaveImportItemPayload,
  type ImportValueVM,
} from '@/api/importItem'
import { QUALITY_TYPES, IMPORT_TYPES, SHOW_TYPES, parentTreeProps, valueTooltip } from '../dict'

const props = defineProps<{
  treeData: ImportItemVM[]
  termCode?: string
}>()

const emit = defineEmits<{
  success: []
}>()

const visible = ref(false)
const saving = ref(false)
const form = ref<SaveImportItemPayload & { values: ImportValueVM[] }>(defaultForm())

function defaultForm(): SaveImportItemPayload & { values: ImportValueVM[] } {
  return {
    project: '',
    qualityType: 'de',
    importType: 1,
    showType: 0,
    parentId: null,
    order: 0,
    scoreRadio: 0,
    termCode: '',
    content: '',
    enabled: true,
    values: [],
  }
}

// 父级下拉的可选树（编辑时要把自身及其子孙排除，避免循环）
const parentTreeOptions = computed<ImportItemVM[]>(() => {
  if (!form.value.id && !form.value.parentId) return props.treeData
  const excludeIds = new Set<string>([form.value.id!])
  collectDescendantIds(form.value.id!, excludeIds)
  return pruneTree(props.treeData, excludeIds)
})

function collectDescendantIds(rootId: string, set: Set<string>) {
  const visit = (list: ImportItemVM[]) => {
    for (const n of list) {
      if (n.parentId === rootId) {
        set.add(n.id)
        visit([n, ...(n.children ?? [])])
      }
    }
  }
  visit(props.treeData)
}

function pruneTree(list: ImportItemVM[], exclude: Set<string>): ImportItemVM[] {
  return list
    .filter(n => !exclude.has(n.id))
    .map(n => ({ ...n, children: n.children ? pruneTree(n.children, exclude) : [] }))
}

/** 打开新增（row 为空 = 新增顶级标题）或编辑弹窗 */
function open(row?: ImportItemVM) {
  if (row) {
    form.value = {
      id: row.id,
      project: row.project,
      qualityType: row.qualityType ?? 'other',
      importType: row.importType,
      showType: row.showType,
      parentId: row.parentId,
      order: row.order,
      scoreRadio: row.scoreRadio,
      termCode: row.termCode,
      content: row.content,
      enabled: row.enabled,
      values: (row.values ?? []).map(v => ({ ...v })),
    }
  } else {
    form.value = { ...defaultForm(), termCode: props.termCode ?? '', parentId: null, importType: 0 }
  }
  visible.value = true
}

async function handleSave() {
  if (!form.value.project.trim()) {
    message.warning('请填写项目名称')
    return
  }
  if (!form.value.termCode) {
    message.warning('请选择学期')
    return
  }
  saving.value = true
  try {
    // 后端会自己处理标题列字段归一化
    const payload: SaveImportItemPayload = {
      ...form.value,
      // 标题列不传 qualityType 让后端填"other"
      qualityType:
        form.value.importType === 0 ? form.value.qualityType || 'other' : form.value.qualityType,
    }
    if (form.value.importType === 0) {
      payload.scoreRadio = 0
      payload.values = []
    }
    await saveImportItem(payload)
    message.success('保存成功')
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
    :title="form.id ? '编辑导入项' : '新增导入项'"
    width="640px"
    destroy-on-close
  >
    <el-form :model="form" label-width="100px">
      <el-form-item label="项目名称" required>
        <el-input
          v-model="form.project"
          placeholder="如：国家课程 / 语文 / 数学"
          maxlength="40"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="父级">
        <el-tree-select
          v-model="form.parentId"
          :data="parentTreeOptions"
          :props="parentTreeProps"
          node-key="id"
          placeholder="不选 = 顶级"
          clearable
          check-strictly
          class="w-full"
        />
      </el-form-item>

      <el-form-item label="导入类型" required>
        <el-select v-model="form.importType" class="w-full" :disabled="!!form.id">
          <el-option v-for="t in IMPORT_TYPES" :key="t.value" :label="t.label" :value="t.value" />
        </el-select>
        <div class="mt-1 text-xs text-gray-400">
          {{
            form.importType === 0
              ? '标题列：用做分组/小节标题，不参与实际导入；它可以挂在父级下，也可以作为顶级标题。'
              : '导入模板：叶子节点，按模板内容参与教师端成绩导入。'
          }}
        </div>
      </el-form-item>

      <!-- 叶子节点字段组 -->
      <template v-if="form.importType !== 0">
        <div class="grid grid-cols-2 gap-x-4">
          <el-form-item label="素养类型">
            <el-select v-model="form.qualityType" class="w-full" placeholder="选择五育类型">
              <el-option v-for="q in QUALITY_TYPES" :key="q.key" :value="q.key" :label="q.label" />
              <el-option value="other" label="其他" />
            </el-select>
          </el-form-item>
          <el-form-item label="展示类型">
            <el-select v-model="form.showType" class="w-full">
              <el-option v-for="t in SHOW_TYPES" :key="t.value" :label="t.label" :value="t.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="分数占比%">
            <el-input-number v-model="form.scoreRadio" :min="0" :max="100" class="w-full" />
          </el-form-item>
          <el-form-item label="排序">
            <el-input-number v-model="form.order" :min="0" class="w-full" />
          </el-form-item>
        </div>
      </template>
      <template v-else>
        <el-form-item label="排序">
          <el-input-number v-model="form.order" :min="0" class="w-48" />
          <span class="ml-2 text-xs text-gray-400">同层内的展示顺序</span>
        </el-form-item>
      </template>

      <el-form-item label="学期" required>
        <TermSelect v-model="form.termCode" />
        <div class="ml-3 text-xs text-gray-400">学期由顶部学期选择器继承，可在此处覆盖</div>
      </el-form-item>

      <el-form-item label="内容">
        <el-input
          v-model="form.content"
          type="textarea"
          :rows="2"
          placeholder="描述 / 说明（可选）"
        />
      </el-form-item>

      <el-form-item label="启用">
        <el-switch v-model="form.enabled" />
      </el-form-item>

      <!-- 叶子节点：值集合 -->
      <el-form-item v-if="form.importType !== 0" label="值集合">
        <div class="w-full space-y-2">
          <!-- 表头：明确等级/分值含义，不占每行宽度 -->
          <div
            v-if="form.values.length"
            class="mb-1 flex items-center gap-2 px-1 text-xs text-gray-400"
          >
            <span class="flex-1">取值</span>
            <div class="w-20 text-center">
              等级
              <el-tooltip content="评分等级：1-5 级，数值越大等级越高" placement="top">
                <IconEpInfoFilled class="ml-0.5 text-gray-400" />
              </el-tooltip>
            </div>
            <div class="w-20 text-center">
              分值
              <el-tooltip content="该取值对应的得分（0-100 分）" placement="top">
                <IconEpInfoFilled class="ml-0.5 text-gray-400" />
              </el-tooltip>
            </div>
            <span class="w-12 text-right">操作</span>
          </div>

          <div v-for="(v, i) in form.values" :key="i" class="flex items-center gap-2">
            <el-input v-model="v.value" placeholder="值（如 甲 / +5 / -3）" class="flex-1">
              <template #prefix>
                <el-tooltip v-if="valueTooltip(v)" :content="valueTooltip(v)" placement="top">
                  <IconEpInfoFilled class="text-gray-400" />
                </el-tooltip>
              </template>
            </el-input>
            <el-input-number v-model="v.type" :min="1" :max="5" placeholder="等级" class="!w-20" />
            <el-input-number
              v-model="v.scoreValue"
              :min="0"
              :max="100"
              placeholder="分值"
              class="!w-20"
            />
            <el-button link type="danger" class="w-12 text-right" @click="form.values.splice(i, 1)"
              >移除</el-button
            >
          </div>
          <el-button size="small" @click="form.values.push({ value: '', type: 1, scoreValue: 0 })">
            + 添加值
          </el-button>
          <div class="rounded bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-500">
            说明：每行代表一个取值。<b class="text-gray-600">值</b> 以「+」开头为加分项（如
            <code>+5</code> 表示本次 +5 分），「−」开头为减分项；<b class="text-gray-600">等级</b>
            为该取值的评分等级（1-5）；<b class="text-gray-600">分值</b>
            为该取值对应的得分（0-100）。
          </div>
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>
