# AGENTS.md — vue3-admin 前端（admin-template）

通用后台管理骨架，用于派生新的后台项目。内置：登录（账号密码）、系统管理全套（用户/角色/菜单/组织/日志/文件）、dashboard 图表示例、HTTP/utils/encrypt/mock/icons/layouts/stores 等共享层、ProTable/SelectIcon 共享组件、`gen:api` 接口生成脚本。不含业务模块，历史业务代码从 git 历史追溯。

技术栈：Vue 3.5（TypeScript）+ Vite 8 + Pinia 4 + Vue Router 5 + Element Plus 2 + Tailwind CSS 4 + SCSS + @tanstack/vue-query。

## 硬约束

- 仅使用 `pnpm`（版本 >=10 <11，由 `packageManager` 强制）；验证基线：`pnpm lint` + `pnpm typecheck` 双绿。
- 仅修改与目标任务相关的代码；用户手动注释的代码不删除。
- Git 提交遵循 `docs/git.md`。
- 仅内置基础模块（auth/sys*）带 mock；新业务模块默认不使用 mock。

## 文档加载规则

按需加载，禁止一次性读完所有文档。编码任务只读索引表命中的文件；文档间不做跳转阅读。规则以 docs 文件为准，本文件仅作导航。

**文档同步**：改动导致下表任一主题的事实变化时（新增 Store、调整路由、变更配置、新增共享组件/工具函数、改动数据层/HTTP/mock 约定等），必须同步更新对应 `docs/*.md`，保证文档与代码一致。

## 规则索引

| 主题         | 文件                     | 何时读取                                     |
| ------------ | ------------------------ | -------------------------------------------- |
| 命令与验证   | docs/commands.md         | 任何编码任务开始前                           |
| 工程原则     | docs/principles.md       | 新增依赖、环境变量/配置、技术选型评估        |
| 架构         | docs/architecture.md     | 路由、Store、图标、样式、自动导入、ECharts   |
| 数据层       | docs/data-layer.md       | 新增/修改 API、vue-query、查询缓存           |
| HTTP 层      | docs/http.md             | 维护网络层本身（拦截器/错误处理/解包）       |
| 工具函数     | docs/utils.md            | 使用 utils 下工具函数                        |
| 共享组件     | docs/components.md       | 使用 ProTable / SelectIcon                   |
| 页面代码规范 | docs/page-conventions.md | 编写/修改 Vue 页面                           |
| Mock         | docs/mock.md             | 修改 mock/ 或切换 mock 与真实后端联调        |
| Git 提交规范 | docs/git.md              | 生成 commit 或提交前                         |
