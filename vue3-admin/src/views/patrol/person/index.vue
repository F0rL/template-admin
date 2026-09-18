<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import dayjs from 'dayjs'
import ProTable from '@/components/ProTable/index.vue'
import type { ProTableColumn } from '@/components/ProTable/index.vue'
import ContactSelect from '@/components/ContactSelect/index.vue'
import type { PatrolPerson } from '@/api/pcPatrol'
import { pcPatrolKeys } from '@/api/pcPatrol'
import * as pcPatrolApi from '@/api/pcPatrol'
import { confirm, message, withLoading } from '@/utils/feedback'

defineOptions({ name: 'PatrolPerson' })

const queryClient = useQueryClient()
const contactRef = useTemplateRef('contactRef')

const guideVisible = ref(false)

const { data: people, isFetching: loading } = useQuery({
  queryKey: pcPatrolKeys.people(),
  queryFn: ({ signal }) => pcPatrolApi.fetchPeople(signal),
})

const columns: ProTableColumn<PatrolPerson>[] = [
  { type: 'index', label: '序号', width: 60, align: 'center' },
  { label: '姓名', prop: 'name', minWidth: 160 },
  { label: '所属部门', minWidth: 160, slot: 'dept' },
  { label: '巡查角色', width: 110, align: 'center', slot: 'role' },
  { label: '添加时间', width: 140, slot: 'joinDate' },
  { label: '操作', width: 170, fixed: 'right', slot: 'action' },
]

function refresh() {
  queryClient.invalidateQueries({ queryKey: pcPatrolKeys.people() })
}

/** 当前巡查人列表转为选人弹窗禁用项，避免重复添加 */
function disabledPeople() {
  return (people.value ?? [])
    .filter(p => !!p.userId)
    .map(p => ({ id: p.userId, name: p.name, type: 2 }))
}

/** 打开选人弹窗批量添加巡查人，已加入的老师在弹窗中不可选 */
async function handleAdd() {
  const picked = await contactRef.value?.open({
    selectType: 'user',
    selectNum: 'max',
    disabled: disabledPeople(),
  })
  if (!picked?.length) return
  const toAdd = picked.map(item => ({ name: item.name, userId: item.id, role: 1 }))
  await withLoading(pcPatrolApi.batchAddPeople({ people: toAdd }), '添加中...')
  message.success(`已添加 ${toAdd.length} 名巡查人`)
  refresh()
}

/** 切换巡查角色（教师 ⇄ 学生督查） */
async function handleToggleRole(row: PatrolPerson) {
  const nextRole = row.role === 2 ? 1 : 2
  const nextName = nextRole === 2 ? '学生督查' : '教师'
  const ok = await confirm(
    `确认将「${row.name}」的巡查角色切换为「${nextName}」？\n\n${
      nextRole === 2
        ? '切换为学生督查后，该账号移动端仅可使用「学生督查」板块。'
        : '切换为教师后，该账号移动端可使用全部巡查板块。'
    }`,
    '切换巡查角色',
    { type: 'warning', confirmButtonText: `切换为${nextName}` },
  )
  if (!ok) return
  await withLoading(
    pcPatrolApi.updatePerson({ id: row.id, role: nextRole }),
    '切换中...',
  )
  message.success(`已切换为「${nextName}」`)
  refresh()
}

/** 移除巡查人 */
async function handleRemove(row: PatrolPerson) {
  const ok = await confirm(
    `确认将「${row.name}」移出巡查组？\n移除后该${row.role === 2 ? '学生' : '老师'}将无法在移动端校务巡查中被识别为巡查人。`,
    '确认移除',
    { type: 'error', confirmButtonText: '确认移除' },
  )
  if (!ok) return
  await withLoading(pcPatrolApi.deletePerson({ id: row.id }), '移除中...')
  message.success(`已移除 ${row.name}`)
  refresh()
}
</script>

<template>
  <div class="panel-card flex h-page flex-col">
    <div class="mb-4 flex shrink-0 items-center">
      <el-button type="primary" @click="handleAdd">
        <template #icon><IconEpPlus /></template>
        添加巡查人
      </el-button>
      <div class="ml-auto">
        <el-tooltip content="操作说明" placement="top">
          <IconEpQuestionFilled
            class="ml-3 cursor-pointer text-base"
            @click="guideVisible = true"
          />
        </el-tooltip>
      </div>
    </div>

    <ProTable auto-height :columns="columns" :data="people" :loading="loading" row-key="id">
      <template #dept="{ row }">
        <el-tag v-if="row.dept" size="small" effect="plain">{{ row.dept }}</el-tag>
        <span v-else class="text-gray-300">—</span>
      </template>

      <template #role="{ row }">
        <el-tag v-if="row.role === 2" type="warning" size="small" effect="plain">学生</el-tag>
        <el-tag v-else type="primary" size="small" effect="plain">教师</el-tag>
      </template>

      <template #joinDate="{ row }">
        <span>{{ row.joinDate ? dayjs(row.joinDate).format('YYYY-MM-DD') : '—' }}</span>
      </template>

      <template #action="{ row }">
        <el-button type="warning" link @click="handleToggleRole(row)">
          {{ row.role === 2 ? '设为教师' : '设为学生' }}
        </el-button>
        <el-button type="danger" link @click="handleRemove(row)">移除</el-button>
      </template>
    </ProTable>
  </div>

  <ContactSelect ref="contactRef" />

  <el-dialog v-model="guideVisible" title="巡查人管理说明" width="560px" align-center>
    <ol
      class="m-0 list-decimal space-y-1.5 pl-5 text-[13px] leading-relaxed text-(--el-text-color-regular) [&_li::marker]:font-semibold"
    >
      <li>巡查人由 PC 端统一维护，移动端校务巡查仅可查看与选择。</li>
      <li>支持从组织架构中批量添加老师为巡查人，或移除现有巡查人。</li>
      <li><b class="text-(--el-text-color-primary)">巡查角色</b>：教师可使用全部巡查板块；学生督查账号仅可使用「学生督查」板块。</li>
      <li>学生督查账号用于注册专用企微账号给学生使用，需提前在企微后台开通。</li>
      <li>建议配置 <b class="text-(--el-text-color-primary)">10 名</b> 巡查人协同工作。</li>
      <li>移除后该账号将无法在移动端校务巡查中被识别为巡查人。</li>
    </ol>
    <template #footer>
      <el-button type="primary" @click="guideVisible = false">我知道了</el-button>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped></style>
