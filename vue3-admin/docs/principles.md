# 工程原则

## 优先使用成熟的第三方包

在编写自定义代码前，先检查是否有维护良好的社区包已解决该问题（日期→`dayjs`、工具函数→`@vueuse/core`、图表→`echarts`、加密→`node-forge`）。不要从零构建事件总线、防抖/节流、剪贴板、全屏、暗色模式切换或 localStorage 封装——`@vueuse/core` 已覆盖。

## 路径别名

`@` → `src/`（`vite.config.ts` 和 `tsconfig.json` 均已配置）。

## 环境变量与配置

`src/config/index.ts` 提供类型化的 `config` 对象，统一读取 `.env*` 中的 `VITE_APP_*` 变量。全局通过 `config.XXX` 访问，禁止直接写 `import.meta.env.VITE_APP_*`：

| 字段           | 来源                          | 说明                                   |
| -------------- | ----------------------------- | -------------------------------------- |
| `BASE_URL`     | `VITE_APP_BASE_URL`           | 路由 basename / Vite `base`            |
| `API_BASE_URL`     | dev 固定 `/api`（走 Vite 代理）；prod 为 `VITE_APP_BASE_API` + `/api` | axios 请求 baseURL                     |
| `FILE_BASE_URL`| `VITE_APP_BASE_API`           | 文件源站，拼接后端相对路径（avatar 等）|
| `APP_TITLE`    | `VITE_APP_TITLE`              | 应用标题                               |
| `STORAGE_NS`   | `VITE_APP_STORAGE_NS`         | localStorage 命名空间                  |

新增环境变量时，先在 `src/config/index.ts` 补类型与映射，再通过 `config.XXX` 消费。

## 已评估并暂缓的事项

引入这些能力前先阅读对应触发条件，避免重复评审：

| 事项 | 回访触发条件 |
| ---- | ------------ |
| 测试体系（Vitest/Playwright） | 派生首个真实业务项目，或共享层（utils/ProTable）大重构 |
| gen:api 生成器解析响应类型 | fastify OpenAPI 文档稳定后 |
| Git 提交钩子（husky/lint-staged/commitlint） | 团队协作人数增加或提交规范频繁被破坏 |
| Vue 3.6 升级 | 正式版发布（Vapor Mode 官方仍 unstable） |
| Vite 8.1 bundled dev mode | 官方转稳定 |
| ESLint type-checked 档 | strict 清理完成后评估 lint 速度影响 |
| 密码传输契约定稿 | fastify 实现 Auth 接口时（现状：登录 md5Hash、改密 RSA、可候选统一 RSA/Base64/HTTPS 明文，届时评估 `encrypt.ts` 去留） |

## 已否决的选型

- **MSW**：Service Worker 缓存偶发需硬刷新，且 dev server 中间件方案已满足 Network 可见诉求；mock 保持 vite-plugin-mock-dev-server。
- **替换 node-forge**：WebCrypto 不支持 MD5 且 `crypto.subtle` 在非 HTTPS 内网部署不可用；保留至密码契约定稿时一并评估。