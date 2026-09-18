import type { RouteRecordRaw } from 'vue-router'

export default [
  {
    path: 'patrol/record',
    name: 'PatrolRecord',
    component: () => import('@/views/patrol/record/index.vue'),
    meta: { title: '巡查记录' },
  },
  {
    path: 'patrol/config',
    name: 'PatrolConfig',
    component: () => import('@/views/patrol/config/index.vue'),
    meta: { title: '巡查配置' },
  },
  {
    path: 'patrol/person',
    name: 'PatrolPerson',
    component: () => import('@/views/patrol/person/index.vue'),
    meta: { title: '巡查人管理' },
  },
] as RouteRecordRaw[]
