# AGENTS.md — react-admin 前端（react-admin-template）

React 后台管理范本，用于派生新的 React 后台项目。与 vue3-admin（Vue 版）互为独立对等物：目录、代码、文档完全独立，不共享任何文件。内置：登录（账号密码 + 扫码 tab）、系统管理全部 6 个页面（**dashboard / 账户 / 角色 / 菜单 / 组织架构 / 日志均已实现**，账户管理作为列表页模板）、错误页、HTTP/queryClient/stores/icons/layouts 等共享层、共享组件（ProTable / useDialogForm）、mock 完整登录链路与系统管理各页面链路。不含业务模块。

技术栈：React 19（TypeScript）+ Vite 8（Rolldown）+ antd 6 + React Router 8（useRoutes 库模式）+ Zustand 5 + @tanstack/react-query 5 + Tailwind CSS 4 + React Compiler。

## 硬约束

- 仅使用 `pnpm`（版本 >=10 <11，由 `packageManager` + `devEngines` 强制）；验证基线：`pnpm lint` + `pnpm typecheck` 双绿。
- 仅修改与目标任务相关的代码；用户手动注释的代码不删除。
- React Router 使用 **declarative mode（useRoutes）**，不引入 createBrowserRouter；页面分包用 React.lazy + Suspense（`route.lazy` 属性在库模式下不生效，禁止使用）。
- 路由模块（`src/router/modules/`）已对 react-refresh 规则豁免（lazy 常量 + 路由数组导出共存属预期）。
- antd 反馈类能力（message/notification/modal.confirm/loading）一律经 `@/utils/feedback`，禁止直接使用 antd 静态方法。
- Phase 1 仅 auth 模块带 mock；系统管理域 mock 随对应页面落地（已实现页面的 mock 见 `docs/mock.md`）。
- 本目录与 vue3-admin 完全独立：不得互相引用文件，改写法时遵循 React 惯用法而非翻译 Vue 代码。
- 谨慎启动服务使用网页进行调试，只有在必要时才使用浏览器页面进行校验

## 文档加载规则

按需加载，禁止一次性读完所有文档。编码任务只读索引表命中的文件；文档间不做跳转阅读。规则以 docs 文件为准，本文件仅作导航。

**文档同步**：改动导致下表任一主题的事实变化时（新增 Store、调整路由、变更配置、新增共享工具、改动数据层/HTTP/mock 约定等），必须同步更新对应 `docs/*.md`，保证文档与代码一致。

## 规则索引

| 主题         | 文件                     | 何时读取                                        |
| ------------ | ------------------------ | ----------------------------------------------- |
| 命令与验证   | docs/commands.md         | 任何编码任务开始前                              |
| 工程原则     | docs/principles.md       | 新增依赖、环境变量/配置、技术选型评估           |
| 架构         | docs/architecture.md     | 路由、Store、布局、图标、样式、Provider         |
| 数据层       | docs/data-layer.md       | 新增/修改 API、react-query、查询缓存            |
| HTTP 层      | docs/http.md             | 维护网络层本身（拦截器/错误处理/解包）          |
| 工具函数     | docs/utils.md            | 使用 utils / icons 下工具函数                   |
| Mock         | docs/mock.md             | 修改 mock/ 或切换 mock 与真实后端联调           |
| Git 提交规范 | docs/git.md              | 生成 commit 或提交前                            |
| 页面代码规范 | docs/page-conventions.md | 编写/修改页面（列表页模板、高度布局、弹窗表单） |
| 共享组件     | docs/components.md       | 使用 ProTable / useDialogForm                   |

设计资产（常驻，与上述主题文档平级）：

- `docs/design.md`：总体设计与 Phase 划分
- `docs/glossary.md`：术语表
- `docs/adr/`：架构决策记录（ADR-0001 ~ ADR-0013），改架构前先查对应 ADR
