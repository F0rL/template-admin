<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import ProTable from '@/components/ProTable/index.vue'
import type { ProTableColumn } from '@/components/ProTable/index.vue'
import type { EvalMode } from '@/api/pcPatrol'
import type { PatrolCategory, PatrolItem, PatrolLocation } from '@/api/pcPatrol'
import { pcPatrolKeys } from '@/api/pcPatrol'
import * as pcPatrolApi from '@/api/pcPatrol'
import CategoryForm from './components/CategoryForm.vue'
import ItemForm from './components/ItemForm.vue'
import LocationForm from './components/LocationForm.vue'
import PatrolGuide from './components/PatrolGuide.vue'
import PresetRemarkForm from './components/PresetRemarkForm.vue'

defineOptions({ name: 'PatrolConfig' })

const queryClient = useQueryClient()

const categoryFormRef = useTemplateRef('categoryFormRef')
const itemFormRef = useTemplateRef('itemFormRef')
const locationFormRef = useTemplateRef('locationFormRef')
const presetRemarkRef = useTemplateRef('presetRemarkRef')
const proTableRef = useTemplateRef('proTableRef')

const { data: treeData, isFetching: loading } = useQuery({
  queryKey: pcPatrolKeys.categoryTree(),
  queryFn: ({ signal }) => pcPatrolApi.fetchCategoryTree(signal),
})

const sortedCategories = computed<PatrolCategory[]>(() => {
  const list = [...(treeData.value ?? [])]
  return list.sort((a, b) => a.sortNo - b.sortNo)
})

const EVAL_MODE_MAP: Record<EvalMode, { label: string; type: 'primary' | 'success' | 'warning' }> =
  {
    1: { label: '按班级评价', type: 'primary' },
    2: { label: '按教师执勤评价', type: 'success' },
    3: { label: '文本记录', type: 'warning' },
  }

interface TreeNode {
  rowKey: string
  type: 'category' | 'item' | 'location'
  category?: PatrolCategory
  item?: PatrolItem
  location?: PatrolLocation
  children?: TreeNode[]
}

function isDutyCategory(cat?: PatrolCategory) {
  return cat?.code === 'duty'
}

/** 构建树：教师执勤分类为两级（分类 → 执勤点位，去时段），其余分类为三级（分类 → 巡查项） */
const treeData2 = computed<TreeNode[]>(() => {
  return sortedCategories.value.map(cat => {
    const duty = isDutyCategory(cat)
    if (duty) {
      const locs = (cat.locations ?? []).slice().sort((a, b) => a.sortNo - b.sortNo)
      return {
        rowKey: `cat-${cat.id}`,
        type: 'category' as const,
        category: cat,
        children: locs.map(loc => ({
          rowKey: `loc-${loc.id}`,
          type: 'location' as const,
          location: loc,
          category: cat,
        })),
      }
    }
    const items = (cat.items ?? []).slice().sort((a, b) => a.sortNo - b.sortNo)
    return {
      rowKey: `cat-${cat.id}`,
      type: 'category' as const,
      category: cat,
      children: items.map(item => ({
        rowKey: `item-${item.id}`,
        type: 'item' as const,
        item,
        category: cat,
        children: [],
      })),
    }
  })
})

const columns: ProTableColumn<TreeNode>[] = [
  { label: '名称', minWidth: 120, slot: 'name' },
  { label: '编码/时间', width: 150, slot: 'code' },
  { label: '评价模式', width: 130, slot: 'mode' },
  { label: '巡查角色', width: 80, align: 'center', slot: 'role' },
  { label: '积分规则', width: 120, slot: 'score' },
  { label: '状态', width: 70, align: 'center', slot: 'status' },
  { label: '操作', width: 220, fixed: 'right', slot: 'action' },
]

/** 递归展开/折叠全部行 */
function toggleRows(nodes: TreeNode[], expanded: boolean) {
  nodes.forEach(node => {
    proTableRef.value?.elTableRef?.toggleRowExpansion(node, expanded)
    if (node.children?.length) toggleRows(node.children, expanded)
  })
}

function handleExpandAll() {
  toggleRows(treeData2.value, true)
}

function handleCollapseAll() {
  toggleRows(treeData2.value, false)
}

/** 切换启用/停用状态 */
function handleToggleEnabled(type: 'category' | 'item' | 'location', id: string, enabled: boolean) {
  if (type === 'category') categoryFormRef.value?.toggle(id, enabled)
  else if (type === 'item') itemFormRef.value?.toggle(id, enabled)
  else locationFormRef.value?.toggle(id, enabled)
}

function toggleLoading(type: 'category' | 'item' | 'location') {
  if (type === 'category') return categoryFormRef.value?.isToggling() ?? false
  if (type === 'item') return itemFormRef.value?.isToggling() ?? false
  return locationFormRef.value?.isToggling() ?? false
}

/** 子组件操作成功后刷新分类树 */
function handleSuccess() {
  queryClient.invalidateQueries({ queryKey: pcPatrolKeys.categoryTree() })
}
</script>

<template>
  <div class="flex h-page flex-col">
    <!-- 工具栏 + 树形表格 -->
    <div class="panel-card flex min-h-0 flex-1 flex-col">
      <div class="mb-4 flex shrink-0 items-center">
        <el-button @click="categoryFormRef?.open(undefined, sortedCategories)">
          <template #icon><IconEpPlus /></template>
          新增分类
        </el-button>
        <el-button @click="handleExpandAll">
          <template #icon><IconRiExpandVerticalLine /></template>
          展开全部
        </el-button>
        <el-button @click="handleCollapseAll">
          <template #icon><IconRiCollapseVerticalLine /></template>
          收起全部
        </el-button>
        <el-button type="primary" plain @click="presetRemarkRef?.open()">
          <template #icon><IconEpChatDotRound /></template>
          预设意见管理
        </el-button>
        <PatrolGuide class="ml-auto" />
      </div>

      <ProTable
        auto-height
        ref="proTableRef"
        :columns="columns"
        :data="treeData2"
        :loading="loading"
        row-key="rowKey"
        default-expand-all
        :tree-props="{ children: 'children' }"
      >
        <template #name="{ row }">
          <span :class="{ 'font-semibold': row.type === 'category' }">
            {{
              row.type === 'category'
                ? row.category?.name
                : row.type === 'item'
                  ? row.item?.name
                  : row.location?.name
            }}
          </span>
          <span v-if="row.type === 'category' && !isDutyCategory(row.category)" class="text-xs text-gray-400">
            （{{ row.category?.items?.length ?? 0 }} 项）
          </span>
          <span v-if="row.type === 'category' && isDutyCategory(row.category)" class="text-xs text-gray-400">
            （{{ row.category?.locations?.length ?? 0 }} 点位）
          </span>
        </template>
        <template #code="{ row }">
          <el-tag v-if="row.type === 'category'" size="small" type="info" effect="plain">
            {{ row.category?.code }}
          </el-tag>
          <el-tag v-else-if="row.type === 'item'" size="small" type="primary" effect="plain">
            {{ row.item?.startTime }}-{{ row.item?.endTime }}
          </el-tag>
          <el-tag
            v-else-if="row.type === 'location' && row.location?.shortName"
            size="small"
            type="warning"
            effect="plain"
          >
            {{ row.location.shortName }}
          </el-tag>
          <span v-else class="text-gray-300">—</span>
        </template>

        <template #mode="{ row }">
          <el-tag
            v-if="row.type === 'category'"
            :type="EVAL_MODE_MAP[row.category?.evalMode ?? 1]?.type ?? 'info'"
            size="small"
          >
            {{ EVAL_MODE_MAP[row.category?.evalMode ?? 1]?.label ?? '—' }}
          </el-tag>
          <span v-else-if="row.type === 'item'" class="text-xs text-gray-400">
            归属：{{ row.category?.name }}
          </span>
          <span v-else-if="row.type === 'location'" class="text-xs text-gray-400">
            <template v-if="row.location?.defaultTeacherName">
              默认教师：<span class="font-medium text-[#2b85e4]">{{ row.location.defaultTeacherName }}</span>
              <span v-if="(row.location?.overrides?.length ?? 0) > 0" class="ml-1 text-[#faad14]">
                （{{ row.location?.overrides?.length }} 个日期例外）
              </span>
            </template>
            <template v-else>未设默认教师</template>
          </span>
        </template>

        <template #role="{ row }">
          <el-tag
            v-if="row.type === 'category'"
            :type="row.category?.role === 2 ? 'warning' : 'primary'"
            size="small"
            effect="plain"
          >
            {{ row.category?.role === 2 ? '学生' : '教师' }}
          </el-tag>
          <el-tag
            v-else-if="row.type === 'item'"
            :type="row.item?.role === 2 ? 'warning' : 'primary'"
            size="small"
            effect="plain"
          >
            {{ row.item?.role === 2 ? '学生' : '教师' }}
          </el-tag>
          <span v-else class="text-gray-300">—</span>
        </template>

        <template #score="{ row }">
          <template v-if="row.type === 'category'">
            <span
              v-if="row.category?.evalMode === 3 || row.category?.scoreTarget === 2"
              class="text-gray-400"
            >
              不积分
            </span>
            <span v-else>
              <span class="font-semibold text-green-600">+{{ row.category?.scoreGood ?? 0 }}</span>
              /
              <span class="font-semibold" style="color: #faad14">+{{ row.category?.scoreMid ?? 1 }}</span>
              /
              <span class="font-semibold text-red-500">{{ row.category?.scoreBad ?? 0 }}</span>
              <span class="ml-1 text-xs text-gray-400">→ 年级组</span>
            </span>
          </template>
          <span v-else-if="row.type === 'item'" class="text-xs text-gray-400">
            序号 {{ row.item?.sortNo }}
          </span>
          <span v-else-if="row.type === 'location'" class="text-xs text-gray-400">
            序号 {{ row.location?.sortNo }}
          </span>
        </template>

        <template #status="{ row }">
          <el-switch
            :model-value="(row.category ?? row.item ?? row.location)?.enabled !== false"
            :loading="toggleLoading(row.type)"
            @change="
              (val: boolean) =>
                handleToggleEnabled(row.type, (row.category ?? row.item ?? row.location)!.id, val)
            "
          />
        </template>

        <template #action="{ row }">
          <!-- 分类操作 -->
          <template v-if="row.type === 'category'">
            <el-button
              type="primary"
              link
              @click="categoryFormRef?.open(row.category!, sortedCategories)"
            >
              编辑
            </el-button>
            <el-button
              v-if="isDutyCategory(row.category)"
              type="primary"
              link
              @click="locationFormRef?.open(null, row.category!)"
            >
              添加点位
            </el-button>
            <el-button
              v-else
              type="primary"
              link
              @click="itemFormRef?.open(null, sortedCategories, row.category!.id)"
            >
              添加巡查项
            </el-button>
            <el-button type="danger" link @click="categoryFormRef?.remove(row.category!)">
              删除
            </el-button>
          </template>

          <!-- 巡查项操作（仅非教师执勤分类） -->
          <template v-else-if="row.type === 'item'">
            <el-button type="primary" link @click="itemFormRef?.open(row.item!, sortedCategories)">
              编辑
            </el-button>
            <el-button
              v-if="row.category?.evalMode === 1"
              type="primary"
              plain
              link
              @click="presetRemarkRef?.open(row.item!.id)"
            >
              预设意见
            </el-button>
            <el-button type="danger" link @click="itemFormRef?.remove(row.item!, row.category!)">
              删除
            </el-button>
          </template>

          <!-- 点位操作（教师执勤分类下直挂分类） -->
          <template v-else>
            <el-button
              type="primary"
              link
              @click="locationFormRef?.open(row.location!, row.category!)"
            >
              编辑
            </el-button>
            <el-button
              type="danger"
              link
              @click="locationFormRef?.remove(row.location!, row.category!)"
            >
              删除
            </el-button>
          </template>
        </template>
      </ProTable>
    </div>
    <CategoryForm ref="categoryFormRef" @success="handleSuccess" />
    <ItemForm ref="itemFormRef" @success="handleSuccess" />
    <LocationForm ref="locationFormRef" @success="handleSuccess" />
    <PresetRemarkForm ref="presetRemarkRef" @success="handleSuccess" />
  </div>
</template>

<style lang="scss" scoped></style>
