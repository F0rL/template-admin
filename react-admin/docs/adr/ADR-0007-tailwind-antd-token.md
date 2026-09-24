# ADR-0007：Tailwind 4 + antd token 样式体系

- 状态：已接受
- 日期：2026-09-23
- 关联：ADR-0002

## 背景

vue3-admin 样式体系：Tailwind CSS 4（`@tailwindcss/vite`，无 config 文件）+ 主题 token 唯一来源（theme.css 覆盖 EP 变量）+ `@theme` 将颜色映射到组件库运行时变量 + `h-page` / `panel-card` 两个核心 utility。React 版需同构此体系。

## 决策

- Tailwind CSS 4 + `@tailwindcss/vite`，主题经 CSS `@theme` 配置，无 `tailwind.config.js` / `postcss.config.js`。
- **token 源头（唯一来源）**：`src/theme/index.ts` 的 `antdTheme`（`ConfigProvider theme`，antd 6 默认 CSS 变量模式）定义 `colorPrimary` 等 seed token 与 `components` 组件 token —— 取代 vue3-admin 的 `theme.css :root` 覆盖（React 惯用法）。改主题只改此文件。
- `styles/tailwind.css` 的 `@theme inline` **只做映射、不写字面色值**，一律 `var(--ant-*)` 引用，因此自动跟随主题：
  - **必须用 `inline`**：`--ant-*` 由 antd 下发在组件根（`.css-var-*` 类）而非 `:root`。普通 `@theme` 会生成 `:root { --color-x: var(--ant-x) }` 的中间变量，`:root` 上取不到 `--ant-*` 时该变量成为「保证无效值」并向下继承，工具类整条声明失效（表现为 border 回退 `currentColor` 变黑）。
  - **语义映射层**：text / bg / border / fill / status 五类各梯度，供业务直接使用（`text-text-secondary`、`bg-bg-container` 等）；新增用色优先在此挑选，不新增变量。
  - **默认调色板覆盖**：把业务已使用的 Tailwind 原生色阶（`--color-white` / `--color-gray-*` / `--color-slate-*` / `--color-blue-*` 等）指向 antd 语义 token，使既有类名随主题（含暗色算法）切换。
- 保留同名核心 utility：`h-page`（视窗高 − header − 内容 padding，列表满高布局）、`panel-card`（内容块卡片）。
- 全局覆盖样式按主题拆文件放 `src/styles/`，由 `index.css` 聚合（不堆积单文件）；**不引入 SCSS**。
- 类名顺序由 `prettier-plugin-tailwindcss` 统一维护。
- antd 组件定制优先用 `antdTheme.components` 组件 token，少量全局 CSS 兜底，不魔改 antd 内部类名。

## 理由

- 与 vue3-admin 样式心智同构：工具类优先、token 唯一来源、满高布局约定，派生项目体验一致。
- antd 6 变量化后，`@theme` 映射比 Element Plus 变量覆盖更直接。
- 单一来源可验证：Tailwind 侧只出现 `var(--ant-*)`，出现字面色值即为破约；改主色只需改 `src/theme/index.ts` 一处。
- 覆盖默认调色板可避免业务代码写出不随主题变化的硬编码色（原实现存在 46 处此类类名）。
- 样式体量小，纯 CSS + Tailwind 4 足够，避免 sass-embedded 依赖。

## 后果

- `styles/theme.css` 退化为 antd 变量的少量补丁位（仅必要时使用），token 主配置在 `src/theme/index.ts`。
- 默认调色板语义被重定义：`bg-white` 等为「容器背景」而非纯白，装饰性/语义冲突用色改用语义类名（如反白文字用 `text-text-inverse`），不得新增字面色值（需要透明度用 `color-mix()` 引用 `--ant-*`）。
- 覆盖范围只含业务实际用到的档位；未覆盖的色阶仍是 Tailwind 默认值，新增用色应走语义层而非色阶。
- `--ant-*` 变量作用域在 antd 组件根（`.css-var-*` 类，当前由顶层 `<AntdApp>` 提供），因此语义类/色阶类必须在 antd 组件子树内使用；antd 子树外手工 portal 会取不到变量。
- Tailwind preflight 与 antd 样式共存，个别冲突以最小覆盖处理（开放问题 #2，实施时验证）。

## 被否决的备选

- **:root CSS 变量覆盖（照搬 vue3-admin theme.css 方式）**：antd 有 ConfigProvider 官方入口，覆盖 CSS 属绕路。
- **sass-embedded + SCSS**：无必要依赖。
- **CSS Modules**：与「工具类优先」约定重复。
- **构建期用 `theme.getDesignToken()` 生成 `@theme`**：可做到零映射维护，但需新增生成脚本与产物、与 antd 版本耦合，且动态换肤仍需回落 `var()`；当前映射量可控，暂不引入。
- **第三方 `tailwind-preset-antd`（`@plugin` + `AntdTokenCssVar`）**：零映射但需新增运行时依赖、类名风格改为 `bg-colorPrimary`，与现有语义命名不一致，暂不引入。
