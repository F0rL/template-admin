<script setup lang="ts">
/**
 * 追"锋"时刻 — PC 管理端（对齐移动端教师端 feed）
 *
 * 数据源：PcMedal/GetList（a_medal_order，与移动端教师端同源）
 * **一次提交 = 一条记录**：一条记录含多个学生（studentNames）+ 多个奖章（medals）。
 * 管理员可查看全部动态并删除（不做「仅作者可删」限制）。
 *
 * 筛选联动：班级 / 时间 → 直接进入查询参数；关键字 → 点击「查询」或回车提交。
 */
import { ref, computed, watch } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { ElMessageBox } from 'element-plus'
import ProTable from '@/components/ProTable/index.vue'
import type { ProTableColumn } from '@/components/ProTable/index.vue'
import ClassOrDeptSelect from '@/components/ClassOrDeptSelect/index.vue'
import MedalOrderDetail from './MedalOrderDetail.vue'
import {
  pcMedalKeys,
  fetchPcMedalOrders,
  deletePcMedalOrders,
  type PcMedalOrderListItem,
} from '@/api/pcMedal'
import { message, withLoading } from '@/utils/feedback'

defineOptions({ name: 'Evaluation' })
const queryClient = useQueryClient()

// ─── 筛选 ───
const depId = ref<string | undefined>(undefined)
const timeStr = ref<string>('')
const searchKey = ref('')
/** 已提交的关键字（点击查询 / 回车后生效） */
const submittedSearchKey = ref('')

// ─── 分页 ───
const page = ref(1)
const size = ref(10)

const queryParams = computed(() => ({
  page: page.value,
  rows: size.value,
  depId: depId.value,
  timeStr: timeStr.value || undefined,
  searchKey: submittedSearchKey.value || undefined,
}))

const { data, isFetching } = useQuery({
  queryKey: computed(() => pcMedalKeys.list(queryParams.value)),
  queryFn: ({ signal }) => fetchPcMedalOrders(queryParams.value, signal),
  placeholderData: prev => prev,
})

const rows = computed<PcMedalOrderListItem[]>(() => data.value?.list ?? [])
const total = computed(() => data.value?.total ?? 0)

// 切换班级 / 时间时回到第一页
watch([depId, timeStr], () => {
  page.value = 1
})

const columns: ProTableColumn<PcMedalOrderListItem>[] = [
  { prop: 'teacherName', label: '评价人', width: 110 },
  { label: '学生', slot: 'students', minWidth: 180 },
  { label: '来源', slot: 'source', width: 150 },
  { label: '奖章', slot: 'medals', minWidth: 220 },
  { prop: 'content', label: '内容', minWidth: 180, showOverflowTooltip: true },
  { prop: 'createTime', label: '时间', width: 140, align: 'center' },
  { label: '互动', slot: 'interact', width: 170, align: 'center' },
  { label: '操作', width: 110, fixed: 'right', slot: 'action' },
]

// ─── 删除 ───
const deleteMut = useMutation({ mutationFn: (d: { ids: number[] }) => deletePcMedalOrders(d) })
async function handleDelete(row: PcMedalOrderListItem) {
  await ElMessageBox.confirm(
    `确认删除「${row.teacherName}老师」于 ${row.createTime} 发布的这条动态？`,
    '删除确认',
    { type: 'warning' },
  )
  await withLoading(deleteMut.mutateAsync({ ids: [row.id] }), '删除中...')
  message.success('已删除')
  await queryClient.invalidateQueries({ queryKey: pcMedalKeys.all })
}

// ─── 详情 ───
const detailVisible = ref(false)
const detailRow = ref<PcMedalOrderListItem | null>(null)
function openDetail(row: PcMedalOrderListItem) {
  detailRow.value = row
  detailVisible.value = true
}

// ─── 查询 / 重置 ───
function handleSearch() {
  submittedSearchKey.value = searchKey.value.trim()
  page.value = 1
}
function handleReset() {
  searchKey.value = ''
  depId.value = undefined
  timeStr.value = ''
  submittedSearchKey.value = ''
  page.value = 1
}

// ─── 奖章配色（与移动端 MEDALS 一致） ───
const MEDAL_COLOR: Record<string, string> = {
  阳光少年章: '#faad14',
  智慧少年章: '#722ed1',
  自律少年章: '#52c41a',
  爱心少年章: '#f48583',
  责任少年章: '#2b85e4',
}
const MEDAL_EMOJI: Record<string, string> = {
  阳光少年章: '☀️',
  智慧少年章: '💡',
  自律少年章: '⏰',
  爱心少年章: '❤️',
  责任少年章: '🌱',
}
function medalColor(name: string) {
  return MEDAL_COLOR[name] || '#2b85e4'
}
function medalEmoji(name: string) {
  return MEDAL_EMOJI[name] || '🏅'
}
</script>

<template>
  <div class="flex h-page flex-col">
    <div class="panel-card mb-4 shrink-0">
      <el-form class="g-filter-form" label-width="80px" @submit.prevent="handleSearch">
        <el-row :gutter="16" class="gap-y-4">
          <el-col :span="6">
            <el-form-item label="关键字">
              <el-input
                v-model="searchKey"
                placeholder="学生 / 教师 / 内容"
                clearable
                @keyup.enter="handleSearch"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="班级">
              <ClassOrDeptSelect v-model="depId" placeholder="选择班级" class="!w-full" />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="时间">
              <el-date-picker
                v-model="timeStr"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="选择日期"
                clearable
                class="!w-full"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item>
              <div class="flex w-full justify-end">
                <el-button type="primary" @click="handleSearch">
                  <template #icon><IconEpSearch /></template>查询
                </el-button>
                <el-button @click="handleReset">
                  <template #icon><IconEpRefresh /></template>重置
                </el-button>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </div>

    <div class="panel-card flex min-h-0 flex-1 flex-col">
      <div class="mb-4 flex shrink-0 items-center justify-between">
        <span class="text-sm text-gray-500">
          共 <b class="text-gray-700">{{ total }}</b> 条动态（一次提交 = 一条记录）
        </span>
      </div>

      <ProTable
        auto-height
        v-model:current-page="page"
        v-model:page-size="size"
        :columns="columns"
        :data="rows"
        :loading="isFetching"
        :total="total"
        paginated
      >
        <template #students="{ row }">
          <div class="flex flex-wrap gap-1">
            <el-tag
              v-for="name in row.studentNames"
              :key="name"
              type="info"
              size="small"
              effect="plain"
            >
              {{ name }}
            </el-tag>
            <span v-if="!row.studentNames?.length" class="text-gray-300">—</span>
          </div>
        </template>

        <!-- 来源：班级全称优先（如「五年级4班(测试)」），好公民无班级 → 落回 depName「大队部」 -->
        <template #source="{ row }">
          <span class="text-gray-600">
            {{ row.depFullName || row.depName || '—' }}
          </span>
        </template>

        <template #medals="{ row }">
          <div class="flex flex-wrap items-center gap-1">
            <span
              v-for="m in row.medals"
              :key="m.medalName"
              class="rounded px-1.5 py-0.5 text-xs"
              :style="{
                color: medalColor(m.medalName),
                background: medalColor(m.medalName) + '22',
              }"
            >
              {{ medalEmoji(m.medalName) }} {{ m.medalName }} ×{{ m.num }}
            </span>
            <span v-if="!row.medals?.length" class="text-gray-300">—</span>
            <span v-else class="ml-1 text-xs text-gray-400">共 {{ row.medalTotal }} 枚</span>
          </div>
        </template>

        <template #interact="{ row }">
          <span class="text-xs text-gray-500">
            👍 {{ row.likeCount }} · 💬 {{ row.commentCount }} · 👀
            {{ row.lookNum }}/{{ row.studentTotal }}
          </span>
        </template>

        <template #action="{ row }">
          <el-button type="primary" link @click="openDetail(row)">查看</el-button>
          <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
        </template>
      </ProTable>
    </div>

    <MedalOrderDetail v-if="detailRow" v-model:visible="detailVisible" :row="detailRow" />
  </div>
</template>
