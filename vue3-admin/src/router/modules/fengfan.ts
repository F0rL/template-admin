import type { RouteRecordRaw } from 'vue-router'

export default [
  {
    path: 'ff-recognition-list',
    name: 'FfRecognitionList',
    component: () => import('@/views/fengfan/recognition.vue'),
    meta: { title: '锋范认定记录' },
  },
  {
    path: 'ff-star-list',
    name: 'FfStarList',
    component: () => import('@/views/fengfan/star.vue'),
    meta: { title: '五星锋范少年' },
  },
] as RouteRecordRaw[]
