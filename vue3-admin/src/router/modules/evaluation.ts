import type { RouteRecordRaw } from 'vue-router'

export default [
  {
    path: 'evaluation',
    name: 'Evaluation',
    component: () => import('@/views/evaluation/index.vue'),
    meta: { title: '追"锋"时刻' },
  },
  {
    path: 'parent-eval-list',
    name: 'ParentEvalList',
    component: () => import('@/views/parent-eval/index.vue'),
    meta: { title: '家长评价' },
  },
  {
    path: 'ranking-list',
    name: 'RankingList',
    component: () => import('@/views/ranking/index.vue'),
    meta: { title: '积分排行榜' },
  },
  {
    path: 'analysis-list',
    name: 'AnalysisList',
    component: () => import('@/views/analysis/index.vue'),
    meta: { title: '评价分析' },
  },
  {
    path: 'score-rule-list',
    name: 'ScoreRuleList',
    component: () => import('@/views/score-rule/index.vue'),
    meta: { title: '积分规则配置' },
  },
  {
    path: 'import-item-list',
    name: 'ImportItemList',
    component: () => import('@/views/import-item/index.vue'),
    meta: { title: '导入项管理' },
  },
] as RouteRecordRaw[]
