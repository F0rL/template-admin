<script setup lang="ts">
import { ref, computed, useTemplateRef } from 'vue'
import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/vue-query'
import ProTable from '@/components/ProTable/index.vue'
import type { ProTableColumn } from '@/components/ProTable/index.vue'
import type { RoleListItem } from '@/api/system/sysRole'
import { roleKeys } from '@/api/system/sysRole'
import * as sysRoleApi from '@/api/system/sysRole'
import { confirm, message, withLoading } from '@/utils/feedback'
import RoleForm from './components/RoleForm.vue'

const queryClient = useQueryClient()

const pageIndex = ref(1)
const pageSize = ref(10)
const roleFormRef = useTemplateRef('roleFormRef')

const { data: listRes, isFetching: loading } = useQuery({
  queryKey: [...roleKeys.lists(), pageIndex, pageSize],
  queryFn: ({ signal }) =>
    sysRoleApi.fetchRoleList({ page: pageIndex.value, rows: pageSize.value }, signal),
  placeholderData: keepPreviousData,
})

const tableData = computed(() => listRes.value?.list ?? [])
const total = computed(() => listRes.value?.total ?? 0)

const columns: ProTableColumn<RoleListItem>[] = [
  { type: 'index', label: '序号', width: 80, align: 'center' },
  { prop: 'name', label: '角色名称', minWidth: 160 },
  { label: '操作', width: 160, align: 'center', fixed: 'right', slot: 'action' },
]

function isSystemRole(id: string): boolean {
  return id === '10086'
}

/** 打开新增角色抽屉 */
function handleAdd() {
  roleFormRef.value?.open()
}

/** 打开编辑角色抽屉 */
function handleEdit(row: any) {
  roleFormRef.value?.open(row)
}

/** 删除角色 */
async function handleDelete(row: any) {
  const ok = await confirm(`确定删除角色「${row.name}」？`, '删除确认', {
    type: 'error',
    confirmButtonText: '删除',
  })
  if (!ok) return
  await withLoading(sysRoleApi.deleteRole({ ids: [row.id] }), '删除中...')
  message.success('删除成功')
  await queryClient.invalidateQueries({ queryKey: roleKeys.lists() })
}

function handleSuccess() {
  queryClient.invalidateQueries({ queryKey: roleKeys.lists() })
}
</script>

<template>
  <div class="flex h-page flex-col">
    <div class="flex min-h-0 flex-1 flex-col rounded bg-white p-4 shadow-sm">
      <div class="mb-4 flex shrink-0 items-center">
        <el-button type="primary" @click="handleAdd">
          <template #icon><IconEpPlus /></template>
          新增
        </el-button>
      </div>
      <ProTable
        auto-height
        v-model:current-page="pageIndex"
        v-model:page-size="pageSize"
        :columns="columns"
        :data="tableData"
        :loading="loading"
        :total="total"
        paginated
      >
        <template #action="{ row }">
          <el-button type="primary" link @click="handleEdit(row)" :disabled="isSystemRole(row.id)">
            编辑
          </el-button>
          <el-button type="danger" link @click="handleDelete(row)" :disabled="isSystemRole(row.id)">
            删除
          </el-button>
        </template>
      </ProTable>
    </div>
  </div>
  <RoleForm ref="roleFormRef" @success="handleSuccess" />
</template>
