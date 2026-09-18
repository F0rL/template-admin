<script setup lang="ts">
import { ref, computed, onMounted, watch, useTemplateRef } from 'vue'
import { message, confirm, alert } from '@/utils/feedback'
import ProTable from '@/components/ProTable/index.vue'
import type { ProTableColumn } from '@/components/ProTable/index.vue'
import {
  fetchAwardList,
  deleteAwards,
  importAwards,
  type AwardListItem,
} from '@/api/pcAward'
import { downloadBlob, resolveFileUrl } from '@/utils/file'
import {
  CATEGORY_OPTIONS,
  AWARD_LEVEL_OPTIONS,
  subCategoryOptionsFor,
} from './dict'
import AwardForm from './components/AwardForm.vue'
import AwardSyncDialog from './components/AwardSyncDialog.vue'

// ==================== State ====================

const loading = ref(false)
const list = ref<AwardListItem[]>([])
const total = ref(0)
const pageIndex = ref(1)
const pageSize = ref(10)

// 当前 tab：1学生 2教师 3学校（不再有“全部”）
const activeCategory = ref<number>(1)

// 筛选条件
const subCategoryFilter = ref<number | undefined>(undefined)
const awardLevelFilter = ref('')
const startAwardTime = ref('')
const endAwardTime = ref('')
const searchKey = ref('')

const formRef = useTemplateRef('formRef')
const syncRef = useTemplateRef('syncRef')
const fileInput = useTemplateRef('fileInput')
const importing = ref(false)

// ==================== 表格列 ====================

const columns = computed<ProTableColumn<AwardListItem>[]>(() => {
  const base: ProTableColumn<AwardListItem>[] = [
    { type: 'index', label: '序号', width: 60, align: 'center' },
    { label: '获奖者', minWidth: 130, slot: 'winner' },
    { prop: 'awardName', label: '获奖名称', minWidth: 180 },
    // 页签已按大类拆分，分类列只展示小类（荣誉类/竞赛类/辅导类）
    { label: '分类', width: 90, slot: 'category' },
    { prop: 'awardLevel', label: '获奖级别', width: 85 },
    { prop: 'awardGrade', label: '奖次', width: 80 },
    { prop: 'awardTime', label: '获奖时间', width: 90 },
    { prop: 'awardUnit', label: '颁奖单位', minWidth: 150 },
    { label: '附件', width: 80, slot: 'attachment' },
  ]
  // 学生奖证展示素养评价同步状态（含同步入口按钮）
  if (activeCategory.value === 1) {
    base.push({ label: '好公民同步', width: 110, slot: 'sync' })
  }
  base.push(
    { prop: 'createTime', label: '登记时间', width: 165 },
    { label: '操作', width: 110, fixed: 'right', slot: 'action' },
  )
  return base
})

// ==================== 筛选联动 ====================

/** 当前大类下可选的获奖分类（筛选下拉，教师竞赛类带论文、赛课后缀） */
const subCategoryFilterOptions = computed(() => subCategoryOptionsFor(activeCategory.value))

function onTabChange() {
  const allowed = subCategoryFilterOptions.value.map(o => o.value)
  if (subCategoryFilter.value != null && !allowed.includes(subCategoryFilter.value)) {
    subCategoryFilter.value = undefined
  }
  pageIndex.value = 1
  reload()
}

// ==================== 加载 ====================

/** 将筛选框的 yyyy-MM 转为后端一致的 yyyyMM（与导入/导出格式对齐） */
function ymToCompact(s: string): string | undefined {
  if (!s) return undefined
  const [y, m] = s.split('-')
  return y && m ? `${y}${m}` : undefined
}

async function reload() {
  loading.value = true
  try {
    const res = await fetchAwardList({
      page: pageIndex.value,
      rows: pageSize.value,
      category: activeCategory.value,
      subCategory: subCategoryFilter.value,
      awardLevel: awardLevelFilter.value || undefined,
      startAwardTime: ymToCompact(startAwardTime.value),
      endAwardTime: ymToCompact(endAwardTime.value),
      searchKey: searchKey.value.trim() || undefined,
    })
    list.value = res.list ?? []
    total.value = res.total ?? 0
  } finally {
    loading.value = false
  }
}

onMounted(() => reload())

watch([pageIndex, pageSize], () => reload())

// ==================== 搜索 / 重置 ====================

function handleSearch() {
  pageIndex.value = 1
  reload()
}

function handleReset() {
  subCategoryFilter.value = undefined
  awardLevelFilter.value = ''
  startAwardTime.value = ''
  endAwardTime.value = ''
  searchKey.value = ''
  pageIndex.value = 1
  reload()
}

// ==================== 增删改 ====================

function handleCreate() {
  formRef.value?.open(undefined, activeCategory.value)
}

function handleEdit(row: AwardListItem) {
  formRef.value?.open(row)
}

async function onDelete(row: AwardListItem) {
  const ok = await confirm(`确认删除「${row.winnerName}」的获奖记录「${row.awardName}」？`, '提示', {
    type: 'warning',
  })
  if (!ok) return
  await deleteAwards([row.id])
  message.success('已删除')
  reload()
}

/** 手动同步：打开弹窗选择五育/积分后同步到素养评价好公民 */
function onSync(row: AwardListItem) {
  syncRef.value?.open(row)
}

function onSuccess() {
  reload()
}

// ==================== 导入 / 导出 / 模板 ====================

/** 触发文件选择框 */
function handlePickFile() {
  fileInput.value?.click()
}

/** 当前 tab 大类名称（用于导出/模板文件名） */
function activeCategoryName(): string {
  return CATEGORY_OPTIONS.find(o => o.value === activeCategory.value)?.label ?? ''
}

/** 选择文件后执行导入（按当前 tab 大类校验行数据） */
async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!/\.xlsx$/i.test(file.name)) {
    message.error('仅支持 .xlsx 格式文件（旧版 .xls 请另存为 .xlsx）')
    input.value = ''
    return
  }
  importing.value = true
  try {
    const res = await importAwards(file, activeCategory.value)
    if (res.fail > 0) {
      // 失败明细逐行展示（HTML 列表 + 最多展示前 10 条，避免弹窗过长）
      const shown = res.errors.slice(0, 10)
      const hidden = res.errors.length - shown.length
      const lines = shown
        .map(e => `<div style="line-height:1.9;">${escapeHtml(e)}</div>`)
        .join('')
      const footer = hidden > 0 ? `<div style="margin-top:6px;color:#909399;">……等共 ${res.errors.length} 条失败</div>` : ''
      await alert(
        `<div style="max-height:320px;overflow:auto;">${lines}${footer}</div>`,
        `导入完成：成功 ${res.success} 条，失败 ${res.fail} 条`,
        {
          type: 'warning',
          dangerouslyUseHTMLString: true,
          // 有异常时弹窗必须手动关闭，不自动消失，便于完整查看错误明细
          closeOnClickModal: false,
          closeOnPressEscape: false,
          showClose: true,
          confirmButtonText: '知道了',
        },
      )
    } else {
      message.success(`成功导入 ${res.success} 条获奖记录`)
    }
    reload()
  } finally {
    importing.value = false
    input.value = ''
  }
}

/** HTML 转义，防止导入错误信息中的特殊字符破坏弹窗结构 */
function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/** 按当前筛选条件导出全部记录（文件名带当前 tab 大类） */
async function handleExport() {
  await downloadBlob(
    '/PcAward/Export',
    `奖证库_${activeCategoryName()}_${new Date().toISOString().slice(0, 10)}.xlsx`,
    {
      category: activeCategory.value,
      subCategory: subCategoryFilter.value,
      awardLevel: awardLevelFilter.value || undefined,
      startAwardTime: ymToCompact(startAwardTime.value),
      endAwardTime: ymToCompact(endAwardTime.value),
      searchKey: searchKey.value.trim() || undefined,
    },
  )
}

/** 下载导入模板（按当前 tab 大类生成对应示例） */
async function handleDownloadTemplate() {
  await downloadBlob(
    '/PcAward/DownloadTemplate',
    `奖证库导入模板_${activeCategoryName()}.xlsx`,
    { category: activeCategory.value },
  )
}

// ==================== 同步状态展示 ====================

/** 好公民同步状态文字（带颜色） */
function syncStatusText(status: number): string {
  if (status === 1) return '已同步'
  if (status === 2) return '同步失败'
  return '未同步'
}

function syncStatusClass(status: number): string {
  if (status === 1) return 'text-green-600'
  if (status === 2) return 'text-red-500'
  return 'text-gray-500'
}

/** 附件预览地址（相对路径走文件服务） */
function attachmentUrl(path: string): string {
  return resolveFileUrl(path)
}
</script>

<template>
  <div class="panel-card flex h-page flex-col">
    <!-- Tab：学生 / 教师 / 学校 -->
    <el-tabs v-model="activeCategory" class="award-tabs shrink-0" @tab-change="onTabChange">
      <el-tab-pane
        v-for="c in CATEGORY_OPTIONS"
        :key="c.value"
        :label="c.label"
        :name="c.value"
      />
    </el-tabs>

    <!-- 筛选区（与 tabs 同卡片，紧凑排列） -->
    <div class="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2">
      <el-select
        v-model="subCategoryFilter"
        placeholder="获奖分类"
        clearable
        class="!w-32"
        @change="handleSearch"
      >
        <el-option
          v-for="s in subCategoryFilterOptions"
          :key="s.value"
          :label="s.label"
          :value="s.value"
        />
      </el-select>

      <el-select
        v-model="awardLevelFilter"
        placeholder="获奖级别"
        clearable
        filterable
        allow-create
        class="!w-32"
        @change="handleSearch"
      >
        <el-option v-for="l in AWARD_LEVEL_OPTIONS" :key="l" :label="l" :value="l" />
      </el-select>

      <span class="text-gray-400">获奖时间</span>
      <el-date-picker
        v-model="startAwardTime"
        type="month"
        value-format="YYYY-MM"
        placeholder="开始月份"
        clearable
        class="!w-32"
        @change="handleSearch"
      />
      <span class="text-gray-400">至</span>
      <el-date-picker
        v-model="endAwardTime"
        type="month"
        value-format="YYYY-MM"
        placeholder="结束月份"
        clearable
        class="!w-32"
        @change="handleSearch"
      />

      <el-input
        v-model="searchKey"
        class="!w-60"
        placeholder="搜索获奖者 / 获奖名称 / 颁奖单位"
        clearable
        @keyup.enter="handleSearch"
      />
      <el-button type="primary" @click="handleSearch">
        <template #icon><IconEpSearch /></template>查询
      </el-button>
      <el-button @click="handleReset">
        <template #icon><IconEpRefresh /></template>重置
      </el-button>
    </div>

    <!-- 操作按钮：单独一行，不与查询条件混排 -->
    <div class="mt-3 flex shrink-0 flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
      <el-button type="primary" @click="handleCreate">
        <template #icon><IconEpPlus /></template>新增获奖
      </el-button>
      <el-button type="success" :loading="importing" @click="handlePickFile">
        <template #icon><IconEpUpload /></template>导入
      </el-button>
      <el-button @click="handleDownloadTemplate">
        <template #icon><IconEpDownload /></template>下载模板
      </el-button>
      <el-button @click="handleExport">
        <template #icon><IconEpDownload /></template>导出
      </el-button>
      <input
        ref="fileInput"
        type="file"
        accept=".xlsx"
        class="hidden"
        @change="onFileChange"
      />
    </div>

    <!-- 表格区 -->
    <div class="mt-4 flex min-h-0 flex-1 flex-col">
      <ProTable
        auto-height
        v-model:current-page="pageIndex"
        v-model:page-size="pageSize"
        :columns="columns"
        :data="list"
        :loading="loading"
        :total="total"
        paginated
      >
        <template #category="{ row }">
          <span class="text-(--el-text-color-primary)">{{ row.subCategoryName }}</span>
        </template>

        <template #winner="{ row }">
          <span class="text-(--el-text-color-primary)">{{ row.winnerName }}</span>
          <span v-if="row.winnerClass" class="ml-1 text-xs text-gray-400">
            （{{ row.winnerClass }}）
          </span>
        </template>

        <template #attachment="{ row }">
          <el-image
            v-if="row.attachmentPath"
            :src="attachmentUrl(row.attachmentPath)"
            :preview-src-list="[attachmentUrl(row.attachmentPath)]"
            preview-teleported
            fit="cover"
            class="h-9 w-9 cursor-pointer rounded border border-gray-200"
          />
          <span v-else class="text-xs text-gray-300">—</span>
        </template>

        <template #sync="{ row }">
          <el-tooltip
            :disabled="row.syncStatus !== 2"
            :content="row.syncFailReason || ''"
            placement="top"
          >
            <div>
              <!-- 同步状态：文字样式 -->
              <span class="text-sm font-medium" :class="syncStatusClass(row.syncStatus)">
                {{ syncStatusText(row.syncStatus) }}
              </span>
              <!-- 同步入口：按钮样式（未同步/失败才可点击） -->
              <div v-if="row.syncStatus !== 1" class="mt-0.5">
                <el-button type="primary" size="small" plain @click="onSync(row)">
                  同步
                </el-button>
              </div>
            </div>
          </el-tooltip>
        </template>

        <template #action="{ row }">
          <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="onDelete(row)">删除</el-button>
        </template>
      </ProTable>
    </div>
  </div>

  <AwardForm ref="formRef" @success="onSuccess" />
  <AwardSyncDialog ref="syncRef" @success="onSuccess" />
</template>

<style lang="scss" scoped>
/* tabs 收紧：去掉多余上下留白，底部分隔线更轻 */
.award-tabs :deep(.el-tabs__header) {
  margin-bottom: 12px;
}
.award-tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
  background-color: #f0f2f5;
}
</style>
