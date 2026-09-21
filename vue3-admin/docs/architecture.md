# 架构

## 自动导入

- Element Plus API（`ElMessage`、`ElMessageBox`）自动注入，无需手动导入。
- Element Plus 组件自动导入，直接使用 `<el-button>` 等标签。
- 图标组件前缀 `Icon`（如 `<IconEpUser />`），无需手动注册。
- `vue`、`vue-router`、`pinia` 的自动导入已禁用，必须显式 `import`。

## Store 规范

- 全部使用 Setup 语法：`defineStore('id', () => { ... }, { persist: { pick: [...] } })`（pinia-plugin-persistedstate v4）。禁止 Options API。
- pinia 实例由 `src/stores/index.ts` 创建并默认导出，非组件代码（如 axios 拦截器）导入该实例以在 `<script setup>` 上下文之外使用 store。
- Store 列表：
  - **user** — `token`、`userInfo`、`isLoggedIn`、`roles`、`login`/`loadUserInfo`/`logout`/`resetToken`，persist `['token','userInfo']`
  - **permission** — `menuData`（后端返回）、`isRoutesLoaded`、`generateRoutes`/`resetRoutes`/`refreshMenu`，不 persist
  - **app** — `sidebarOpened`、`sidebarWithoutAnimation`、`sidebarIconOnly`、`device`、`size` 及 toggler，persist `['sidebarOpened','size']`

## 路由与侧边栏联动

侧边栏读取 `permissionStore.menuData`（后端 `fetchUserRightMenu()` 返回的菜单树）渲染，通过 `isMenuShow` 字段控制可见性。

`src/router/index.ts` 导出 `asyncRoutes`（按模块拆分至 `src/router/modules/`，含 `dashboard.ts`、`system.ts`）。`permissionStore.generateRoutes()` 从后端菜单收集允许的路径集合，过滤 `asyncRoutes` 后通过 `router.addRoute` 动态注册 Layout 路由。新增页面时在 `asyncRoutes` 中声明路由并设置 `meta.title`。

路由使用 `createWebHistory(config.BASE_URL)`，`config.BASE_URL` 与 Vite 的 `base` 均来自 `VITE_APP_BASE_URL`（`/admin/`）。

## Token 存储

Token 通过 `pinia-plugin-persistedstate` 持久化。storage key 格式为 `${config.STORAGE_NS}:${storeId}`，逻辑内联在 `src/stores/index.ts` 中。

## 动态图标必须使用 iconMap

静态标签 `<IconEpUser />` 由 `unplugin-vue-components` 自动解析。动态方式 `<component :is="iconMap[name]" />` 必须使用 `src/icons/index.ts` **默认导出**的 `iconMap`（`import iconMap from '@/icons'`）。

新增侧边栏菜单图标时在 `src/icons/ep.ts` 或 `src/icons/ri.ts` 同步添加 import 和映射条目。

## 样式体系（Tailwind CSS v4 + 设计 token）

- 样式优先使用 Tailwind 工具类；必要时可写 CSS/SCSS，但注意 Tailwind 优先级更高。
- 类名顺序由 `prettier-plugin-tailwindcss` 统一维护：`pnpm format` 或编辑器保存时自动按 Tailwind 规范顺序重排 `class`，无需手动调整。
- 使用 `@tailwindcss/vite` 插件，无 `tailwind.config.js` / `postcss.config.js`，主题通过 CSS 配置。
- `src/styles/theme.css` 是设计 token 唯一来源：`:root` 覆盖 `--el-color-primary` 等 Element Plus 变量。
- `src/styles/tailwind.css` 通过 `@import 'tailwindcss'` 引入工具类，`@theme` 将颜色 token 映射到 Element Plus CSS 变量（`--color-primary: var(--el-color-primary)` 等），使 `bg-primary` / `text-primary` 等工具类与主题保持运行时同步；另自定义 `@utility scroll-thin`（细滚动条）、`h-page`（页面主体内容高度，`calc(100vh - 3.5rem - 2rem)`，即视窗高度减去 header 与内容区 `p-4` 上下内边距，用于限制高度、内部独立滚动的布局）与 `panel-card`（内容块卡片，等价于 `rounded bg-white p-5 shadow-sm`，用于页面内容块的统一卡片样式）。
- `main.ts` 引入 `theme.css → tailwind.css → index.scss`；Element Plus 样式按需引入（`ElementPlusResolver({ importStyle: 'css' })`），其 `:root` 变量先于 `theme.css` 加载，保证 token 覆盖生效。
- 全局样式按主题拆分在 `src/styles/` 下，由 `index.scss` 聚合 `@use` 引入（仅作聚合入口，禁止直接堆积样式）：`base.scss`（基础 reset）、`element-plus.scss`（Element Plus 组件通用定制）、`el-tree.scss`（el-tree 组件全局美化）、`autofill.scss`（浏览器自动填充背景修正）。新增全局样式时按主题新建文件并在 `index.scss` 中 `@use`。

## sass-embedded

使用 `sass-embedded`（Vite 默认现代编译器 API）。SCSS 文件必须使用 `@use`/`@forward` 语法，不能使用 `@import`。

## 图表（ECharts + vue-echarts）

- 图表统一使用 `vue-echarts` 的 `<VChart>` 组件，页面内按需 `import VChart from 'vue-echarts'`（无需全局注册）。
- echarts 模块注册集中在 `src/lib/echarts.ts`（`echarts/core` 的 `use([...])`），由使用图表的页面引入（`import '@/lib/echarts'`），tree-shake 未用到的图表/组件，并保持 echarts 随页面懒加载。
- 新增图表类型时，在 `src/lib/echarts.ts` 的 `use([...])` 中追加对应 chart/component/renderer。
- 尺寸：外层容器给定高度，`<div class="h-72"><VChart autoresize /></div>`，组件以自带 `height:100%` 填充；`autoresize` 由 vue-echarts 内置 ResizeObserver 处理自适应。
- 注意：不要在 `<VChart>` 上使用 Tailwind 高度类——组件自带的无层 `x-vue-echarts{height:100%}` 会压过 `@layer utilities` 里的工具类，必须用外层容器定高（或内联 `style="height:..."`）。
- option 使用 `shallowRef` 定义，避免大对象深响应。
