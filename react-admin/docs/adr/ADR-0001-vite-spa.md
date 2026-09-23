# ADR-0001：Vite 8 + React 19 SPA 构建形态

- 状态：已接受
- 日期：2026-09-23
- 关联：ADR-0007、ADR-0008、ADR-0013

## 背景

react-admin 定位为与 vue3-admin 互为独立对等的后台范本，服务同一 fastify 后端。vue3-admin 的形态是：Vite SPA + 构建产物静态托管 + dev-server 中间件拦截 mock + 后端菜单驱动路由。访谈第一轮确认保持形态对等。

## 决策

- 使用 Vite 8（Rolldown 内核）+ `@vitejs/plugin-react` 6（Oxc React Refresh）构建 **React 19 SPA**。
- dev 端口 `4001`，路由 basename 与 Vite `base` 均为 `VITE_APP_BASE_URL` = `/react-admin/`（与 vue3-admin 的 `4000 + /admin/` 命名对仗，两项目可同时运行）。
- `/api` 请求经 Vite proxy 转发至 fastify，与 vue3-admin 相同。
- 构建产物纯静态文件，由 nginx / 后端静态托管部署。

## 理由

- 形态对等使两模板可互为参照，派生项目心智一致。
- Vite 8 为当前稳定主线，plugin-react 6 专为 Vite 8 设计。
- 后台管理无 SEO/首屏诉求，SSR 能力无收益。

## 后果

- 不具备 SSR / 流式渲染能力（后台场景不需要）。
- dev server 配置（mock 插件、proxy、base、端口）与 vue3-admin 保持结构相似，便于双栈维护。

## 被否决的备选

- **Next.js App Router**：React 官方主推，但 SSR/文件路由与「后端菜单驱动 + dev mock 拦截」形态冲突，部署与联调方式改变，两模板不可互为参照。
- **TanStack Start**：全栈类型安全但成熟度与生态尚不足，作为范本风险高。
