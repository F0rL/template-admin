<script setup lang="ts">
import { ref, computed, useTemplateRef } from 'vue'
import { useQuery, keepPreviousData, useQueryClient } from '@tanstack/vue-query'
import ProTable from '@/components/ProTable/index.vue'
import type { ProTableColumn } from '@/components/ProTable/index.vue'
import type { UserListItem } from '@/api/system/sysUser'
import { userKeys } from '@/api/system/sysUser'
import * as sysUserApi from '@/api/system/sysUser'
import { confirm, message, withLoading } from '@/utils/feedback'
import { resolveFileUrl } from '@/utils/file'
import UserForm from './components/UserForm.vue'

const queryClient = useQueryClient()

const searchKey = ref('')
const page = ref(1)
const pageSize = ref(10)
const selectedRows = ref<UserListItem[]>([])
const userFormRef = useTemplateRef('userFormRef')

const {
  data: listRes,
  isFetching: loading,
  refetch,
} = useQuery({
  queryKey: [...userKeys.lists(), page, pageSize],
  queryFn: ({ signal }) =>
    sysUserApi.fetchUserList(
      {
        page: page.value,
        rows: pageSize.value,
        searchKey: searchKey.value || undefined,
      },
      signal,
    ),
  placeholderData: keepPreviousData,
})

const tableData = computed(() => listRes.value?.list ?? [])
const total = computed(() => listRes.value?.total ?? 0)

const columns: ProTableColumn<UserListItem>[] = [
  {
    type: 'selection',
    width: 55,
    align: 'center',
    selectable: row => row._disabled,
  },
  { prop: 'name', label: '姓名' },
  { prop: 'id', label: '账号' },
  { label: '头像', align: 'center', slot: 'avatar' },
  { label: '状态', align: 'center', slot: 'status' },
  { label: '角色', slot: 'roles' },
  { label: '操作', width: 160, align: 'center', fixed: 'right', slot: 'action' },
]

/** 删除单个或批量账户 */
async function handleDelete(ids: string[], name?: string) {
  const tip = name ? `确定删除账户「${name}」？` : `确定删除选中的 ${ids.length} 个账户？`
  const ok = await confirm(tip, '删除确认', {
    type: 'error',
    confirmButtonText: '删除',
  })
  if (!ok) return
  await withLoading(sysUserApi.deleteUser({ ids }), '删除中...')
  message.success('删除成功')
  await queryClient.invalidateQueries({ queryKey: userKeys.lists() })
  selectedRows.value = []
}

function handleSearch() {
  if (page.value === 1) refetch()
  else page.value = 1
}

function handleReset() {
  searchKey.value = ''
  if (page.value === 1) refetch()
  else page.value = 1
}

function handleSelectionChange(rows: UserListItem[]) {
  selectedRows.value = rows
}

/** 新增账户 */
function handleAdd() {
  userFormRef.value?.open()
}

/** 批量删除账户 */
function handleBatchDelete() {
  if (!selectedRows.value.length) {
    message.warning('请先勾选要删除的账户')
    return
  }
  handleDelete(selectedRows.value.map(row => row.id))
}

function handleEdit(row: UserListItem) {
  userFormRef.value?.open(row)
}

function handleSuccess() {
  queryClient.invalidateQueries({ queryKey: userKeys.lists() })
}
</script>

<template>
  <div class="flex h-page flex-col">
    <div class="panel-card mb-4 shrink-0">
      <div class="flex items-center">
        <el-input
          v-model="searchKey"
          class="w-60!"
          placeholder="请输入账号或姓名"
          clearable
          @keyup.enter="handleSearch"
          @clear="handleReset"
        />
        <el-button class="ml-3" type="primary" @click="handleSearch">
          <template #icon><IconEpSearch /></template>
          查询
        </el-button>
        <el-button @click="handleReset">
          <template #icon><IconEpRefresh /></template>
          重置
        </el-button>
      </div>
    </div>

    <div class="panel-card flex min-h-0 flex-1 flex-col">
      <div class="mb-4 flex items-center">
        <el-button type="danger" :disabled="!selectedRows.length" @click="handleBatchDelete">
          <template #icon><IconEpDelete /></template>
          批量删除
        </el-button>
        <el-button type="primary" @click="handleAdd">
          <template #icon><IconEpPlus /></template>
          新增
        </el-button>
      </div>

      <ProTable
        auto-height
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :columns="columns"
        :data="tableData"
        :loading="loading"
        :total="total"
        paginated
        @selection-change="handleSelectionChange"
      >
        <template #avatar="{ row }">
          <el-avatar :src="resolveFileUrl(row.avatar)" :size="34">
            <IconEpUser />
          </el-avatar>
        </template>

        <template #status="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'danger'">
            {{ row.statusName }}
          </el-tag>
        </template>

        <template #roles="{ row }">
          <el-tag v-for="role in row.sysRoleUsers" :key="role.roleId" class="mr-1">
            {{ role.roleName }}
          </el-tag>
        </template>

        <template #action="{ row }">
          <el-button
            v-if="row.isDelHandle !== false"
            type="primary"
            link
            @click="handleEdit(row)"
            :disabled="!row._disabled"
          >
            编辑
          </el-button>
          <el-button
            v-if="row.isDelHandle !== false"
            type="danger"
            link
            @click="handleDelete([row.id], row.name)"
            :disabled="!row._disabled"
          >
            删除
          </el-button>
        </template>
      </ProTable>
    </div>
  </div>
  <UserForm ref="userFormRef" @success="handleSuccess" />
</template>

<style lang="scss" scoped></style>
