<script setup lang="ts">
import { ref, onMounted, watch, useTemplateRef } from 'vue'
import { message, confirm } from '@/utils/feedback'
import ProTable from '@/components/ProTable/index.vue'
import type { ProTableColumn } from '@/components/ProTable/index.vue'
import TermSelect from '@/components/TermSelect/index.vue'
import type { TermOption as TermSelectOption } from '@/components/TermSelect/types'
import {
  fetchImportItems,
  fetchImportItemTerms,
  saveAsImportItem,
  deleteImportItems,
  type ImportItemVM,
} from '@/api/importItem'
import { importTypeName, showTypeName, wuyuName, qualityBadgeClass, valueTooltip } from './dict'
import ImportItemForm from './components/ImportItemForm.vue'
import SyncTermDialog from './components/SyncTermDialog.vue'

// ==================== State ====================

const termCode = ref('')
// 给 TermSelect 的 options（含 current 标记），由 TermSelect 内部自动选中本学期
const termOptions = ref<TermSelectOption[]>([])
const searchKey = ref('')

const flat = ref<ImportItemVM[]>([]) // 服务端扁平数据
const treeData = ref<ImportItemVM[]>([]) // 前端组装后的树
const loading = ref(false)
const copyingId = ref<string | null>(null)

const proTableRef = useTemplateRef('proTableRef')
const formRef = useTemplateRef('formRef')
const syncDialogRef = useTemplateRef('syncDialogRef')

onMounted(async () => {
  // 拉导入项管理的学期列表（含本学期推算），传给 TermSelect 让它自动选本学期
  const terms = await fetchImportItemTerms()
  termOptions.value = terms.map(t => ({
    code: t.code,
    name: t.name,
    current: t.isCurrent,
  }))
  // 学期列表为空时，直接 reload 会 no-op；等到 watch(termCode) 真正触发
})

// termCode 一旦被 TermSelect 自动设为本学期（或用户手动切换），自动 reload
watch(termCode, () => {
  if (termCode.value) reload()
})

// ==================== 表格列 ====================

const columns: ProTableColumn<ImportItemVM>[] = [
  { label: '评分项目名', minWidth: 180, slot: 'project' },
  { label: '素养类型', width: 100, slot: 'quality' },
  {
    prop: 'importType',
    label: '导入类型',
    width: 100,
    formatter: r => importTypeName(r.importType),
  },
  { prop: 'showType', label: '展示类型', width: 90, formatter: r => showTypeName(r.showType) },
  { label: '分数占比', width: 90, align: 'center', slot: 'score' },
  { label: '值', minWidth: 180, slot: 'values' },
  { prop: 'order', label: '排序', width: 80, align: 'center' },
  { label: '操作', width: 180, fixed: 'right', slot: 'action' },
]

// ==================== Load & build tree ====================

async function reload() {
  if (!termCode.value) return
  loading.value = true
  try {
    flat.value = await fetchImportItems({
      termCode: termCode.value,
      searchKey: searchKey.value || undefined,
    })
    treeData.value = buildTree(flat.value)
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  reload()
}

function handleReset() {
  searchKey.value = ''
  reload()
}

function buildTree(list: ImportItemVM[]): ImportItemVM[] {
  const byId = new Map<string, ImportItemVM>()
  list.forEach(n => byId.set(n.id, { ...n, children: [] }))
  const roots: ImportItemVM[] = []
  for (const n of byId.values()) {
    if (n.parentId && byId.has(n.parentId)) {
      byId.get(n.parentId)!.children!.push(n)
    } else {
      roots.push(n)
    }
  }
  // 同层排序
  const sortRec = (arr: ImportItemVM[]) => {
    arr.sort((a, b) => a.order - b.order || (a.id > b.id ? 1 : -1))
    arr.forEach(c => c.children && sortRec(c.children))
  }
  sortRec(roots)
  return roots
}

/** 展开 / 收起整棵树 */
function toggleRows(rows: ImportItemVM[], expanded: boolean) {
  rows.forEach(row => {
    proTableRef.value?.elTableRef?.toggleRowExpansion(row, expanded)
    if (row.children?.length) toggleRows(row.children, expanded)
  })
}
function handleExpandAll() {
  toggleRows(treeData.value, true)
}
function handleCollapseAll() {
  toggleRows(treeData.value, false)
}

// ==================== 弹窗入口 ====================

function handleCreate() {
  if (!termCode.value) {
    message.warning('请先选择学期')
    return
  }
  formRef.value?.open()
}

function handleEdit(row: ImportItemVM) {
  formRef.value?.open(row)
}

function handleOpenSync() {
  syncDialogRef.value?.open()
}

function onSuccess() {
  reload()
}

// ==================== Delete ====================

function countSubtree(nodeId: string): number {
  let count = 0
  const visit = (list: ImportItemVM[]) => {
    for (const n of list) {
      if (n.id === nodeId) {
        count = collectAll(n)
        return
      }
      if (n.children) visit(n.children)
    }
  }
  visit(treeData.value)
  return count
}
function collectAll(node: ImportItemVM): number {
  let n = 1
  for (const c of node.children ?? []) n += collectAll(c)
  return n
}

async function onDelete(row: ImportItemVM) {
  const total = countSubtree(row.id)
  const msg =
    total > 1
      ? `确认删除「${row.project}」？将同时删除其下 ${total - 1} 个子项（合计 ${total} 条）。`
      : `确认删除导入项「${row.project}」？`
  const ok = await confirm(msg, '提示', { type: 'warning' })
  if (!ok) return
  await deleteImportItems([row.id])
  message.success('已删除')
  reload()
}

// ==================== SaveAs (复制一个，含子树) ====================

async function onSaveAs(row: ImportItemVM) {
  const total = countSubtree(row.id)
  const msg =
    total > 1
      ? `确认复制「${row.project}」及其下 ${total - 1} 个子项？新节点名为「${row.project}(副本)」，挂回同一父级下。`
      : `确认复制「${row.project}」？新节点名为「${row.project}(副本)」。`
  const ok = await confirm(msg, '复制节点', { type: 'info' })
  if (!ok) return
  copyingId.value = row.id
  try {
    const newId = await saveAsImportItem(row.id)
    message.success(`已复制，新节点 Id=${newId}`)
    reload()
  } finally {
    copyingId.value = null
  }
}
</script>

<template>
  <div class="flex h-page flex-col">
    <!-- 筛选区 -->
    <div class="panel-card mb-4 shrink-0">
      <div class="flex items-center">
        <TermSelect v-model="termCode" :options="termOptions" />
        <el-input
          v-model="searchKey"
          class="ml-3 w-60!"
          placeholder="按项目名称搜索"
          clearable
          @keyup.enter="handleSearch"
        />
        <el-button class="ml-3" type="primary" @click="handleSearch">
          <template #icon><IconEpSearch /></template>查询
        </el-button>
        <el-button @click="handleReset">
          <template #icon><IconEpRefresh /></template>重置
        </el-button>
      </div>
    </div>

    <!-- 表格区 -->
    <div class="panel-card flex min-h-0 flex-1 flex-col">
      <div class="mb-4 flex shrink-0 items-center">
        <el-button @click="handleExpandAll">
          <template #icon><IconRiExpandVerticalLine /></template>展开全部
        </el-button>
        <el-button @click="handleCollapseAll">
          <template #icon><IconRiCollapseVerticalLine /></template>收起全部
        </el-button>
        <el-button @click="handleOpenSync">
          <template #icon><IconEpCopyDocument /></template>同步整学期
        </el-button>
        <el-button class="ml-auto!" type="primary" @click="handleCreate">
          <template #icon><IconEpPlus /></template>新增导入项
        </el-button>
      </div>

      <ProTable
        auto-height
        ref="proTableRef"
        :columns="columns"
        :data="treeData"
        :loading="loading"
        default-expand-all
        :tree-props="{ children: 'children' }"
      >
        <template #project="{ row }">
          <span :class="row.importType === 0 ? 'font-medium text-gray-700' : 'text-gray-900'">
            {{ row.project }}
          </span>
          <span
            v-if="row.children?.length"
            class="ml-1 rounded bg-gray-100 px-1.5 text-xs text-gray-500"
            >{{ row.children.length }}</span
          >
          <el-tag v-if="!row.enabled" size="small" type="info" class="ml-2 !opacity-80"
            >停用</el-tag
          >
        </template>

        <template #quality="{ row }">
          <span
            class="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium text-white"
            :class="qualityBadgeClass(row.qualityType)"
          >
            {{ wuyuName(row.qualityType) }}
          </span>
        </template>

        <template #score="{ row }">
          <span v-if="row.importType === 0" class="text-gray-300">—</span>
          <span v-else class="text-gray-700"
            >{{ row.scoreRadio || '—'
            }}<span v-if="row.scoreRadio" class="ml-1 text-xs text-gray-400">%</span></span
          >
        </template>

        <template #values="{ row }">
          <span v-if="row.importType === 0 || !row.values?.length" class="text-gray-300">—</span>
          <span v-else class="inline-flex flex-wrap items-center gap-1.5">
            <el-tooltip
              v-for="(v, i) in row.values"
              :key="i"
              :content="valueTooltip(v)"
              placement="top"
              :disabled="!valueTooltip(v)"
            >
              <span
                :class="[
                  'rounded px-1.5 py-0.5 text-xs',
                  v.value?.trim().startsWith('+')
                    ? 'bg-emerald-50 text-emerald-700'
                    : v.value?.trim().startsWith('-')
                      ? 'bg-rose-50 text-rose-700'
                      : 'bg-gray-100 text-gray-700',
                ]"
                >{{ v.value || '空' }}</span
              >
            </el-tooltip>
          </span>
        </template>

        <template #action="{ row }">
          <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
          <el-button link type="primary" :loading="copyingId === row.id" @click="onSaveAs(row)"
            >复制</el-button
          >
          <el-button link type="danger" @click="onDelete(row)">删除</el-button>
        </template>
      </ProTable>
    </div>

    <ImportItemForm
      ref="formRef"
      :tree-data="treeData"
      :term-code="termCode"
      @success="onSuccess"
    />
    <SyncTermDialog
      ref="syncDialogRef"
      :term-options="termOptions"
      :term-code="termCode"
      @success="onSuccess"
    />
  </div>
</template>

<style lang="scss" scoped></style>
