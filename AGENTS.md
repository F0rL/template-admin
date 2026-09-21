# AGENTS.md — 仓库公共约束

前后端模板仓库。本文件只记录跨子项目通用的约束与目录导航；各子项目的约束、命令与实现细节见其目录下的 `AGENTS.md` 及其索引的主题文档。

## 文档体系与加载规则

文档为三级结构，按需加载，不要一次性读完所有文档：

1. **本文件**：公共约束 + 目录导航（对所有子项目始终生效）
2. **子项目 `AGENTS.md`**：项目硬约束 + 主题文档索引（进入某项目工作前必读）
3. **子项目 `docs/*.md`**：按主题拆分的详细约束（按索引表「何时读取」列按需加载）

开始编码任务前，先读任务所属子项目的 `AGENTS.md`，再按其规则索引表加载相关主题文档；各项目的规则索引表为最高优先级。

## 目录说明

| 路径                 | 说明                                                                                                                                                                                            |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fastify/`           | 后端服务：Fastify 5 + TypeBox + Drizzle + better-auth + Redis，文档入口 [fastify/AGENTS.md](./fastify/AGENTS.md)                                                                                |
| `vue3-admin/`        | 前端后台骨架（admin-template）：Vue 3 + Vite + Pinia + Element Plus + Tailwind，内置登录/系统管理/dashboard 示例等基础能力，无业务模块，文档入口 [vue3-admin/AGENTS.md](./vue3-admin/AGENTS.md) |
| `docker-compose.yml` | 本地基础设施：PostgreSQL 16（库 store）、Redis 7（密码 redis123）、MySQL 8（备用），端口仅绑定 127.0.0.1                                                                                        |
| `README.md`          | 项目简介（待补充）                                                                                                                                                                              |

## 子项目文档

| 项目                   | 入口文档                                       | 主题文档目录       |
| ---------------------- | ---------------------------------------------- | ------------------ |
| fastify（后端）        | [fastify/AGENTS.md](./fastify/AGENTS.md)       | `fastify/docs/`    |
| vue3-admin（前端骨架） | [vue3-admin/AGENTS.md](./vue3-admin/AGENTS.md) | `vue3-admin/docs/` |
