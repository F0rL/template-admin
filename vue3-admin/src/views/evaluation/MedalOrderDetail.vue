<script setup lang="ts">
/**
 * 追"锋"时刻详情抽屉 — 对接 PcMedal/GetDetail
 * 一次提交 = 一条记录：多个学生 + 多个奖章
 */
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import {
  pcMedalKeys,
  fetchPcMedalOrderDetail,
  type PcMedalOrderDetail,
  type PcMedalOrderListItem,
} from '@/api/pcMedal'
import { resolveFileUrl } from '@/utils/file'

const props = defineProps<{ visible: boolean; row: PcMedalOrderListItem }>()
const emit = defineEmits<{ 'update:visible': [v: boolean] }>()

const drawerVisible = computed({
  get: () => props.visible,
  set: v => emit('update:visible', v),
})

const { data: detail, isFetching } = useQuery({
  queryKey: computed(() => pcMedalKeys.detail(props.row.id)),
  queryFn: ({ signal }) => fetchPcMedalOrderDetail({ id: props.row.id }, signal),
  enabled: () => props.visible,
})

/** 列表行兜底 + 详情覆盖，保证模板里字段类型稳定 */
const d = computed<PcMedalOrderDetail>(() => ({
  ...props.row,
  comments: [],
  likeNames: [],
  ...(detail.value ?? {}),
}))

/** 奖章名 → 五育配色（与移动端 MEDALS 一致） */
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

/** job 形如「班主任/四年级1班」，取最后一段作为班级名 */
const className = computed(
  () => d.value.depFullName || (d.value.job || '').split('/').pop() || d.value.depName || '—',
)

/** 好公民评价才有表单快照（证书 + 获奖分类/级别/奖次/时间/单位/奖励） */
const evalPayload = computed(() => (d.value.evalSection === 1 ? d.value.evalPayload : null))

const WUYU_LABEL: Record<string, string> = {
  de: '德育',
  zhi: '智育',
  ti: '体育',
  mei: '美育',
  lao: '劳育',
}
const SUBCATEGORY_LABEL: Record<number, string> = { 1: '荣誉类', 2: '竞赛类', 3: '辅导类' }
const wuyuLabel = computed(() => WUYU_LABEL[evalPayload.value?.wuyu ?? ''] || '—')
const subCategoryLabel = computed(
  () => SUBCATEGORY_LABEL[Number(evalPayload.value?.subCategory) || 0] || '—',
)

/**
 * 图片附件：库表只存相对路径（/upload/...），必须拼接口域名才能加载，
 * 否则 el-image 会按当前站点路径去取 → 加载失败。与积分规则图标、奖证库附件同一处理。
 */
const imgList = computed(() => (d.value.imgList ?? []).map(p => resolveFileUrl(p)))
</script>

<template>
  <el-drawer
    v-model="drawerVisible"
    size="600px"
    direction="rtl"
    :with-header="false"
    destroy-on-close
  >
    <div class="flex h-full flex-col">
      <div class="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <div>
          <h2 class="text-lg font-semibold text-gray-800">
            {{ d.teacherName }}老师 · 追"锋"时刻
          </h2>
          <p class="mt-0.5 text-sm text-gray-400">
            {{ className }} · {{ d.createTime }}
          </p>
        </div>
        <el-button link @click="drawerVisible = false">
          <template #icon><IconEpClose /></template>
        </el-button>
      </div>

      <div v-loading="isFetching" class="flex-1 overflow-y-auto px-6 py-4">
        <!-- 涉及学生 -->
        <h3 class="mb-2 text-sm font-medium text-gray-700">
          涉及学生（{{ d.studentCount || d.studentNames?.length || 0 }}）
        </h3>
        <div class="mb-5 flex flex-wrap gap-2">
          <el-tag v-for="name in d.studentNames" :key="name" type="info" size="small" effect="plain">
            {{ name }}
          </el-tag>
          <span v-if="!d.studentNames?.length" class="text-sm text-gray-400">—</span>
        </div>

        <!-- 奖章 -->
        <h3 class="mb-2 text-sm font-medium text-gray-700">奖章（共 {{ d.medalTotal }} 枚）</h3>
        <div class="mb-5 flex flex-wrap gap-3">
          <div
            v-for="m in d.medals"
            :key="m.medalName"
            class="flex items-center gap-2 rounded-lg border px-3 py-2"
            :style="{ borderColor: medalColor(m.medalName) + '66', background: medalColor(m.medalName) + '14' }"
          >
            <span class="text-base">{{ medalEmoji(m.medalName) }}</span>
            <span class="text-sm" :style="{ color: medalColor(m.medalName) }">{{ m.medalName }}</span>
            <span class="text-sm font-semibold text-gray-700">×{{ m.num }}</span>
          </div>
          <span v-if="!d.medals?.length" class="text-sm text-gray-400">—</span>
        </div>

        <!-- 好公民评价信息（发表表单快照）：补全证书获奖分类/级别/奖次/时间/单位/奖励 -->
        <template v-if="evalPayload">
          <h3 class="mb-2 text-sm font-medium text-gray-700">评价信息</h3>
          <el-descriptions :column="2" border size="small" class="mb-5">
            <el-descriptions-item label="证书名称" :span="2">
              {{ evalPayload.certName || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="获奖分类">{{ subCategoryLabel }}</el-descriptions-item>
            <el-descriptions-item label="获奖级别">{{ evalPayload.awardLevel || '—' }}</el-descriptions-item>
            <el-descriptions-item label="奖次">{{ evalPayload.awardGrade || '—' }}</el-descriptions-item>
            <el-descriptions-item label="获奖时间">{{ evalPayload.awardTime || '—' }}</el-descriptions-item>
            <el-descriptions-item label="颁奖单位" :span="2">
              {{ evalPayload.awardUnit || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="奖励" :span="2">{{ evalPayload.reward || '—' }}</el-descriptions-item>
            <el-descriptions-item label="五育归属">{{ wuyuLabel }}</el-descriptions-item>
            <el-descriptions-item label="获得积分">{{ evalPayload.score ?? 0 }} 分</el-descriptions-item>
          </el-descriptions>
        </template>

        <!-- 正文 -->
        <h3 class="mb-2 text-sm font-medium text-gray-700">正文</h3>
        <p class="mb-5 whitespace-pre-wrap text-sm leading-6 text-gray-700">
          {{ d.content || '—' }}
        </p>

        <!-- 图片（好公民评价的证书照片等，相对路径统一拼接口域名） -->
        <template v-if="imgList.length">
          <h3 class="mb-2 text-sm font-medium text-gray-700">图片（{{ imgList.length }}）</h3>
          <div class="mb-5 flex flex-wrap gap-2">
            <el-image
              v-for="(src, i) in imgList"
              :key="i"
              :src="src"
              :preview-src-list="imgList"
              :initial-index="i"
              :preview-teleported="true"
              fit="cover"
              class="h-20 w-20 cursor-pointer rounded border border-gray-200"
            >
              <template #error>
                <div class="flex h-full w-full items-center justify-center bg-gray-50 text-xs text-gray-400">
                  加载失败
                </div>
              </template>
            </el-image>
          </div>
        </template>

        <!-- 互动 -->
        <h3 class="mb-2 text-sm font-medium text-gray-700">互动</h3>
        <div class="mb-3 flex gap-6 text-sm text-gray-500">
          <span>👍 点赞 {{ d.likeCount }}</span>
          <span>💬 评论 {{ d.commentCount }}</span>
          <span>👀 家长查看 {{ d.lookNum }}/{{ d.studentTotal }}</span>
        </div>
        <div v-if="d.likeNames.length" class="mb-3 text-sm text-gray-500">
          点赞人：{{ d.likeNames.join('、') }}
        </div>

        <template v-if="d.comments.length">
          <h3 class="mb-2 text-sm font-medium text-gray-700">评论</h3>
          <div class="space-y-2">
            <div
              v-for="c in d.comments"
              :key="c.id"
              class="rounded border border-gray-100 bg-gray-50 px-3 py-2"
            >
              <div class="flex items-baseline justify-between">
                <span class="text-[13px] font-medium text-gray-700">{{ c.name }}</span>
                <span class="text-xs text-gray-400">{{ c.createTime }}</span>
              </div>
              <div class="mt-0.5 text-[13px] leading-5 text-gray-600">{{ c.content }}</div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </el-drawer>
</template>
