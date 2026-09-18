# 部署（Linux / 信创 / 国产数据库预案）

## 构建与交付物

```bash
pnpm build        # tsc → dist/（JS + sourcemap）
```

| 内容 | 说明 |
|---|---|
| `dist/` | 编译产物 |
| `node_modules/` | 离线策略见下，整目录搬运 |
| `migrations/pg/` | 迁移 SQL（纯 SQL，随包分发） |
| `ecosystem.config.js` / systemd unit | 进程管理配置 |
| `.env` | 真实密钥走运维渠道，不入代码仓 |

## Node 运行时（离线安装，不用 nvm）

官方 tar.xz 解压到 `/opt/` 并软链 `/usr/local/bin`；x86_64 与 ARM64（鲲鹏/飞腾）均有官方构建。

| 环境 | 结论 |
|---|---|
| 麒麟 V10 SP3 / openEuler / Rocky、AlmaLinux 8+（glibc ≥ 2.28） | 直接运行 |
| CentOS 7（glibc 2.17，EOL） | **不支持**，需升级 OS 或用 unofficial-builds glibc-217 构建 |
| 龙芯 LoongArch | 官方无构建，用龙芯社区构建，全依赖需实测 |

## 进程管理

- 默认 **pm2 cluster**：`instances: 'max'`，`max_memory_restart: '512M'`，`kill_timeout: 10000`（必须与 main.ts 中 close-with-grace 的 10s delay 匹配，保证优雅停机）；`pm2 save && pm2 startup` 开机自启
- 备选 systemd（零额外依赖）：单进程部署，多核利用改用 Node cluster 或多实例 + Nginx upstream

## Nginx 反代要点

- `proxy_set_header X-Real-IP / X-Forwarded-For / X-Forwarded-Proto`（app 侧 `trustProxy: true`，限流按真实 IP 计数）
- `client_max_body_size` 与 @fastify/multipart 限制对齐
- `proxy_read_timeout` 与优雅停机窗口匹配

## 信创离线策略（关键约束）

本方案**全部依赖均为纯 JS**（pg、ioredis、bullmq、better-auth、drizzle 等无原生编译模块），因此可整目录搬运：有网的同架构机器 `pnpm install --frozen-lockfile --prod` 后 tar 打包 `dist/ node_modules/ migrations/`，目标服务器解压直接启动，**无需 npm install / rebuild**。也可内网 verdaccio 私服长期维护。

**严禁引入原生编译模块**（sharp、bcrypt、argon2、`@node-rs/*` 等），否则破坏此策略——这是密码哈希交给 better-auth 内置 scrypt、bcrypt 类库出局的原因。

国密（如验收要求）：SM2/SM3/SM4 用纯 JS 的 `sm-crypto`；国密 TLS 通常在信创网关层终结，Node 侧无需改造。

## 上线前验证清单

| # | 验证项 | 通过标准 |
|---|---|---|
| 1 | 全新机器：解压交付包 → `pm2 start` → `/health` 200 | 无 npm install 环节 |
| 2 | ARM64 环境重复第 1 项 | 同上 |
| 3 | `kill -TERM <pid>` 优雅停机 | 在途请求完成后退出，连接池/Redis 正确释放 |
| 4 | pm2 cluster 多进程限流 | 同 IP 并发超阈值被 429（Redis 共享计数生效） |
| 5 | 登录 → 业务请求 → 封禁用户 → 再请求 | 会话吊销生效 |
| 6 | 国产库实例全量测试通过 | 方言兼容 |
| 7 | Nginx → app 真实 IP 传递 | trustProxy 生效 |
| 8 | 日志落盘 + logrotate；`authorization/cookie` 头脱敏 | redact 生效 |
| 9 | Swagger UI 生产关闭或加访问控制 | 配置项 |
| 10 | 回滚演练 | 回退上一版本 `dist/`，迁移不回滚 |

## 运维约定

- 迁移只前进不回滚，回滚靠代码回退 + 兼容旧 schema 的过渡版本
- 日志：pino JSON 到 stdout，由 pm2/systemd 收集，logrotate 按天切割
- better-auth 升级后重新 `pnpm auth:generate` 并 diff 表结构；drizzle-orm 大版本升级需在国产库重跑测试矩阵（见 data-layer.md）
