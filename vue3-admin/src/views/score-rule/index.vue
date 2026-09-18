<script setup lang="ts">
/**
 * 积分规则配置 — 严格参考 PC 原型 score-rule.html
 * 顶部二级 Tab：① 评价维度规则 ② 成长树阶段阈值
 */
import { ref, computed, watch, h } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { ElMessageBox } from 'element-plus'
import type { UploadRequestOptions, UploadRawFile, UploadUserFile } from 'element-plus'
import TermSelect from '@/components/TermSelect/index.vue'
import {
  pcScoreRuleKeys,
  fetchScoreRuleList,
  createScoreRule,
  updateScoreRule,
  deleteScoreRule,
  toggleScoreRule,
  resetScoreRule,
  fetchGrowthStages,
  updateGrowthStages,
  resetGrowthStages,
  IconType,
  type ScoreRuleItem,
  type GrowthStage,
} from '@/api/pcScoreRule'
import { EvalSection } from '@/api/pcEval'
import * as sysFileApi from '@/api/system/sysFile'
import { resolveFileUrl, validateImageFile } from '@/utils/file'
import { message, withLoading } from '@/utils/feedback'

defineOptions({ name: 'ScoreRuleList' })
const queryClient = useQueryClient()

const termCode = ref<string | undefined>(undefined)
const activeTab = ref<'dim' | 'tree'>('dim')

// ───────────── 评价维度规则 ─────────────
const { data: rules, isFetching } = useQuery({
  queryKey: computed(() => pcScoreRuleKeys.list({ termCode: termCode.value })),
  queryFn: ({ signal }) => fetchScoreRuleList({ termCode: termCode.value }, signal),
})

const gcConfig = computed(() => (rules.value ?? []).find(r => r.dimName === '__config__'))
const visibleRules = computed(() =>
  (rules.value ?? []).filter(r => r.dimName !== '__config__' && !r.hidden),
)
const goodStudentRules = computed(() =>
  [...visibleRules.value]
    .filter(r => r.section === EvalSection.GoodStudent)
    .sort((a, b) => a.sortNo - b.sortNo),
)
const goodChildRules = computed(() =>
  [...visibleRules.value]
    .filter(r => r.section === EvalSection.GoodChild)
    .sort((a, b) => a.sortNo - b.sortNo),
)

const total = computed(() => visibleRules.value.length)
const enabledCount = computed(() => visibleRules.value.filter(r => r.enabled).length)
const disabledCount = computed(() => total.value - enabledCount.value)
const wuyuDist = computed(() => {
  const d: Record<string, number> = {}
  visibleRules.value
    .filter(r => r.enabled)
    .forEach(r => {
      d[r.wuyu] = (d[r.wuyu] || 0) + 1
    })
  if (gcConfig.value?.enabled) d.de = (d.de || 0) + 1
  return d
})
const configTotal = computed(() => total.value + 1)
const configEnabled = computed(() => enabledCount.value + (gcConfig.value?.enabled ? 1 : 0))

const WUYU_COLOR: Record<string, string> = {
  de: '#cf3c3c',
  zhi: '#2b85e4',
  ti: '#52c41a',
  mei: '#722ed1',
  lao: '#faad14',
}
const WUYU_LABEL: Record<string, string> = {
  de: '德育',
  zhi: '智育',
  ti: '体育',
  mei: '美育',
  lao: '劳育',
}

const updateMut = useMutation({ mutationFn: (d: ScoreRuleItem) => updateScoreRule(d) })
async function patchRule(row: ScoreRuleItem, patch: Partial<ScoreRuleItem>) {
  const payload = { ...row, ...patch } as ScoreRuleItem
  await withLoading(updateMut.mutateAsync(payload), '保存中...')
  message.success('已保存')
  await queryClient.invalidateQueries({ queryKey: pcScoreRuleKeys.all })
}
async function toggleRule(row: ScoreRuleItem, enabled: boolean) {
  await withLoading(toggleScoreRule({ id: row.id, enabled }), '更新中...')
  message.success(enabled ? '已启用' : '已停用')
  await queryClient.invalidateQueries({ queryKey: pcScoreRuleKeys.all })
}
const delMut = useMutation({ mutationFn: (d: { id: number }) => deleteScoreRule(d) })
async function handleDelete(row: ScoreRuleItem) {
  await ElMessageBox.confirm(
    `确认删除评价维度「${row.dimName}」？删除后移动端该板块将不再展示此评价项，且无法恢复。`,
    '删除确认',
    { type: 'warning' },
  )
  await withLoading(delMut.mutateAsync({ id: row.id }), '删除中...')
  message.success('已删除')
  await queryClient.invalidateQueries({ queryKey: pcScoreRuleKeys.all })
}
const resetMut = useMutation({ mutationFn: (d: { termCode?: string }) => resetScoreRule(d) })
async function handleReset() {
  await ElMessageBox.confirm(
    '恢复默认规则将覆盖当前所有自定义规则，已产生的评价记录不受影响，确定继续？',
    '恢复默认',
    { type: 'warning' },
  )
  await withLoading(resetMut.mutateAsync({ termCode: termCode.value }), '恢复中...')
  message.success('已恢复默认')
  await queryClient.invalidateQueries({ queryKey: pcScoreRuleKeys.all })
}

// ───────────── 新增 / 编辑 弹窗 ─────────────
const formVisible = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const form = ref<Partial<ScoreRuleItem>>({})
function openCreate() {
  formMode.value = 'create'
  form.value = {
    section: EvalSection.GoodStudent,
    dimName: '',
    wuyu: 'de',
    score: 2,
    iconType: IconType.Image,
    icon: '',
    emoji: '⭐',
    sortNo: 99,
    enabled: true,
    starMax: 3,
    remark: '',
  }
  buildMedalFileList()
  formVisible.value = true
}
function openEdit(row: ScoreRuleItem) {
  formMode.value = 'edit'
  form.value = { ...row }
  buildMedalFileList()
  formVisible.value = true
}

// ───────────── 奖章图片上传（好学生 / 图片类型） ─────────────
const medalFileList = ref<UploadUserFile[]>([])
function buildMedalFileList() {
  if (form.value.iconType === IconType.Image && form.value.icon) {
    medalFileList.value = [{ uid: -1, name: form.value.icon, url: medalUrl(form.value.icon) }]
  } else {
    medalFileList.value = []
  }
}
function handleMedalBeforeUpload(file: UploadRawFile) {
  return validateImageFile(file)
}
async function handleMedalUpload(options: UploadRequestOptions) {
  const formData = new FormData()
  // 后端 SysFileUploadRequest.File（IFormFile）— 字段名精确匹配首字母大写
  formData.append('File', options.file)
  try {
    const res = await sysFileApi.sysFileUpload(formData)
    // 后端只返回相对路径 path，业务数据只存相对路径，显示时用 resolveFileUrl 拼域名
    form.value.icon = res.path
    options.onSuccess(res)
    const item = medalFileList.value.find(f => f.uid === options.file.uid)
    if (item) item.url = medalUrl(res.path)
  } catch {
    message.error('奖章图片上传失败')
    const error = Object.assign(new Error('上传失败'), { status: -1 })
    options.onError(error as Parameters<typeof options.onError>[0])
  }
}
function handleMedalRemove() {
  form.value.icon = ''
  medalFileList.value = []
}
const createMut = useMutation({ mutationFn: (d: ScoreRuleItem) => createScoreRule(d) })
async function submitForm() {
  if (!form.value.dimName) {
    message.warning('请填写维度名称')
    return
  }
  if (
    form.value.section === EvalSection.GoodStudent &&
    (form.value.score == null || form.value.score < 0 || form.value.score > 100)
  ) {
    message.warning('单次积分需为 0-100')
    return
  }
  if (form.value.section === EvalSection.GoodChild) form.value.starMax = form.value.starMax ?? 3
  const payload = { ...form.value } as ScoreRuleItem
  await withLoading(
    (async () => {
      if (formMode.value === 'create') await createMut.mutateAsync(payload)
      else await updateMut.mutateAsync(payload)
    })(),
    '提交中...',
  )
  message.success('已保存')
  formVisible.value = false
  await queryClient.invalidateQueries({ queryKey: pcScoreRuleKeys.all })
}

// ───────────── 成长树阶段阈值 ─────────────
const { data: stages, refetch: refetchStages } = useQuery({
  queryKey: computed(() => pcScoreRuleKeys.growthStages({ termCode: termCode.value })),
  queryFn: ({ signal }) => fetchGrowthStages({ termCode: termCode.value }, signal),
})
const stageEditing = ref<GrowthStage[]>([])
watch(
  stages,
  v => {
    if (v) stageEditing.value = JSON.parse(JSON.stringify(v))
  },
  { immediate: true },
)

const DEFAULT_STAGES = [
  { name: '萌芽期', enName: 'Sprout', desc: '播种绿色种子，初步养成好习惯', thr: 0, max: 10 },
  { name: '抽枝期', enName: 'Branching', desc: '扎根成长，逐步发展多元素养', thr: 10, max: 50 },
  { name: '繁茂期', enName: 'Flourishing', desc: '素养全面发展，朝气蓬勃', thr: 50, max: 100 },
  { name: '硕果期', enName: 'Fruiting', desc: '长成锋范少年，收获成长成果', thr: 100, max: null },
]
const GS_TONES = ['#9bc46a', '#67ab3f', '#3f9d2e', '#2e7d1f']

const sortedStages = computed(() => [...stageEditing.value].sort((a, b) => a.sortNo - b.sortNo))
const previewSegments = computed(() => {
  const sorted = sortedStages.value
  if (!sorted.length) return []
  const lastMax = sorted[sorted.length - 1].max
  const span = lastMax === null ? 200 : lastMax
  return sorted.map((s, i) => {
    const lo = s.thr
    const hi = s.max === null ? span : s.max
    const widthPct = ((hi - lo) / span) * 100
    const label = s.max === null ? `${s.name} ≥${lo}` : `${s.name} ${lo}–${hi - 1}`
    return { name: s.name, label, widthPct, tone: GS_TONES[i] || '#2e7d1f' }
  })
})
const previewAxis = computed(() => {
  const sorted = sortedStages.value
  if (!sorted.length) return []
  const axes = sorted.map(s => String(s.thr))
  axes.push(sorted[sorted.length - 1].max === null ? '∞' : String(sorted[sorted.length - 1].max))
  return axes
})
function onStageMaxChange(idx: number, val: number | null) {
  const sorted = sortedStages.value
  const s = sorted[idx]
  if (!s) return
  if (val === null) {
    s.max = null
    return
  }
  if (val <= s.thr) {
    message.warning(`上限需 > 当前阈值 ${s.thr}`)
    return
  }
  s.max = val
  if (idx < sorted.length - 1) sorted[idx + 1].thr = val
}
function resetOneStage(idx: number) {
  const sorted = sortedStages.value
  const def = DEFAULT_STAGES[idx]
  const s = sorted[idx]
  if (!s || !def) return
  s.thr = def.thr
  s.max = def.max
  for (let i = 1; i < sorted.length; i++) sorted[i].thr = sorted[i - 1].max ?? sorted[i].thr
  message.success(`已恢复「${s.name}」为默认阈值`)
}
const updateStagesMut = useMutation({ mutationFn: (d: GrowthStage[]) => updateGrowthStages(d) })
async function saveStages() {
  await withLoading(updateStagesMut.mutateAsync(stageEditing.value), '保存中...')
  message.success('成长树阶段已保存')
  await refetchStages()
}
const resetStagesMut = useMutation({
  mutationFn: (d: { termCode?: string }) => resetGrowthStages(d),
})
async function handleResetStages() {
  await ElMessageBox.confirm(
    '恢复默认将覆盖自定义阶段（萌芽 0-10 / 抽枝 10-50 / 繁茂 50-100 / 硕果 100+），确定继续？',
    '恢复默认阶段',
    { type: 'warning' },
  )
  await withLoading(resetStagesMut.mutateAsync({ termCode: termCode.value }), '恢复中...')
  message.success('已恢复默认阶段')
  await refetchStages()
}

function medalUrl(icon: string) {
  if (!icon) return ''
  // 相对路径（/upload/...）→ resolveFileUrl 拼接接口域名（含历史 127.0.0.1 绝对 URL 归一化）
  if (icon.startsWith('/')) return resolveFileUrl(icon)
  // 完整 URL（历史遗留）原样交给 resolveFileUrl 处理；
  // 更早的历史遗留图片文件名（如 奖章-阳光少年章.png）回退到 /medals/ 目录
  if (/^(https?:)?\/\//.test(icon)) return resolveFileUrl(icon)
  return `/medals/${icon}`
}

// ───────────── 分组小标题（与原型 sec-head 一致） ─────────────
const SectionHead = (props: { icon: string; title: string; desc?: string; count?: string }) =>
  h(
    'div',
    {
      class:
        'flex items-center gap-2 border border-[#b3d8ff] border-b-0 rounded-t-lg bg-gradient-to-br from-[#f0f7ff] to-[#e6f2ff] px-4 py-3 font-semibold text-[#1a2332]',
    },
    [
      h(
        'span',
        {
          class:
            'flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-[#4facfe] to-[#2b85e4] text-base text-white',
        },
        props.icon,
      ),
      h('span', props.title),
      props.desc
        ? h('span', { class: 'ml-2 font-normal text-xs text-[#5a6b85]' }, props.desc)
        : null,
      props.count
        ? h('span', { class: 'ml-auto font-normal text-xs text-gray-400' }, props.count)
        : null,
    ],
  )
</script>

<template>
  <div class="space-y-4">
    <!-- 顶部二级 Tab -->
    <div class="rounded bg-white shadow-sm">
      <div class="flex border-b border-gray-100 px-4">
        <button
          class="border-b-2 px-5 py-3 text-sm font-medium transition-colors"
          :class="
            activeTab === 'dim'
              ? 'border-[#2b85e4] text-[#2b85e4]'
              : 'border-transparent text-gray-500 hover:text-[#2b85e4]'
          "
          @click="activeTab = 'dim'"
        >
          ⚙️ 评价维度规则
        </button>
        <button
          class="border-b-2 px-5 py-3 text-sm font-medium transition-colors"
          :class="
            activeTab === 'tree'
              ? 'border-[#2b85e4] text-[#2b85e4]'
              : 'border-transparent text-gray-500 hover:text-[#2b85e4]'
          "
          @click="activeTab = 'tree'"
        >
          🌳 成长树阶段阈值
        </button>
      </div>
    </div>

    <!-- ============ Pane 1: 评价维度规则 ============ -->
    <div v-show="activeTab === 'dim'" class="space-y-4">
      <div class="rounded bg-blue-50 px-4 py-3 text-xs leading-relaxed text-gray-600">
        核心逻辑：整个素养评价体系以「给积分 + 导入证书 +
        导入期末成绩」为核心，各板块评价结果统一纳入五育总积分。<br />
        ① <b>好学生</b>：教师日常在校评价，按维度给积分，归入对应五育；维度图标支持<b>图片奖章</b>或
        <b>emoji 图标</b>两种类型；<br />
        ② <b>好公民</b>：大队部志愿服务，移动端流程为「先选积分值 → 选学生 →
        自定义证书名称+说明」，<b>统一积分归入德育</b>，无维度配置；<br />
        ③ <b>好孩子</b>：家长寒暑假评价，每项 <b>1-3 星</b>打分，<b>1 星 = 1 分</b
        >，量表总分归入劳育；<br />
        ④ 改动仅影响<b>新产生的评价</b>，已发评价不回溯。
      </div>

      <div class="flex flex-wrap items-center gap-3 rounded bg-white p-4 shadow-sm">
        <TermSelect v-model="termCode" />
        <el-button @click="openCreate"
          ><template #icon><IconEpPlus /></template>新增维度</el-button
        >
        <el-button @click="handleReset"
          ><template #icon><IconEpRefreshLeft /></template>恢复默认</el-button
        >
        <span class="ml-auto text-xs text-gray-400">改动会实时保存 · 配置适用于所选学期</span>
      </div>

      <!-- 统计卡 -->
      <div
        class="flex flex-wrap gap-3 rounded bg-gradient-to-br from-[#e6f2ff] to-[#f0f7ff] px-5 py-4 shadow-sm"
      >
        <div class="min-w-[72px] flex-1 text-center">
          <div class="text-xl font-extrabold text-[#2b85e4]">{{ configTotal }}</div>
          <div class="text-xs text-gray-500">配置项总数</div>
        </div>
        <div class="min-w-[72px] flex-1 text-center">
          <div class="text-xl font-extrabold text-[#52c41a]">{{ configEnabled }}</div>
          <div class="text-xs text-gray-500">已启用</div>
        </div>
        <div class="min-w-[72px] flex-1 text-center">
          <div class="text-xl font-extrabold text-gray-400">{{ disabledCount }}</div>
          <div class="text-xs text-gray-500">已停用</div>
        </div>
        <div class="min-w-[72px] flex-1 text-center">
          <div class="text-xl font-extrabold" :style="{ color: WUYU_COLOR.de }">
            {{ wuyuDist.de || 0 }}
          </div>
          <div class="text-xs text-gray-500">归入德育</div>
        </div>
        <div class="min-w-[72px] flex-1 text-center">
          <div class="text-xl font-extrabold" :style="{ color: WUYU_COLOR.zhi }">
            {{ wuyuDist.zhi || 0 }}
          </div>
          <div class="text-xs text-gray-500">归入智育</div>
        </div>
        <div class="min-w-[72px] flex-1 text-center">
          <div class="text-xl font-extrabold" :style="{ color: WUYU_COLOR.ti }">
            {{ wuyuDist.ti || 0 }}
          </div>
          <div class="text-xs text-gray-500">归入体育</div>
        </div>
        <div class="min-w-[72px] flex-1 text-center">
          <div class="text-xl font-extrabold" :style="{ color: WUYU_COLOR.mei }">
            {{ wuyuDist.mei || 0 }}
          </div>
          <div class="text-xs text-gray-500">归入美育</div>
        </div>
        <div class="min-w-[72px] flex-1 text-center">
          <div class="text-xl font-extrabold" :style="{ color: WUYU_COLOR.lao }">
            {{ wuyuDist.lao || 0 }}
          </div>
          <div class="text-xs text-gray-500">归入劳育</div>
        </div>
      </div>

      <!-- 好学生 -->
      <div class="overflow-hidden rounded-lg border border-gray-100 shadow-sm">
        <SectionHead
          icon="📚"
          title="好学生"
          desc="教师日常在校评价 · 按维度给积分，归入对应五育（图标支持图片奖章或 emoji）"
          :count="`启用 ${goodStudentRules.filter(r => r.enabled).length}/${goodStudentRules.length} 项`"
        />
        <el-table :data="goodStudentRules" border size="small" v-loading="isFetching">
          <el-table-column label="序号" width="60" align="center" prop="sortNo" />
          <el-table-column label="图标" width="70" align="center">
            <template #default="{ row }">
              <el-image
                v-if="row.iconType === IconType.Image && row.icon"
                :src="medalUrl(row.icon)"
                class="h-6 w-6"
                fit="contain"
              >
                <template #error
                  ><span class="text-base">{{ row.emoji || '⭐' }}</span></template
                >
              </el-image>
              <span v-else class="text-lg">{{ row.emoji || '⭐' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="图标类型" width="150" align="center">
            <template #default="{ row }">
              <el-radio-group
                :model-value="row.iconType"
                size="small"
                @change="(v: IconType) => patchRule(row as ScoreRuleItem, { iconType: v })"
              >
                <el-radio-button :value="IconType.Image">图片</el-radio-button>
                <el-radio-button :value="IconType.Emoji">emoji</el-radio-button>
              </el-radio-group>
            </template>
          </el-table-column>
          <el-table-column label="评价维度" min-width="170">
            <template #default="{ row }">
              <div class="font-semibold">{{ row.dimName }}</div>
              <div v-if="row.remark" class="mt-0.5 text-xs text-gray-400">{{ row.remark }}</div>
            </template>
          </el-table-column>
          <el-table-column label="单次积分" width="130" align="center">
            <template #default="{ row }">
              <el-input-number
                :model-value="row.score"
                :min="0"
                :max="100"
                size="small"
                controls-position="right"
                style="width: 92px"
                @change="(v: number) => patchRule(row as ScoreRuleItem, { score: v })"
              />
            </template>
          </el-table-column>
          <el-table-column label="归入五育" width="100" align="center">
            <template #default="{ row }">
              <el-select
                :model-value="row.wuyu"
                size="small"
                style="width: 78px"
                @change="(v: string) => patchRule(row as ScoreRuleItem, { wuyu: v })"
              >
                <el-option v-for="(label, k) in WUYU_LABEL" :key="k" :label="label" :value="k" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80" align="center">
            <template #default="{ row }"
              ><el-switch
                :model-value="row.enabled"
                @change="(v: boolean) => toggleRule(row as ScoreRuleItem, v)"
            /></template>
          </el-table-column>
          <el-table-column label="操作" width="130" align="center" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click="openEdit(row as ScoreRuleItem)"
                >编辑</el-button
              >
              <el-button type="danger" link @click="handleDelete(row as ScoreRuleItem)"
                >删除</el-button
              >
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 好孩子 -->
      <div class="overflow-hidden rounded-lg border border-gray-100 shadow-sm">
        <SectionHead
          icon="🏠"
          title="好孩子"
          desc="家长寒暑假评价 · 每项 1-3 星，1 星 = 1 分，量表总分归入劳育"
          :count="`启用 ${goodChildRules.filter(r => r.enabled).length}/${goodChildRules.length} 项`"
        />
        <el-table :data="goodChildRules" border size="small" v-loading="isFetching">
          <el-table-column label="序号" width="60" align="center" prop="sortNo" />
          <el-table-column label="图标" width="70" align="center">
            <template #default="{ row }"
              ><span class="text-lg">{{ row.emoji || '⭐' }}</span></template
            >
          </el-table-column>
          <el-table-column label="评价维度" min-width="170">
            <template #default="{ row }">
              <div class="font-semibold">{{ row.dimName }}</div>
              <div v-if="row.remark" class="mt-0.5 text-xs text-gray-400">{{ row.remark }}</div>
            </template>
          </el-table-column>
          <el-table-column label="星级评分" width="140" align="center">
            <template #default="{ row }">
              <span class="font-semibold text-[#faad14]">{{ '★'.repeat(row.starMax || 0) }}</span>
              <span
                class="ml-1 rounded border border-[#ffe58f] bg-[#fff7e6] px-1 text-[11px] text-[#ad6800]"
                >1星=1分</span
              >
            </template>
          </el-table-column>
          <el-table-column label="归入五育" width="100" align="center">
            <template #default="{ row }">
              <el-select
                :model-value="row.wuyu"
                size="small"
                style="width: 78px"
                @change="(v: string) => patchRule(row as ScoreRuleItem, { wuyu: v })"
              >
                <el-option v-for="(label, k) in WUYU_LABEL" :key="k" :label="label" :value="k" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80" align="center">
            <template #default="{ row }"
              ><el-switch
                :model-value="row.enabled"
                @change="(v: boolean) => toggleRule(row as ScoreRuleItem, v)"
            /></template>
          </el-table-column>
          <el-table-column label="操作" width="130" align="center" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link @click="openEdit(row as ScoreRuleItem)"
                >编辑</el-button
              >
              <el-button type="danger" link @click="handleDelete(row as ScoreRuleItem)"
                >删除</el-button
              >
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 好公民 配置卡 -->
      <div v-if="gcConfig" class="overflow-hidden rounded-lg border border-[#b3d8ff] shadow-sm">
        <SectionHead
          icon="🤝"
          title="好公民"
          desc="大队部志愿服务 · 先选积分→选学生→自定义证书+说明，统一归入德育"
          :count="gcConfig.enabled ? '已启用' : '已停用'"
        />
        <div class="grid grid-cols-1 gap-4 bg-white p-4 md:grid-cols-2">
          <div>
            <div class="mb-1 text-xs font-semibold text-gray-500">
              默认积分值 <span class="text-red-500">*</span>
            </div>
            <div class="flex items-center gap-2">
              <el-input-number
                :model-value="gcConfig.score"
                :min="1"
                :max="10"
                size="small"
                style="width: 110px"
                @change="(v: number) => patchRule(gcConfig!, { score: v })"
              />
              <span class="rounded-full bg-[#faad14] px-3 py-1 text-xs font-semibold text-white"
                >归入德育</span
              >
            </div>
            <div class="mt-1 text-xs text-gray-400">
              移动端评价时默认填入此值，教师可在 1-10 分范围内调整。
            </div>
          </div>
          <div>
            <div class="mb-1 text-xs font-semibold text-gray-500">归入五育</div>
            <el-select
              :model-value="gcConfig.wuyu"
              size="small"
              style="width: 120px"
              @change="(v: string) => patchRule(gcConfig!, { wuyu: v })"
            >
              <el-option v-for="(label, k) in WUYU_LABEL" :key="k" :label="label" :value="k" />
            </el-select>
            <div class="mt-1 text-xs text-gray-400">默认归入德育，与移动端「大队部评价」一致。</div>
          </div>
          <div class="md:col-span-2">
            <div class="mb-1 text-xs font-semibold text-gray-500">证书名称模板（选填）</div>
            <el-input
              :model-value="gcConfig.certTemplate"
              maxlength="30"
              placeholder="如：志愿服务证书 / 社会实践证明"
              @change="(v: string) => patchRule(gcConfig!, { certTemplate: v })"
            />
          </div>
          <div class="md:col-span-2">
            <div class="mb-1 text-xs font-semibold text-gray-500">板块说明</div>
            <el-input
              type="textarea"
              :rows="2"
              :model-value="gcConfig.description"
              placeholder="板块用途与评价说明"
              @change="(v: string) => patchRule(gcConfig!, { description: v })"
            />
          </div>
          <div class="md:col-span-2">
            <div class="mb-1 text-xs font-semibold text-gray-500">板块状态</div>
            <div class="flex items-center gap-2">
              <el-switch
                :model-value="gcConfig.enabled"
                @change="(v: boolean) => toggleRule(gcConfig!, v)"
              />
              <span class="text-xs text-gray-400">{{
                gcConfig.enabled
                  ? '启用中：移动端好公民评价入口可用'
                  : '已停用：移动端好公民评价入口隐藏'
              }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ============ Pane 2: 成长树阶段阈值 ============ -->
    <div v-show="activeTab === 'tree'" class="space-y-4">
      <div class="rounded bg-blue-50 px-4 py-3 text-xs leading-relaxed text-gray-600">
        成长树用于移动端「报告页」展示学生本学期五育总积分对应的成长阶段。<br />
        ①
        <b>阈值（thr）</b
        >为该阶段<b>起始</b>积分（含），<b>上限（max）</b>为该阶段<b>结束</b>积分（不含，留空表示无上限）；②
        相邻阶段的阈值与上限<b>必须连续</b>；③ 改动实时保存并同步到移动端成长树渲染。
      </div>

      <div class="flex flex-wrap items-center gap-3 rounded bg-white p-4 shadow-sm">
        <TermSelect v-model="termCode" />
        <el-button @click="handleResetStages"
          ><template #icon><IconEpRefreshLeft /></template>恢复默认阈值</el-button
        >
        <el-button type="primary" :loading="updateStagesMut.isPending.value" @click="saveStages"
          >保存</el-button
        >
        <span class="ml-auto text-xs text-gray-400"
          >移动端 report.js 将通过接口拉取本配置 · 阈值适用于所选学期</span
        >
      </div>

      <!-- 预览条 -->
      <div class="rounded bg-gradient-to-br from-[#f0f7ff] to-[#e6f2ff] px-5 py-4 shadow-sm">
        <div class="mb-2 text-sm font-semibold text-gray-700">
          🌳 阶段分布预览（按积分跨度比例展示）
        </div>
        <div class="flex h-8 overflow-hidden rounded border border-gray-200">
          <div
            v-for="(seg, i) in previewSegments"
            :key="i"
            class="flex items-center justify-center text-[11px] font-semibold text-white"
            :style="{ background: seg.tone, flex: seg.widthPct }"
          >
            <span class="truncate px-2">{{ seg.label }}</span>
          </div>
        </div>
        <div class="mt-1 flex text-[10px] text-gray-500">
          <div v-for="(ax, i) in previewAxis" :key="i" class="flex-1 text-center">{{ ax }}</div>
        </div>
      </div>

      <!-- 阶段表 -->
      <div class="panel-card">
        <el-table :data="sortedStages" border size="small">
          <el-table-column label="序号" width="70" align="center">
            <template #default="{ $index }">
              <span
                class="inline-flex h-7 w-7 items-center justify-center rounded-md font-bold text-white"
                :style="{ background: GS_TONES[$index] || '#2e7d1f' }"
                >{{ $index + 1 }}</span
              >
            </template>
          </el-table-column>
          <el-table-column label="阶段名称" width="140">
            <template #default="{ row }"><el-input v-model="row.name" size="small" /></template>
          </el-table-column>
          <el-table-column label="英文名" width="130">
            <template #default="{ row }"><el-input v-model="row.enName" size="small" /></template>
          </el-table-column>
          <el-table-column label="阶段描述" min-width="220">
            <template #default="{ row }"><el-input v-model="row.desc" size="small" /></template>
          </el-table-column>
          <el-table-column label="起点阈值 thr" width="130" align="center">
            <template #default="{ row }">
              <el-input-number
                :model-value="row.thr"
                :min="0"
                :max="1000"
                size="small"
                disabled
                style="width: 100px"
              />
              <div class="mt-0.5 text-[11px] text-gray-400">
                {{ row.sortNo === 1 ? '固定为 0' : '上一阶段上限联动' }}
              </div>
            </template>
          </el-table-column>
          <el-table-column label="结束上限 max" width="160" align="center">
            <template #default="{ row, $index }">
              <el-input-number
                :model-value="row.max"
                :min="0"
                :max="1000"
                size="small"
                style="width: 100px"
                :value-on-clear="null"
                @change="v => onStageMaxChange($index, v ?? null)"
              />
              <div class="mt-0.5 text-[11px] text-gray-400">
                {{ $index === sortedStages.length - 1 ? '留空 = 无上限' : '分（不含，需 > 阈值）' }}
              </div>
            </template>
          </el-table-column>
          <el-table-column label="积分范围" width="180" align="center">
            <template #default="{ row, $index }">
              <span
                class="inline-block rounded border border-[#e6efff] bg-[#f7faff] px-2 py-1 text-xs"
                :class="
                  $index === sortedStages.length - 1
                    ? '!border-[#ffe58f] !bg-[#fff7e6] !text-[#ad6800]'
                    : ''
                "
              >
                {{ row.max === null ? `≥ ${row.thr} 分` : `${row.thr} ≤ 积分 < ${row.max}` }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80" align="center">
            <template #default="{ row }"><el-switch v-model="row.enabled" /></template>
          </el-table-column>
          <el-table-column label="操作" width="100" align="center">
            <template #default="{ $index }">
              <el-button type="primary" link @click="resetOneStage($index)">恢复此阶段</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 新增 / 编辑 弹窗 -->
    <el-dialog
      v-model="formVisible"
      :title="formMode === 'create' ? '新增评价维度' : '编辑评价维度'"
      width="540px"
      destroy-on-close
    >
      <el-form :model="form" label-width="92px">
        <el-form-item label="所属板块">
          <el-select v-model="form.section" class="!w-full" :disabled="formMode === 'edit'">
            <el-option :value="EvalSection.GoodStudent" label="好学生" />
            <el-option :value="EvalSection.GoodChild" label="好孩子" />
          </el-select>
          <span v-if="formMode === 'edit'" class="ml-2 text-xs text-gray-400"
            >好公民为统一配置，不支持新增维度</span
          >
        </el-form-item>
        <el-form-item label="维度名称">
          <el-input v-model="form.dimName" maxlength="15" />
        </el-form-item>
        <el-form-item label="归入五育">
          <el-select v-model="form.wuyu" class="!w-full">
            <el-option v-for="(label, k) in WUYU_LABEL" :key="k" :label="label" :value="k" />
          </el-select>
        </el-form-item>
        <template v-if="form.section === EvalSection.GoodStudent">
          <el-form-item label="图标类型">
            <el-radio-group v-model="form.iconType">
              <el-radio :value="IconType.Image">图片奖章</el-radio>
              <el-radio :value="IconType.Emoji">emoji</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item v-if="form.iconType === IconType.Image" label="奖章图片">
            <div :class="{ 'is-full': medalFileList.length >= 1 }">
              <el-upload
                v-model:file-list="medalFileList"
                list-type="picture-card"
                :limit="1"
                accept="image/png,image/jpeg,image/bmp"
                :before-upload="handleMedalBeforeUpload"
                :http-request="handleMedalUpload"
                :on-remove="handleMedalRemove"
              >
                <IconEpPlus v-if="medalFileList.length < 1" />
              </el-upload>
            </div>
            <div class="mt-1 text-xs text-gray-400">
              点击上传奖章图片（建议透明背景 PNG，≤2MB）；不传则可用 emoji 图标
            </div>
          </el-form-item>
          <el-form-item v-else label="emoji">
            <el-input v-model="form.emoji" maxlength="2" style="width: 100px" />
          </el-form-item>
          <el-form-item label="单次分值">
            <el-input-number v-model="form.score" :min="0" :max="100" />
          </el-form-item>
        </template>
        <el-form-item v-else-if="form.section === EvalSection.GoodChild" label="评分方式">
          <span class="font-semibold text-[#faad14]">★ ★ ★</span>
          <span class="ml-2 text-xs text-gray-400"
            >家长端 1-3 星打分，1 星 = 1 分，量表总分归入劳育</span
          >
        </el-form-item>
        <el-form-item label="序号">
          <el-input-number v-model="form.sortNo" :min="1" :max="99" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="createMut.isPending.value || updateMut.isPending.value"
          @click="submitForm"
          >确定</el-button
        >
      </template>
    </el-dialog>
  </div>
</template>
