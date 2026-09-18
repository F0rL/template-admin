# AGENTS.md — 仓库公共约束

前后端模板仓库。本文件只记录跨子项目通用的约束与目录导航；各子项目的约束、命令与实现细节见其目录下的 `AGENTS.md` 及其索引的主题文档。

## 文档体系与加载规则

文档为三级结构，按需加载，不要一次性读完所有文档：

1. **本文件**：公共约束 + 目录导航（对所有子项目始终生效）
2. **子项目 `AGENTS.md`**：项目硬约束 + 主题文档索引（进入某项目工作前必读）
3. **子项目 `docs/*.md`**：按主题拆分的详细约束（按索引表「何时读取」列按需加载）

开始编码任务前，先读任务所属子项目的 `AGENTS.md`，再按其规则索引表加载相关主题文档；各项目的规则索引表为最高优先级。

## 目录说明

| 路径 | 说明 |
|---|---|
| `fastify/` | 后端服务：Fastify 5 + TypeBox + Drizzle + better-auth + Redis，文档入口 [fastify/AGENTS.md](./fastify/AGENTS.md) |
| `vue3-admin/` | 前端管理台：Vue 3 + Vite + Pinia + Element Plus + Tailwind，文档入口 [vue3-admin/AGENTS.md](./vue3-admin/AGENTS.md) |
| `docker-compose.yml` | 本地基础设施：PostgreSQL 16（库 store）、Redis 7（密码 redis123）、MySQL 8（备用），端口仅绑定 127.0.0.1 |
| `README.md` | 项目简介（待补充） |

## 公共约束

### 工具链统一

- 包管理器一律使用 **pnpm**；Node >= 20（fastify 子项目要求 20/22 LTS）
- TypeScript：fastify 子项目为 ESM + NodeNext（相对导入必须带 `.js` 后缀）；两个子项目均为 strict
- ESLint 管质量、Prettier 管风格，职责分离；两个子项目的 lint/format 配置保持一致风格

### 任务纪律

- 仅修改与目标任务相关的代码，禁止顺手改动无关文件
- 用户手动注释的代码不要删除
- Git 提交信息使用中文，遵循 commit 规范，重要修改放在前面（约定见 `vue3-admin/.trae/rules/git-commit-message.md`）

### 文档同步纪律（强制）

任何会改变代码结构/架构/约定的改动（新增模块、调整分层、变更配置项、新增共享组件或工具函数等），必须同步更新对应子项目的 `AGENTS.md` 及其索引的 `docs/*.md`，保证文档与代码一致；发现文档描述与代码不符时，以代码为准并主动修正文档。

## 新增子项目的文档扩展步骤

1. 在子项目根新建 `AGENTS.md`：技术栈一行 + 项目特有硬约束（不重复本文件内容）+ 主题文档索引表（列：主题 / 文件 / 何时读取）
2. 详细约束按主题拆分到 `docs/*.md`，一篇一个主题，保证 AI 可按索引按需加载
3. 在本文件的「目录说明」与下方「子项目文档」表中登记新条目
4. 主题文档命名建议对齐已有子项目（如 commands / architecture），降低跨项目切换成本

## 子项目文档

| 项目 | 入口文档 | 主题文档目录 |
|---|---|---|
| fastify（后端） | [fastify/AGENTS.md](./fastify/AGENTS.md) | `fastify/docs/` |
| vue3-admin（前端） | [vue3-admin/AGENTS.md](./vue3-admin/AGENTS.md) | `vue3-admin/docs/` |
