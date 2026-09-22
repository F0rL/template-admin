<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/vue-query'
import ProTable from '@/components/ProTable/index.vue'
import type { ProTableColumn } from '@/components/ProTable/index.vue'
import type { DepartmentTreeNode, OrgUserItem } from '@/api/system/wxWork'
import { orgKeys } from '@/api/system/wxWork'
import * as wxWorkApi from '@/api/system/wxWork'
import { message, withLoading } from '@/utils/feedback'

const queryClient = useQueryClient()

const searchKey = ref('')
const pageIndex = ref(1)
const pageSize = ref(10)
const currentDeptId = ref('')

// 部门树
const {
  data: deptTree,
  isPending: deptLoading,
  isSuccess: deptReady,
} = useQuery({
  queryKey: orgKeys.departments(),
  queryFn: ({ signal }) => wxWorkApi.fetchDepartmentTree(undefined, signal),
})

// 默认选中第一个部门后加载用户列表（无选中时不请求）
const {
  data: userListData,
  isFetching: userLoading,
  refetch,
} = useQuery({
  queryKey: [...orgKeys.users(), currentDeptId, pageIndex, pageSize],
  queryFn: ({ signal }) =>
    wxWorkApi.fetchOrgUserList(
      {
        departmentId: currentDeptId.value,
        searchKey: searchKey.value || undefined,
        page: pageIndex.value,
        row: pageSize.value,
      },
      signal,
    ),
  placeholderData: keepPreviousData,
  enabled: () => !!currentDeptId.value,
})

const tableData = computed(() => userListData.value?.message ?? [])
const total = computed(() => userListData.value?.total ?? 0)

const treeDefaultExpandedKeys = computed(() => {
  if (deptTree.value?.length) {
    return [deptTree.value[0].id]
  }
  return []
})

const columns: ProTableColumn<OrgUserItem>[] = [
  { prop: 'userid', label: '工号', width: 360 },
  { prop: 'name', label: '姓名', width: 80 },
  { label: '部门', slot: 'department' },
  { prop: 'mobile', label: '手机号' },
  { label: '性别', slot: 'gender', width: 80 },
  { prop: 'position', label: '职务' },
]

/** 点击部门树节点 */
function handleNodeClick(data: DepartmentTreeNode) {
  currentDeptId.value = data.id
  pageIndex.value = 1
}

/** 部门树加载完成后默认选中根节点 */
function handleDeptTreeReady() {
  if (deptTree.value?.length && !currentDeptId.value) {
    currentDeptId.value = deptTree.value[0].id
  }
}

watch(deptTree, handleDeptTreeReady, { immediate: true })

/** 搜索 */
function handleSearch() {
  if (pageIndex.value === 1) refetch()
  else pageIndex.value = 1
}

/** 重置 */
function handleReset() {
  searchKey.value = ''
  if (pageIndex.value === 1) refetch()
  else pageIndex.value = 1
}

/** 刷新缓存 */
async function handleRefresh() {
  await withLoading(wxWorkApi.refreshOrgUsers(), '刷新中...')
  message.success('缓存刷新成功')
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: orgKeys.departments() }),
    queryClient.invalidateQueries({ queryKey: orgKeys.users() }),
  ])
}
</script>

<template>
  <div class="h-page flex gap-4">
    <!-- 左侧部门树 -->
    <div class="panel-card flex h-full min-h-0 w-60 shrink-0 flex-col">
      <div class="mb-3 flex shrink-0 items-center gap-2">
        <span class="text-text-primary text-sm font-semibold">组织架构</span>
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto">
        <el-tree
          v-if="deptReady && deptTree?.length"
          :data="deptTree"
          :props="{ children: 'children', label: 'name' }"
          node-key="id"
          :default-expanded-keys="treeDefaultExpandedKeys"
          highlight-current
          @node-click="handleNodeClick"
        >
          <template #default="{ data }">
            <span class="flex items-center gap-1.5">
              <IconEpOfficeBuilding />
              <span>{{ data.name }}</span>
            </span>
          </template>
        </el-tree>
        <el-skeleton v-else-if="deptLoading" :rows="6" animated />
        <span v-else class="text-text-placeholder text-sm">暂无部门数据</span>
      </div>
    </div>

    <!-- 右侧成员列表 -->
    <div class="panel-card flex min-h-0 min-w-0 flex-1 flex-col">
      <!-- 操作栏 -->
      <div class="mb-4 flex shrink-0 items-center justify-between">
        <div class="flex items-center">
          <el-input
            v-model="searchKey"
            class="w-60!"
            placeholder="请输入姓名或工号"
            clearable
            @keyup.enter="handleSearch"
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
        <el-button @click="handleRefresh">
          <template #icon><IconEpRefresh /></template>
          刷新缓存
        </el-button>
      </div>

      <!-- 表格 -->
      <div class="flex min-h-0 flex-1 flex-col">
        <ProTable
          v-model:current-page="pageIndex"
          v-model:page-size="pageSize"
          auto-height
          :columns="columns"
          :data="tableData"
          :loading="userLoading"
          :total="total"
          paginated
        >
          <template #department="{ row }">
            {{ row.department[0]?.name }}
          </template>
          <template #gender="{ row }">
            {{ row.genderText }}
          </template>
        </ProTable>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
