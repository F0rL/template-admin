# 共享组件

| 组件          | 文件                                     | 用途                                                                                            |
| ------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------- |
| ProTable      | `src/components/ProTable/index.vue`      | 泛型配置驱动表格，支持 selection/expand/tag 列、valueEnum 字典、排序、分页。未声明的 el-table prop 与事件（`max-height`、`border`、`tree-props`、`default-expand-all`、`@selection-change` 等）经 attrs 透传给 el-table，内置默认 `stripe`、`row-key="id"`、灰底表头样式、`empty-text="暂无数据"`，均可被同名 attrs 覆盖。两种高度方案：① 列表页满高用 `auto-height`（根节点挂 `flex min-h-0 flex-1 flex-col` 并强制 `height="100%"`，纯 flex 拉伸）；② 弹窗等固定上限场景推荐直接透传 `max-height`（如 `calc(100vh - 380px)`，EP 官方滚动方案，零侵入，内容少时自然收缩） |
| SelectIcon    | `src/components/SelectIcon/index.vue`    | 图标选择器（popover + 双标签页），v-model 绑定图标字符串                                        |
