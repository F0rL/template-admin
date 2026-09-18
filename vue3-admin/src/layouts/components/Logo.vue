<script setup lang="ts">
import { useAppStore } from '@/stores/modules/app'
import { useRouter } from 'vue-router'
import { config } from '@/config'

const appStore = useAppStore()
const router = useRouter()
</script>

<template>
  <div
    class="flex h-14 cursor-pointer items-center justify-center overflow-hidden bg-white px-2 transition-all duration-300"
    @click="router.push('/')"
  >
    <div class="flex min-w-0 items-center gap-3">
      <div
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-blue-500 to-blue-600 shadow-md"
      >
        <span class="text-sm font-bold text-white">{{ config.APP_TITLE.slice(0, 1) }}</span>
      </div>
      <span
        v-show="!appStore.sidebarIconOnly"
        class="text-base font-semibold whitespace-nowrap text-slate-700"
      >
        {{ config.APP_TITLE }}
      </span>
    </div>
  </div>
</template>
