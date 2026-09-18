<script setup lang="ts">
/**
 * 积分规则配置 — 评价维度规则（Pane 1）
 */
import { ref, computed, h } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { ElMessageBox } from 'element-plus'
import TermSelect from '@/components/TermSelect/index.vue'
import ScoreRuleFormDialog from './ScoreRuleFormDialog.vue'
import {
  pcScoreRuleKeys,
  fetchScoreRuleList,
  updateScoreRule,
  deleteScoreRule,
  toggleScoreRule,
  resetScoreRule,
  IconType,
  type ScoreRuleItem,
} from '@/api/pcScoreRule'
import { EvalSection } from '@/api/pcEval'
import { message, withLoading } from '@/utils/feedback'
import { resolveFileUrl } from '@/utils/file'

defineOptions({ name: 'DimRule' })
const props = defineProps<{ termCode?: string }>()
const emit = defineEmits<{ 'update:termCode': [value: string | undefined] }>()

const queryClient = useQueryClient()

// ───────────── 评价维度规则 ─────────────
const { data: rules, isFetching } = useQuery({
  queryKey: computed(() => pcScoreRuleKeys.list({ termCode: props.termCode })),
  queryFn: ({ signal }) => fetchScoreRuleList({ termCode: props.termCode }, signal),
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

const WUYU_LABEL: Record<string, string> = {
  de: '德育',
  zhi: '智育',
  ti: '体育',
  mei: '美育',
  lao: '劳育',
}

const updateMut = useMutation({ mutationFn: (d: ScoreRuleItem) => updateScoreRule(d) })
// 表格行类型为 Record<PropertyKey, any>，运行时即为 ScoreRuleItem，此处允许 any（渐进式迁移）
async function patchRule(row: any, patch: Partial<ScoreRuleItem>) {
  const payload = { ...row, ...patch } as ScoreRuleItem
  await withLoading(updateMut.mutateAsync(payload), '保存中...')
  message.success('已保存')
  await queryClient.invalidateQueries({ queryKey: pcScoreRuleKeys.all })
}
async function toggleRule(row: any, enabled: boolean) {
  await withLoading(toggleScoreRule({ id: row.id, enabled }), '更新中...')
  message.success(enabled ? '已启用' : '已停用')
  await queryClient.invalidateQueries({ queryKey: pcScoreRuleKeys.all })
}
const delMut = useMutation({ mutationFn: (d: { id: number }) => deleteScoreRule(d) })
async function handleDelete(row: any) {
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
  await withLoading(resetMut.mutateAsync({ termCode: props.termCode }), '恢复中...')
  message.success('已恢复默认')
  await queryClient.invalidateQueries({ queryKey: pcScoreRuleKeys.all })
}

// ───────────── 新增 / 编辑 弹窗（独立组件） ─────────────
const formDialogRef = ref<InstanceType<typeof ScoreRuleFormDialog>>()
function openCreate() {
  formDialogRef.value?.open()
}
function openEdit(row: any) {
  formDialogRef.value?.open(row)
}
async function handleFormSuccess() {
  await queryClient.invalidateQueries({ queryKey: pcScoreRuleKeys.all })
}

/** 图标地址：上传后的相对路径走文件服务；旧数据为奖章文件名（/medals/ 下） */
function medalUrl(icon: string) {
  if (!icon) return ''
  if (/^(https?:)?\/\//.test(icon) || /^(data|blob):/.test(icon)) return icon
  return icon.startsWith('/') ? resolveFileUrl(icon) : `/medals/${icon}`
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
      <TermSelect :model-value="termCode" @update:model-value="emit('update:termCode', $event)" />
      <el-button @click="openCreate"
        ><template #icon><IconEpPlus /></template>新增维度</el-button
      >
      <el-button @click="handleReset"
        ><template #icon><IconEpRefreshLeft /></template>恢复默认</el-button
      >
      <span class="ml-auto text-xs text-gray-400">改动会实时保存 · 配置适用于所选学期</span>
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
              @change="(v: IconType) => patchRule(row, { iconType: v })"
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
              @change="(v: number) => patchRule(row, { score: v })"
            />
          </template>
        </el-table-column>
        <el-table-column label="归入五育" width="100" align="center">
          <template #default="{ row }">
            <el-select
              :model-value="row.wuyu"
              size="small"
              style="width: 78px"
              @change="(v: string) => patchRule(row, { wuyu: v })"
            >
              <el-option v-for="(label, k) in WUYU_LABEL" :key="k" :label="label" :value="k" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }"
            ><el-switch :model-value="row.enabled" @change="(v: boolean) => toggleRule(row, v)"
          /></template>
        </el-table-column>
        <el-table-column label="操作" width="130" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
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
              @change="(v: string) => patchRule(row, { wuyu: v })"
            >
              <el-option v-for="(label, k) in WUYU_LABEL" :key="k" :label="label" :value="k" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }"
            ><el-switch :model-value="row.enabled" @change="(v: boolean) => toggleRule(row, v)"
          /></template>
        </el-table-column>
        <el-table-column label="操作" width="130" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
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
              @change="(v: number) => patchRule(gcConfig, { score: v })"
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
            @change="(v: string) => patchRule(gcConfig, { wuyu: v })"
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
            @change="(v: string) => patchRule(gcConfig, { certTemplate: v })"
          />
        </div>
        <div class="md:col-span-2">
          <div class="mb-1 text-xs font-semibold text-gray-500">板块说明</div>
          <el-input
            type="textarea"
            :rows="2"
            :model-value="gcConfig.description"
            placeholder="板块用途与评价说明"
            @change="(v: string) => patchRule(gcConfig, { description: v })"
          />
        </div>
        <div class="md:col-span-2">
          <div class="mb-1 text-xs font-semibold text-gray-500">板块状态</div>
          <div class="flex items-center gap-2">
            <el-switch
              :model-value="gcConfig.enabled"
              @change="(v: boolean) => toggleRule(gcConfig, v)"
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

    <!-- 新增 / 编辑 弹窗（独立组件） -->
    <ScoreRuleFormDialog ref="formDialogRef" @success="handleFormSuccess" />
  </div>
</template>
