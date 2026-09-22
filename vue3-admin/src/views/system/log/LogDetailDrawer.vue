<script setup lang="ts">
/**
 * 日志详情抽屉 — 请求日志 / 错误日志共用
 * 请求日志对接 SysLog/GetHttpLogEntity，错误日志对接 SysLog/GetErrorLogEntity
 */
import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import {
  logKeys,
  fetchHttpLogDetail,
  fetchErrorLogDetail,
  type LogRow,
} from '@/api/system/sysLog'

const props = defineProps<{ visible: boolean; row: LogRow | null; type: 'http' | 'error' }>()
const emit = defineEmits<{ 'update:visible': [v: boolean] }>()

const drawerVisible = computed({
  get: () => props.visible,
  set: v => emit('update:visible', v),
})

const { data: detail, isFetching } = useQuery({
  queryKey: computed(() =>
    props.row
      ? props.type === 'http'
        ? logKeys.httpDetail(props.row.id)
        : logKeys.errorDetail(props.row.id)
      : ['logs', 'none'],
  ),
  queryFn: ({ signal }) =>
    props.row
      ? props.type === 'http'
        ? fetchHttpLogDetail(props.row.id, signal)
        : fetchErrorLogDetail(props.row.id, signal)
      : Promise.resolve(null),
  enabled: () => !!props.visible && !!props.row,
  /** 日志详情不可变，缓存期内重复查看直接命中缓存 */
  staleTime: Infinity,
})

const isError = computed(() => props.type === 'error')
</script>

<template>
  <el-drawer
    v-model="drawerVisible"
    size="620px"
    direction="rtl"
    :with-header="false"
    destroy-on-close
  >
    <div class="flex h-full flex-col">
      <div class="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <div>
          <h2 class="text-lg font-semibold text-gray-800">
            {{ isError ? '错误日志详情' : '请求日志详情' }}
          </h2>
          <p class="mt-0.5 text-sm text-gray-400">
            #{{ detail?.id ?? props.row?.id }} · {{ detail?.actionName ?? props.row?.actionName }}
          </p>
        </div>
        <el-button link @click="drawerVisible = false">
          <template #icon><IconEpClose /></template>
        </el-button>
      </div>

      <div v-loading="isFetching" class="flex-1 overflow-y-auto px-6 py-4">
        <el-empty v-if="!isFetching && !detail" description="暂无日志数据" :image-size="60" />

        <template v-else>
          <el-descriptions :column="2" border class="log-desc">
            <el-descriptions-item label="事件名称">{{ detail?.actionName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="请求方式">
              <el-tag size="small" effect="plain">{{ detail?.method || '-' }}</el-tag>
            </el-descriptions-item>

            <el-descriptions-item label="响应状态">
              <el-tag
                :type="
                  detail?.statusCode && detail.statusCode >= 200 && detail.statusCode < 300
                    ? 'success'
                    : 'danger'
                "
                size="small"
              >
                {{ detail?.statusCode ?? '-' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="响应时长">{{ detail?.elapsed ?? '-' }} ms</el-descriptions-item>

            <el-descriptions-item label="调用人员">{{ detail?.userName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="用户ID">{{ detail?.userId || '-' }}</el-descriptions-item>

            <el-descriptions-item label="请求IP">{{ detail?.ipAddress || '-' }}</el-descriptions-item>
            <el-descriptions-item label="请求主机">{{ detail?.host || '-' }}</el-descriptions-item>

            <el-descriptions-item label="控制器">{{ detail?.controller || '-' }}</el-descriptions-item>
            <el-descriptions-item v-if="!isError" label="事件类型">{{
              detail?.actionType || '-'
            }}</el-descriptions-item>
            <el-descriptions-item v-else label="用户类型">{{
              detail?.userType ?? '-'
            }}</el-descriptions-item>

            <el-descriptions-item label="创建时间" :span="2">{{
              detail?.createTime || '-'
            }}</el-descriptions-item>

            <el-descriptions-item v-if="!isError" label="来源" :span="2">{{
              detail?.source || '-'
            }}</el-descriptions-item>
            <el-descriptions-item v-if="!isError" label="用户代理(UA)" :span="2">{{
              detail?.userAgent || '-'
            }}</el-descriptions-item>
          </el-descriptions>

          <div class="mt-4">
            <div class="mb-1 text-sm font-medium text-gray-700">接口地址</div>
            <div class="rounded bg-gray-50 px-3 py-2 text-sm break-all text-gray-700">
              {{ detail?.url || '-' }}
            </div>
          </div>

          <template v-if="isError">
            <div class="mt-4">
              <div class="mb-1 text-sm font-medium text-gray-700">错误信息</div>
              <pre
                class="max-h-60 overflow-auto rounded bg-red-50 px-3 py-2 text-sm break-all whitespace-pre-wrap text-red-600"
                >{{ detail?.message || '-' }}</pre>
            </div>
          </template>

          <template v-else>
            <div class="mt-4">
              <div class="mb-1 text-sm font-medium text-gray-700">请求参数</div>
              <pre
                class="max-h-40 overflow-auto rounded bg-gray-50 px-3 py-2 text-sm break-all whitespace-pre-wrap text-gray-700"
                >{{ detail?.queryString || '-' }}</pre>
            </div>
            <div class="mt-4">
              <div class="mb-1 text-sm font-medium text-gray-700">请求体</div>
              <pre
                class="max-h-60 overflow-auto rounded bg-gray-50 px-3 py-2 text-sm break-all whitespace-pre-wrap text-gray-700"
                >{{ detail?.body || '-' }}</pre>
            </div>
            <div class="mt-4">
              <div class="mb-1 text-sm font-medium text-gray-700">响应结果</div>
              <pre
                class="max-h-40 overflow-auto rounded bg-gray-50 px-3 py-2 text-sm break-all whitespace-pre-wrap text-gray-700"
                >{{ detail?.message || '-' }}</pre>
            </div>
          </template>
        </template>
      </div>
    </div>
  </el-drawer>
</template>

<style lang="scss" scoped>
.log-desc :deep(.el-descriptions__label) {
  width: 110px;
  color: #6b7280;
  font-weight: 500;
}
</style>
