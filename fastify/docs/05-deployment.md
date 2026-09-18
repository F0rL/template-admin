# 05 部署（Linux / 信创 / 国产数据库预案）

## 5.1 构建产物

```bash
pnpm build          # tsc → dist/
pnpm db:generate    # 已生成的迁移在 migrations/pg/（纯 SQL，随包分发）
```

交付物清单：

| 内容 | 说明 |
|---|---|
| `dist/` | 编译产物（JS + sourcemap） |
| `node_modules/` | 见 5.3 离线策略 |
| `migrations/pg/` | 迁移 SQL 脚本 |
| `ecosystem.config.js` / systemd unit | 进程管理配置 |
| `.env`（模板） | 真实密钥走运维渠道，不入代码仓 |
| `node` 运行时 | 官方 tar.xz 离线包 |

## 5.2 通用 Linux 部署（CentOS 替代系 / openEuler / Rocky）

### Node 运行时（离线安装，不用 nvm）

```bash
# x86_64
wget https://nodejs.org/dist/v22.x.x/node-v22.x.x-linux-x64.tar.xz
# ARM64（鲲鹏/飞腾）
wget https://nodejs.org/dist/v22.x.x/node-v22.x.x-linux-arm64.tar.xz

tar -xf node-*.tar.xz -C /opt/
ln -s /opt/node-v22.x.x-linux-*/bin/node /usr/local/bin/node
ln -s /opt/node-v22.x.x-linux-*/bin/npm /usr/local/bin/npm
node -v
```

### pm2 cluster

```js
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'store-api',
    script: 'dist/main.js',
    instances: 'max',            // 吃满 CPU 核数
    exec_mode: 'cluster',
    max_memory_restart: '512M',
    kill_timeout: 10000,         // 与 close-with-grace 的 delay 匹配
    env: { NODE_ENV: 'production' },
  }],
};
```

```bash
npm i -g pm2          # 生产机全局安装（一次性，可离线 npm pack 传输）
pm2 start ecosystem.config.js
pm2 save && pm2 startup   # 开机自启
```

### systemd 备选（零额外依赖）

```ini
# /etc/systemd/system/store-api.service
[Unit]
Description=Store API
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=app
WorkingDirectory=/opt/store-api
ExecStart=/usr/local/bin/node dist/main.js
Environment=NODE_ENV=production
EnvironmentFile=/opt/store-api/.env
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

> systemd 单进程部署时，多核利用改用 Node 内置 cluster 或多实例 + Nginx upstream 负载均衡；pm2 cluster 是更省事的默认选择。

### Nginx 反代

```nginx
upstream store_api {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name api.example.com;
    client_max_body_size 10m;      # 与 @fastify/multipart 限制对齐

    location / {
        proxy_pass http://store_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # 优雅停机窗口
        proxy_read_timeout 30s;
    }
}
```

## 5.3 信创环境专项

### 操作系统支持矩阵

| 环境 | glibc | Node 官方构建 | 结论 |
|---|---|---|---|
| 麒麟服务器版 V10 SP3（x86_64 / ARM64） | 2.28 | ✅ 直接运行 | 主流信创目标环境 |
| openEuler / 银河麒麟 V11 | ≥2.28 | ✅ | 可用 |
| Rocky / AlmaLinux 8+ | ≥2.28 | ✅ | 可用 |
| CentOS 7（EOL） | 2.17 | ❌ Node 18+ 二进制无法运行 | 不支持；需升级 OS 或用 unofficial-builds glibc-217 构建 |
| 龙芯 LoongArch | — | ❌ 官方无构建 | 用龙芯社区 Node 构建，全依赖需实测 |

### 依赖离线策略（信创内网无公网）

本方案**全部依赖均为纯 JS**（pg、ioredis、bullmq、better-auth、drizzle 等无原生编译模块），因此可整目录搬运：

```bash
# 有网的同架构机器上（x86_64 ↔ x86_64，或 ARM64 ↔ ARM64）
pnpm install --frozen-lockfile --prod
tar -czf store-api-deploy.tar.gz dist/ node_modules/ migrations/ ecosystem.config.js package.json

# 传输到目标服务器解压，直接启动（无需 npm install / rebuild）
```

或内网搭建 `verdaccio` 私服长期维护。**注意**：严禁后续引入原生模块（sharp、bcrypt、argon2 等如 `@node-rs/*`），否则破坏此策略——这是本方案强制 bcrypt 类库出局、密码哈希交给 better-auth 内置 scrypt 的原因。

### 国密（如验收要求）

- SM2/SM3/SM4：`sm-crypto`（纯 JS）按需引入
- 国密 TLS/网关：通常在信创网关层（如天融信/启明星辰）终结，Node 侧无需改造

## 5.4 数据库部署与国产化路线

### 默认路线：PostgreSQL（开发/常规生产）

标准部署即可。连接池大小参考：`DB_POOL_SIZE ≈ CPU 核数 × 2 ~ 4`（pm2 cluster 下每进程独立计算）。

### 路线 A：金仓 KingbaseES / openGauss（PG 系国产库）

1. 创建库时选择 **PG 兼容模式**（金仓 `database_mode=oracle|pg` 需选 pg；openGauss 直接可用）
2. 连接串替换即可（`node-pg` 协议兼容，金仓官方文档演示的正是 node-pg 连接方式）
3. 执行 `migrations/pg/` 前逐条审查 SQL（重点：`RETURNING`、`ON CONFLICT`、`timestamp with time zone`、序列/自增、事务隔离级别）
4. 跑全量 vitest 集成测试（换 `DATABASE_URL` 即可）
5. 上线后纳入回归：每次迁移新增 SQL 前在目标库验证

### 路线 B：达梦 DM8（独立协议，触发 TypeORM 备选）

当国产化清单明确包含达梦时，执行预定义的切换方案：

| 步骤 | 内容 | 改动范围 |
|---|---|---|
| 1 | 安装 `typeorm` + `typeorm-dm`（达梦官方方言包）+ `dmdb` 驱动（离线包） | 仅数据层 |
| 2 | 按达梦方言重写 `db/*.schema.ts` → TypeORM 实体；迁移目录 `migrations/dm/` | 仅数据层 |
| 3 | 各 `*.repository.ts` 改用 TypeORM Repository 实现，**签名保持不变** | 仓储层内部 |
| 4 | better-auth 换 `typeormAdapter` | auth 配置 |
| 5 | 业务层（service/routes）**零改动** —— 仓储抽象的意义所在 | 无 |

### Redis 替代

信创环境可用兼容产品（如 TongRDS），只要走 RESP 协议，`ioredis` 连接串替换即可；BullMQ 需确认目标产品对 Lua/阻塞命令的支持，不支持则队列改用表轮询降级方案。

## 5.5 上线前验证清单

| # | 验证项 | 通过标准 |
|---|---|---|
| 1 | 目标 OS 全新机器：解压交付包 → `pm2 start` → `/health` 200 | 无 npm install 环节 |
| 2 | ARM64（鲲鹏/飞腾）环境重复第 1 项 | 同上 |
| 3 | `kill -TERM <pid>`：日志显示在途请求完成后退出，连接池/Redis 正确释放 | 无连接泄漏报错 |
| 4 | pm2 cluster 多进程下限流计数共享（同 IP 并发超阈值被 429） | Redis 生效 |
| 5 | 登录 → 业务请求 → 封禁该用户 → 再次请求被拒 | 会话吊销生效 |
| 6 | 国产库实例：全量测试套件通过 | 方言兼容 |
| 7 | Nginx → app 真实 IP 传递（限流按真实 IP 计数） | trustProxy 生效 |
| 8 | 日志落盘 + logrotate 配置；`authorization/cookie` 头已脱敏 | redact 生效 |
| 9 | Swagger UI 关闭或加访问控制（生产） | 配置项 |
| 10 | 回滚演练：回退上一版本 `dist/` + 迁移不回滚（迁移只前进） | 流程明确 |

## 5.6 运维约定

- **迁移只前进不回滚**：每次迁移前备份库；回滚靠代码回退 + 兼容旧 schema 的过渡版本
- **日志**：pino JSON 输出到 stdout，由 pm2 / systemd 收集，logrotate 按天切割
- **版本升级纪律**：better-auth 升级后必须重新 `auth:generate` 并 diff auth 表结构；drizzle-orm 大版本升级需在国产库上重跑测试矩阵
