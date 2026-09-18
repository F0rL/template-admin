import type { RouteRecordRaw } from 'vue-router'

export default [
  {
    path: 'student-list',
    name: 'StudentList',
    component: () => import('@/views/student/index.vue'),
    meta: { title: '学生管理' },
  },
  {
    path: 'student-report',
    name: 'StudentReport',
    component: () => import('@/views/student/report.vue'),
    meta: { title: '学生成长报告', activeMenu: 'student-list' },
  },
] as RouteRecordRaw[]
