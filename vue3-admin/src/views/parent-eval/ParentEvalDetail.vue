<script setup lang="ts">
/**
 * 家长评价详情抽屉 — 对接 PcEval.GetParentEvalDetail
 *
 * 评分明细优先用后端 `ratings`（已把 key 解析为评价项名称，来自「积分规则配置」的好孩子配置）；
 * 仅当后端未返回时才回退解析 `ratingsJson`（历史数据 key 为 housework 等内置维度）。
 */
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { pcEvalKeys, fetchParentEvalDetail, type ParentEvalItem } from '@/api/pcEval'

const props = defineProps<{ visible: boolean; row: ParentEvalItem }>()
const emit = defineEmits<{ 'update:visible': [v: boolean] }>()

const drawerVisible = computed({
  get: () => props.visible,
  set: v => emit('update:visible', v),
})

const { data: detail, isFetching } = useQuery({
  queryKey: computed(() => pcEvalKeys.parentDetail({ id: props.row.id })),
  queryFn: ({ signal }) => fetchParentEvalDetail({ id: props.row.id }, signal),
  enabled: () => props.visible,
})

const d = computed(() => ({ ...props.row, ...(detail.value ?? {}) }))

/** 内置维度 key → 中文名（历史记录兜底） */
const LEGACY_NAME: Record<string, string> = {
  housework: '参与家务',
  selfmgmt: '自我管理',
  sport: '体育锻炼',
  reading: '阅读打卡',
  filial: '孝亲睦邻',
  community: '社区服务',
  parenting: '亲子活动',
}

interface RatingRow {
  key: string
  name: string
  star: number
  starMax: number
  wuyuName: string
}

/** 评分明细：优先后端解析结果，其次回退解析 ratingsJson */
const ratingRows = computed<RatingRow[]>(() => {
  const list = d.value.ratings
  if (list?.length) {
    return list.map(r => ({
      key: r.key,
      name: r.name || LEGACY_NAME[r.key] || r.key,
      star: r.star,
      starMax: r.starMax || 3,
      wuyuName: r.wuyuName || '',
    }))
  }

  const json = d.value.ratingsJson
  if (!json) return []
  try {
    const obj = JSON.parse(json) as Record<string, number>
    return Object.entries(obj).map(([key, star]) => ({
      key,
      name: LEGACY_NAME[key] || key,
      star: Number(star) || 0,
      starMax: 3,
      wuyuName: '',
    }))
  } catch {
    return []
  }
})

/** 星级上限合计（量表满分），无数据时为 0 */
const maxTotal = computed(() => ratingRows.value.reduce((sum, r) => sum + r.starMax, 0))
</script>

<template>
  <el-drawer
    v-model="drawerVisible"
    size="560px"
    direction="rtl"
    :with-header="false"
    destroy-on-close
  >
    <div class="flex h-full flex-col">
      <div class="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <div>
          <h2 class="text-lg font-semibold text-gray-800">{{ d.studentName }} · 家长评价</h2>
          <p class="mt-0.5 text-sm text-gray-400">
            {{ d.studentDepName }} · {{ d.termName }} · 家长 {{ d.evaluatorName }} 于
            {{ d.evalTime }}
          </p>
        </div>
        <el-button link @click="drawerVisible = false"
          ><template #icon><IconEpClose /></template
        ></el-button>
      </div>

      <div v-loading="isFetching" class="flex-1 overflow-y-auto px-6 py-4">
        <h3 class="mb-2 text-sm font-medium text-gray-700">
          评价项评分
          <span class="ml-1 text-xs font-normal text-gray-400">
            （共 {{ ratingRows.length }} 项，来自「积分规则配置」）
          </span>
        </h3>
        <div v-if="ratingRows.length" class="mb-6 space-y-2">
          <div
            v-for="row in ratingRows"
            :key="row.key"
            class="flex items-center justify-between rounded border border-gray-100 bg-gray-50 px-3 py-2"
          >
            <span class="flex items-center gap-2 text-sm text-gray-700">
              {{ row.name }}
              <span
                v-if="row.wuyuName"
                class="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] text-blue-500"
              >
                {{ row.wuyuName }}
              </span>
            </span>
            <span class="text-amber-500">
              <span v-for="i in row.star" :key="i">★</span>
              <span v-for="i in Math.max(row.starMax - row.star, 0)" :key="'e' + i" class="text-gray-300"
                >★</span
              >
              <span class="ml-2 text-xs text-gray-500">{{ row.star }} 星</span>
            </span>
          </div>
        </div>
        <el-empty v-else description="暂无评分数据" :image-size="60" class="mb-6" />

        <h3 class="mb-2 text-sm font-medium text-gray-700">总星级</h3>
        <div class="mb-3 text-2xl text-amber-500">
          <span v-for="i in Math.min(d.totalScore, 10)" :key="i">★</span>
          <span v-if="d.totalScore > 10" class="ml-1 text-sm text-gray-500"
            >+{{ d.totalScore - 10 }}</span
          >
          <span class="ml-2 text-sm text-gray-500">
            共 {{ d.totalScore }} 星{{ maxTotal ? ` / 满分 ${maxTotal} 星` : '' }}
          </span>
        </div>
        <div v-if="d.wuyuName" class="flex items-center gap-2 text-sm text-gray-600">
          <span class="text-gray-400">归属五育</span>
          <span class="rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600">
            {{ d.wuyuName }}
          </span>
          <span class="text-xs text-gray-400">（按后台评价项配置归入）</span>
        </div>
      </div>
    </div>
  </el-drawer>
</template>
