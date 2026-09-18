<template>
  <div class="flex h-screen w-screen bg-gray-100">
    <!-- Sidebar -->
    <aside
      class="flex h-full flex-col border-r border-gray-200 bg-white transition-all duration-300"
      :class="sidebarWidthClass"
    >
      <Logo />
      <Sidebar />
    </aside>

    <!-- Right content -->
    <div class="flex min-w-0 flex-1 flex-col">
      <Header />
      <main class="flex-1 overflow-auto p-4">
        <router-view v-slot="{ Component, route: r }">
          <transition name="fade-slide" mode="out-in">
            <div :key="r.fullPath" class="">
              <component :is="Component" />
            </div>
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/stores/modules/app'
import Logo from '../components/Logo.vue'
import Sidebar from '../components/Sidebar.vue'
import Header from '../components/Header.vue'

const appStore = useAppStore()

const sidebarWidthClass = computed(() => {
  if (!appStore.sidebarOpened) return 'w-0 overflow-hidden'
  return appStore.sidebarIconOnly ? 'w-16' : 'w-56'
})
</script>

<style scoped>
.fade-slide-enter-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-slide-leave-active {
  transition: all 0.14s cubic-bezier(0.4, 0, 1, 1);
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(6px) scale(0.98);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.99);
}
</style>
