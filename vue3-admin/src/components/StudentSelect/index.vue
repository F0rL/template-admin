<script setup lang="ts">
/**
 * 学生选择器：左侧年级/班级树 + 学生列表，右侧已选名单。
 * open() 返回 Promise<SelectedStudent[]>，取消/关闭返回 null。
 */
import { ref, computed } from 'vue'
import type { StudentDepTreeNode, StudentListItem } from '@/api/pcStudent'
import { fetchStudentDepTree, fetchStudentList } from '@/api/pcStudent'

export interface SelectedStudent {
  id: number
  name: string
  /** 班级名称（如 五年级4班） */
  className: string
}

const visible = ref(false)
const loadingTree = ref(false)
const loadingStudents = ref(false)
const searchKey = ref('')
/** 年级/班级树 */
const depTree = ref<StudentDepTreeNode[]>([])
/** 当前选中班级节点 */
const currentDep = ref<StudentDepTreeNode | null>(null)
/** 当前班级下的学生列表 */
const students = ref<StudentListItem[]>([])
/** 已选学生 */
const selectedList = ref<SelectedStudent[]>([])
const resolvePromise = ref<((value: SelectedStudent[] | null) => void) | null>(null)

const selectedIds = computed(() => new Set(selectedList.value.map(s => s.id)))

/** 加载年级/班级树 */
async function loadDepTree(): Promise<void> {
  loadingTree.value = true
  try {
    depTree.value = await fetchStudentDepTree()
  } finally {
    loadingTree.value = false
  }
}

/** 点击班级节点：加载该班学生 */
async function handleNodeClick(data: StudentDepTreeNode): Promise<void> {
  // 仅班级节点（有学生挂载的叶子层级）可点
  if (!data.children || data.children.length > 0) return
  currentDep.value = data
  await loadStudents()
}

/** 加载学生列表（按当前班级 + 搜索关键字） */
async function loadStudents(): Promise<void> {
  loadingStudents.value = true
  try {
    const res = await fetchStudentList({
      page: 1,
      rows: 200,
      studentDepId: currentDep.value?.id,
      searchKey: searchKey.value.trim() || undefined,
    })
    students.value = res.list ?? []
  } finally {
    loadingStudents.value = false
  }
}

/** 切换选中状态 */
function toggleSelected(s: StudentListItem): void {
  const item: SelectedStudent = {
    id: s.id,
    name: s.name,
    className: s.studentDepName || currentDep.value?.name || '',
  }
  const idx = selectedList.value.findIndex(x => x.id === s.id)
  if (idx >= 0) {
    selectedList.value.splice(idx, 1)
  } else {
    selectedList.value.push(item)
  }
}

function isSelected(s: StudentListItem): boolean {
  return selectedIds.value.has(s.id)
}

function removeSelected(item: SelectedStudent): void {
  const idx = selectedList.value.findIndex(x => x.id === item.id)
  if (idx >= 0) selectedList.value.splice(idx, 1)
}

/** 打开选择器（多选） */
function open(): Promise<SelectedStudent[] | null> {
  searchKey.value = ''
  currentDep.value = null
  students.value = []
  selectedList.value = []
  visible.value = true
  loadDepTree()

  return new Promise(resolve => {
    resolvePromise.value = resolve
  })
}

function handleClose(): void {
  visible.value = false
  resolvePromise.value?.(null)
  resolvePromise.value = null
}

function handleConfirm(): void {
  visible.value = false
  resolvePromise.value?.(selectedList.value)
  resolvePromise.value = null
}

defineExpose({ open })
</script>

<template>
  <el-dialog
    v-model="visible"
    title="选择学生"
    width="760px"
    align-center
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    @closed="handleClose"
  >
    <div class="flex h-[55vh]">
      <!-- 左侧：班级树 -->
      <div class="border-border-lighter flex w-2/5 shrink-0 flex-col overflow-hidden border-r pr-4">
        <div class="mb-3 shrink-0 text-sm font-semibold">班级</div>
        <div v-loading="loadingTree" class="scroll-thin min-h-0 flex-1 overflow-y-auto">
          <el-tree
            :data="depTree"
            node-key="id"
            :props="{ label: 'name', children: 'children' }"
            default-expand-all
            highlight-current
            :indent="14"
            @node-click="handleNodeClick"
          >
            <template #default="{ data }">
              <span class="flex items-center gap-1 text-sm">
                <IconEpFolder v-if="data.children?.length" class="text-warning text-base" />
                <IconEpUser v-else class="text-primary text-base" />
                <span class="text-text-primary">{{ data.name }}</span>
                <span v-if="data.studentCount" class="text-text-secondary ml-1 text-xs">
                  {{ data.studentCount }}人
                </span>
              </span>
            </template>
          </el-tree>
        </div>
      </div>

      <!-- 中间：学生列表 -->
      <div class="flex min-w-0 flex-1 flex-col overflow-hidden px-4">
        <el-input
          v-model="searchKey"
          placeholder="搜索学生姓名"
          clearable
          size="default"
          class="mb-3"
          @keyup.enter="loadStudents"
          @clear="loadStudents"
        >
          <template #prefix>
            <IconEpSearch class="text-text-secondary" />
          </template>
        </el-input>
        <div v-loading="loadingStudents" class="scroll-thin min-h-0 flex-1 overflow-y-auto">
          <template v-if="currentDep">
            <div
              v-for="s in students"
              :key="s.id"
              class="hover:bg-fill-light mb-0.5 flex cursor-pointer items-center justify-between rounded-md px-2.5 py-2 transition-colors"
              :class="isSelected(s) ? 'bg-primary-light-9' : ''"
              @click="toggleSelected(s)"
            >
              <span class="text-text-primary text-sm">{{ s.name }}</span>
              <IconEpCheck v-if="isSelected(s)" class="text-primary text-base" />
            </div>
            <div v-if="!students.length" class="text-text-placeholder py-8 text-center text-[13px]">
              {{ searchKey ? '未找到匹配学生' : '该班级暂无学生' }}
            </div>
          </template>
          <div v-else class="text-text-placeholder py-8 text-center text-[13px]">
            请先在左侧选择班级
          </div>
        </div>
      </div>

      <!-- 右侧：已选名单 -->
      <div class="flex w-[240px] shrink-0 flex-col overflow-hidden border-l border-border-lighter pl-4">
        <div class="mb-3 flex shrink-0 items-center gap-1.5 text-sm font-semibold">
          已选择
          <span
            v-if="selectedList.length"
            class="bg-primary inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1.5 text-[11px] leading-none font-medium text-white"
          >
            {{ selectedList.length }}
          </span>
        </div>
        <ul class="scroll-thin m-0 flex-1 list-none overflow-y-auto p-0">
          <li
            v-for="item in selectedList"
            :key="item.id"
            class="hover:bg-fill-light mb-0.5 flex items-center justify-between rounded-md px-2.5 py-2 transition-colors"
          >
            <div class="flex min-w-0 flex-1 items-center gap-1.5">
              <span class="text-text-primary truncate text-sm">{{ item.name }}</span>
              <span class="bg-primary-light-9 text-primary shrink-0 rounded px-1.5 py-0.5 text-[11px]">
                {{ item.className || '未分班' }}
              </span>
            </div>
            <IconEpClose
              class="text-text-placeholder hover:bg-danger-light-9 hover:text-danger shrink-0 cursor-pointer rounded p-0.5 text-sm transition-colors"
              @click="removeSelected(item)"
            />
          </li>
          <li v-if="!selectedList.length" class="text-text-placeholder py-8 text-center text-[13px]">
            暂无选择
          </li>
        </ul>
      </div>
    </div>
    <template #footer>
      <div class="flex justify-end gap-3">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" :disabled="!selectedList.length" @click="handleConfirm">
          确定
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
:deep(.el-tree) {
  background: transparent;

  .el-tree-node__content {
    height: 34px;
    border-radius: 6px;
    margin: 1px 0;
    padding-right: 8px;
  }
}
</style>
