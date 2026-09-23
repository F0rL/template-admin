# ADR-0007：Tailwind 4 + antd token 样式体系

- 状态：已接受
- 日期：2026-09-23
- 关联：ADR-0002

## 背景

vue3-admin 样式体系：Tailwind CSS 4（`@tailwindcss/vite`，无 config 文件）+ 主题 token 唯一来源（theme.css 覆盖 EP 变量）+ `@theme` 将颜色映射到组件库运行时变量 + `h-page` / `panel-card` 两个核心 utility。React 版需同构此体系。

## 决策

- Tailwind CSS 4 + `@tailwindcss/vite`，主题经 CSS `@theme` 配置，无 `tailwind.config.js` / `postcss.config.js`。
- **token 源头**：`ConfigProvider theme`（antd 6 默认 CSS 变量模式）定义 `colorPrimary` 等 —— 取代 vue3-admin 的 `theme.css :root` 覆盖（React 惯用法）。
- `styles/tailwind.css` 的 `@theme` 将 `--color-primary` 等映射到 antd 运行时 CSS 变量（`--ant-color-primary` 等），`bg-primary` / `text-primary` 等工具类与主题运行时同步。
- 保留同名核心 utility：`h-page`（视窗高 − header − 内容 padding，列表满高布局）、`panel-card`（内容块卡片）。
- 全局覆盖样式按主题拆文件放 `src/styles/`，由 `index.css` 聚合（不堆积单文件）；**不引入 SCSS**。
- 类名顺序由 `prettier-plugin-tailwindcss` 统一维护。
- antd 组件定制优先用 `ConfigProvider theme.components` token，少量全局 CSS 兜底，不魔改 antd 内部类名。

## 理由

- 与 vue3-admin 样式心智同构：工具类优先、token 唯一来源、满高布局约定，派生项目体验一致。
- antd 6 变量化后，`@theme` 映射比 Element Plus 变量覆盖更直接。
- 样式体量小，纯 CSS + Tailwind 4 足够，避免 sass-embedded 依赖。

## 后果

- `styles/theme.css` 退化为 antd 变量的少量补丁位（仅必要时使用），token 主配置在 `App.tsx` 的 ConfigProvider。
- Tailwind preflight 与 antd 样式共存，个别冲突以最小覆盖处理（开放问题 #2，实施时验证）。

## 被否决的备选

- **:root CSS 变量覆盖（照搬 vue3-admin theme.css 方式）**：antd 有 ConfigProvider 官方入口，覆盖 CSS 属绕路。
- **sass-embedded + SCSS**：无必要依赖。
- **CSS Modules**：与「工具类优先」约定重复。
