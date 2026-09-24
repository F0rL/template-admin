# 工程原则

## React 19 基线

- 严格模式（StrictMode）常开：副作用双调用是预期行为，不得为绕过而移除。
- React Compiler 已启用（`@vitejs/plugin-react` 的 `compiler: true`，oxc 原生路线，无 Babel 转换层，见 ADR-0009 修订）：组件自动记忆化，**不手写 memo / useMemo / useCallback 做性能优化**（仅在外部系统订阅、非组件依赖等 Compiler 无法覆盖的场景使用 hooks）。
- 函数组件 + Hooks；禁止 class 组件。
- 禁止在 effect 体内同步调用 setState（eslint react-hooks/compiler 规则会报错）；数据获取用 react-query，派生数据直接在渲染期计算。

## React Router：declarative mode

- 统一使用 `useRoutes` 库模式（`src/router/index.tsx`），不引入 createBrowserRouter / RouterProvider。
- `route.lazy` 属性在 declarative mode 下**不生效且不报错**（实测静默空白）——页面分包一律用 `React.lazy` + `<Suspense>`（静态页由 AppRoutes 顶层承接，权限页由 DefaultLayout 内容区就近承接）。

## 状态管理分层

- **服务端数据**（请求、缓存、失效）→ @tanstack/react-query。
- **客户端状态**（会话、UI 偏好）→ Zustand；持久化经 `persist` 中间件 + `partialize` 只存数据不存 action，key 用 `storageKey('<id>')` 命名空间化。
- 不引入 Redux / MobX / Context 做全局状态。

## antd 6 惯用法

- 主题 token（主色等）唯一来源在 `src/theme/index.ts` 的 `antdTheme`（App.tsx 的 `ConfigProvider theme` 消费），改主题只改此文件。
- message / notification / modal / 全屏 loading 必须经 `@/utils/feedback`（App 上下文实例，主题与 locale 一致），禁止 antd 静态方法。
- Modal + Form 组合：受控 `open` + `destroyOnHidden` + `footer={null}`（提交按钮放 Form 内 htmlType submit），避免懒渲染下 useForm 连接时序问题。
- 留意 antd 6 弃用 API 迁移（如 `maskClosable` → `mask={{ closable: false }}`），console 警告需清零。
- 图标：静态场景直接 import 组件（`@ant-design/icons` 或 `~icons/ri/*`）；动态字符串图标走 `@/icons` 的 iconMap + `<DynamicIcon name>`。

## 样式

- 布局与排版优先 Tailwind 4 原子类；antd 主题相关的少量覆盖写 `src/styles/components.css`（类名前缀如 `.sidebar-menu`）。
- 用色单一来源：CSS 里**不写字面色值**，一律引用 `--ant-*`（需要透明度用 `color-mix()`）；工具类优先用语义类名（`text-text-secondary` / `bg-bg-container` / `border-border-lighter` / `bg-danger` 等），不要新引入 Tailwind 色阶。语义层与默认调色板覆盖见 `src/styles/tailwind.css`，决策见 ADR-0007。
- 映射 antd 变量的 `@theme` 块**必须带 `inline`**（`@theme inline`）：`--ant-*` 定义在 antd 组件根而非 `:root`，普通 `@theme` 的中间变量会在 `:root` 解析失败并向下继承为无效值，导致工具类失效（border 变黑）。
- 不新增 SCSS / CSS Modules。

## 配置与环境变量

- 环境变量必须以 `VITE_APP_` 前缀定义于 `.env` / `.env.development` / `.env.production`，经 `src/config/index.ts` 统一出口消费，禁止组件直接读 `import.meta.env`。

## 依赖

- 新增依赖需评估：体积（是否可 tree-shaking）、与 React 19 / Vite 8（Rolldown）兼容性、是否与现有库职责重叠（如日期只用 dayjs、请求只用 axios）。
- 大型依赖加入 `vite.config.ts` 的 `optimizeDeps.include`；新分包组参考 `build.rolldownOptions` 现有注释（分组按声明顺序竞争，react-vendor 必须最前）。
