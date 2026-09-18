<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuery, keepPreviousData } from '@tanstack/vue-query'
import ProTable from '@/components/ProTable/index.vue'
import type { ProTableColumn } from '@/components/ProTable/index.vue'
import {
  fetchHttpLogList,
  fetchErrorLogList,
  logKeys,
  type LogRow,
  type LogListParams,
} from '@/api/system/sysLog'
import LogDetailDrawer from './LogDetailDrawer.vue'

type LogType = 'http' | 'error'

const logType = ref<LogType>('http')
const searchKey = ref('')
const pageIndex = ref(1)
const pageSize = ref(10)
const dateRange = ref<[string, string] | null>(null)

const detailVisible = ref(false)
const currentRow = ref<LogRow | null>(null)
const currentType = ref<LogType>('http')

const {
  data: listRes,
  isFetching: loading,
  refetch,
} = useQuery({
  queryKey: computed(() => [
    ...logKeys.all,
    logType.value,
    pageIndex.value,
    pageSize.value,
    searchKey.value,
    dateRange.value,
  ]),
  queryFn: ({ signal }) => {
    const params: LogListParams = {
      page: pageIndex.value,
      rows: pageSize.value,
      searchKey: searchKey.value || undefined,
      startTime: dateRange.value?.[0] || undefined,
      endTime: dateRange.value?.[1] || undefined,
    }
    return logType.value === 'http'
      ? fetchHttpLogList(params, signal)
      : fetchErrorLogList(params, signal)
  },
  placeholderData: keepPreviousData,
})

const tableData = computed<LogRow[]>(() => (listRes.value?.list ?? []) as LogRow[])
const total = computed(() => listRes.value?.total ?? 0)

const columns = computed<ProTableColumn<LogRow>[]>(() => {
  const base: ProTableColumn<LogRow>[] = [
    { prop: 'actionName', label: '操作名称', minWidth: 120, showOverflowTooltip: true },
    { prop: 'url', label: '接口地址', minWidth: 220, showOverflowTooltip: true },
    { prop: 'method', label: '请求类型', align: 'center', width: 100 },
    { prop: 'statusCode', label: '状态码', align: 'center', width: 90, slot: 'statusCode' },
    { prop: 'ipAddress', label: '客户端IP', align: 'center', minWidth: 150 },
    { prop: 'userName', label: '调用人员', align: 'center', width: 110 },
    { prop: 'createTime', label: '请求时间', align: 'center', width: 170 },
    { prop: 'elapsed', label: '响应时长(ms)', align: 'center', width: 120 },
    { label: '操作', align: 'center', width: 90, slot: 'actions', fixed: 'right' },
  ]
  if (logType.value === 'error') {
    base.splice(5, 0, {
      prop: 'message',
      label: '错误信息',
      minWidth: 200,
      showOverflowTooltip: true,
    })
  }
  return base
})

const disabledDate = (date: Date) => date.getTime() > Date.now()

/** 切换日志类型，重置到第一页 */
function handleTypeChange() {
  if (pageIndex.value === 1) refetch()
  else pageIndex.value = 1
}

/** 查询 */
function handleSearch() {
  if (pageIndex.value === 1) refetch()
  else pageIndex.value = 1
}

/** 重置 */
function handleReset() {
  searchKey.value = ''
  dateRange.value = null
  if (pageIndex.value === 1) refetch()
  else pageIndex.value = 1
}

/** 查看详情 */
function openDetail(row: LogRow) {
  currentRow.value = row
  currentType.value = logType.value
  detailVisible.value = true
}
</script>

<template>
  <div class="flex h-page flex-col">
    <!-- 搜索筛选区 -->
    <div class="panel-card mb-4 shrink-0">
      <el-form class="g-filter-form" label-width="80px">
        <el-row :gutter="16" class="gap-y-4">
          <el-col :span="8">
            <el-form-item label="日志类型">
              <el-select v-model="logType" class="!w-full" @change="handleTypeChange">
                <el-option label="请求日志" value="http" />
                <el-option label="错误日志" value="error" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="关键字">
              <el-input
                v-model="searchKey"
                placeholder="地址/人员/IP"
                clearable
                @keyup.enter="handleSearch"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="日期范围">
              <el-date-picker
                v-model="dateRange"
                type="daterange"
                value-format="YYYY-MM-DD"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                :disabled-date="disabledDate"
                :editable="false"
                class="!w-full"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8" :offset="8">
            <el-form-item>
              <div class="flex w-full justify-end">
                <el-button type="primary" @click="handleSearch">
                  <template #icon><IconEpSearch /></template>
                  查询
                </el-button>
                <el-button @click="handleReset">
                  <template #icon><IconEpRefresh /></template>
                  重置
                </el-button>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </div>

    <!-- 表格区 -->
    <div class="panel-card flex min-h-0 flex-1 flex-col">
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
        <template #statusCode="{ row }">
          <el-tag
            :type="
              row.statusCode != null && row.statusCode >= 200 && row.statusCode < 300
                ? 'success'
                : 'danger'
            "
          >
            {{ row.statusCode ?? '-' }}
          </el-tag>
        </template>
        <template #actions="{ row }">
          <el-button type="primary" link @click="openDetail(row)"> 查看 </el-button>
        </template>
      </ProTable>
    </div>
  </div>
  <LogDetailDrawer v-model:visible="detailVisible" :row="currentRow" :type="currentType" />
</template>

<style lang="scss" scoped></style>
