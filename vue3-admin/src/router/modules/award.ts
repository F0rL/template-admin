import type { RouteRecordRaw } from 'vue-router'

export default [
  {
    path: 'award-list',
    name: 'AwardList',
    component: () => import('@/views/award/index.vue'),
    meta: { title: '奖证库' },
  },
  {
    path: 'award-stats',
    name: 'AwardStats',
    component: () => import('@/views/award/stats.vue'),
    meta: { title: '获奖统计' },
  },
] as RouteRecordRaw[]
