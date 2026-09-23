# ADR-0013：工具链与质量基线

- 状态：已接受
- 日期：2026-09-23
- 关联：ADR-0001、ADR-0009

## 背景

vue3-admin 当前工具带：pnpm 10（packageManager 强制）+ ESLint 10（flat config）+ TypeScript ~6.0 + typescript-eslint 8.x + Prettier（含 tailwindcss 插件），验证基线 `pnpm lint` + `pnpm typecheck` 双绿。react-admin 与其同版本带，降低双栈维护成本。

## 决策

- **包管理**：仅 pnpm（版本 >=10 <11，`packageManager` + `devEngines` 强制）。
- **TypeScript**：~6.0，strict 开启。
- **ESLint 10 flat config**：`@eslint/js` + `typescript-eslint ^8.70`（**非 type-checked 档**，lint 速度优先，与 vue3-admin 现状对齐）+ `eslint-plugin-react-hooks ^7.1`（recommended，含 compiler 规则）+ `eslint-plugin-react-refresh`。
- **Prettier**：`prettier` + `prettier-plugin-tailwindcss`（类名排序，`pnpm format` / 保存时生效）。
- **React 19**：StrictMode 开启。
- **验证基线**：`pnpm lint` + `pnpm typecheck`（tsc --noEmit）双绿；浏览器验收 `http://localhost:4001/react-admin/`。
- **文档体系**：三级结构（根 AGENTS.md → 项目 AGENTS.md 硬约束+索引 → docs/*.md 主题细则），与 vue3-admin 同构；**文档同步规则**——改动导致主题事实变化（新增 store、调整路由、变更配置、新增共享组件/工具、改动 HTTP/mock 约定）必须同步对应 docs/*.md。
- **Git 提交**：遵循 `docs/git.md`（中文提交信息，遵循 commit 规范，重要修改在前）。

## 理由

- 与 vue3-admin 同版本带（ESLint 10 / TS 6 / pnpm 10 / Prettier）双栈心智与 CI 配置一致。
- typescript-eslint 8.70 明确支持 ESLint 10 与 TS 6.0。
- gen:api 生成器暂缓（用户访谈结论），API 文件手写；等 fastify OpenAPI 稳定后与 vue3-admin 一并评估。

## 后果

- 项目 AGENTS.md 在 Phase 1 收尾时生成，规则索引表为最高优先级。

## 被否决的备选

- **type-checked lint 档**：lint 速度影响明显，与 vue3-admin 现状（strict 清理完成后评估）对齐，暂不启用。
- **husky / lint-staged / commitlint**：团队协作人数增加或提交规范频繁被破坏时再引入（与 vue3-admin「已评估暂缓」一致）。
- **测试体系（Vitest/Playwright）**：派生首个真实业务项目或共享层大重构时再引入（与 vue3-admin 一致）。
