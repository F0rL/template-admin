<template>
  <el-config-provider :locale="zhCn">
    <router-view />
    <VueQueryDevtools v-if="showDevtools" />
  </el-config-provider>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

const showDevtools = import.meta.env.VITE_APP_ENABLE_DEVTOOLS === 'true'

// 动态导入：showDevtools 为 false 时该 chunk 不生成，生产构建不打包 devtools
const VueQueryDevtools = showDevtools
  ? defineAsyncComponent(() => import('@tanstack/vue-query-devtools').then(m => m.VueQueryDevtools))
  : null
</script>
