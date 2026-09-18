# admin-aijoin 本地运行教程

> 适用版本：admin-aijoin（PC 管理端），Vue 3.5 + Element Plus + Vite 8
> 对接后端：`http://dxlxx.sunjee.cn:89/`（已支持 CORS）
> 入口地址：`http://localhost:4000/admin/`

---

## ⚠️ 重要前提

本项目 **强烈不推荐 `npm run dev`**（Vite 8 dev 优化器在当前环境下会无限重打包）。**本教程采用「生产构建 + 自建 preview-server」方案**，稳定可靠。

---

## 一、前置条件

| 工具 | 版本 | 验证命令 |
|---|---|---|
| Node.js | ≥ 22.x | `node -v` |
| npm | ≥ 10.x | `npm -v` |
| VSCode | 任意新版 | - |
| 终端 | PowerShell 或 Git Bash | - |

打开 VSCode 终端（Ctrl + `），所有命令在终端中执行。

---

## 二、首次安装（一次性）

### 1. 打开项目文件夹

```bash
cd "D:\Project\工蜂\2026\大兴路小学\src\AIJoin\admin-aijoin"
```

### 2. 清理旧的 node_modules 残留（重要）

> 如果之前装过但安装失败/卡住，残留的 pnpm 目录会让 Vite 优化器卡死。

**PowerShell**：
```powershell
# 杀干净所有 node 进程
tasklist | findstr "node.exe" | ForEach-Object { taskkill /F /PID $_.Split()[1] }

# 解除 .pnpm 残留的空 ACL
icacls "node_modules\.pnpm" /reset /T /C /Q

# 彻底删除
Remove-Item -Recurse -Force node_modules, ".vite" -ErrorAction SilentlyContinue
```

**Git Bash**：
```bash
for pid in $(tasklist 2>/dev/null | grep -i "node.exe" | awk '{print $2}'); do taskkill -F -PID $pid; done
icacls "node_modules/.pnpm" /reset /T /C /Q 2>/dev/null
/usr/bin/rm -rf node_modules node_modules/.vite
```

### 3. 安装依赖

```bash
npm install --no-audit --no-fund
```

> 首次安装约 5-10 分钟。如果太慢可加镜像：`--registry=https://registry.npmmirror.com`

---

## 三、配置环境变量

确认两个 env 文件的关键值（在 VSCode 里直接打开）：

**`.env.development`**（dev 模式用）：
```ini
VITE_APP_BASE_API=http://dxlxx.sunjee.cn:89
VITE_APP_USE_MOCK=false
VITE_APP_ENABLE_DEVTOOLS=false
VITE_APP_STORAGE_NS=template:admin:dev
```

**`.env.production`**（生产构建用）：
```ini
VITE_APP_BASE_API=http://dxlxx.sunjee.cn:89
VITE_APP_USE_MOCK=false
VITE_APP_ENABLE_DEVTOOLS=false
VITE_APP_STORAGE_NS=template:admin:prod
```

> ⚠️ 注意：`src/config/index.ts:18` 会自动把 `VITE_APP_BASE_API` 后面拼一个 `/api`，所以这里**不要带 /api 后缀**！否则会出现 `/api/api/...` 双重路径。

---

## 四、构建生产包

```bash
npm run build -- --base=.
```

或等价的：
```bash
node node_modules/vite/bin/vite.js build --base=.
```

> 关键参数 `--base=.` 让所有资源用相对路径，避免部署到子路径时的 404。构建时间约 20-30 秒，产物在 `dist/`。

---

## 五、启动 preview-server

项目根目录已提供 `preview-server.mjs`，自带：
- 静态服务 `dist/`
- `/api/*` 反向代理到线上后端
- SPA fallback（无文件路径自动回 index.html）

```bash
node preview-server.mjs
```

启动成功会看到：
```
✅ admin-aijoin running
   Local:   http://localhost:4000/
   API:     http://dxlxx.sunjee.cn:89 (proxied via /api/*)
   Serving: ...\admin-aijoin\dist
```

---

## 六、浏览器访问

打开浏览器（建议 Chrome/Edge），访问：

```
http://localhost:4000/admin/
```

**首次访问记得强刷**（Ctrl + Shift + R）避免缓存旧的错误版本。

能看到登录页（带验证码）就 OK 了。

---

## 七、停止服务

终端里按 `Ctrl + C`。

或另开终端执行：
```bash
for pid in $(tasklist 2>/dev/null | grep -i "node.exe" | awk '{print $2}'); do taskkill -F -PID $pid; done
```

---

## 八、典型开发流程

```bash
# 1. 改完代码（VSCode 里直接编辑）

# 2. 重新构建（约 20-30 秒）
node node_modules/vite/bin/vite.js build --base=.

# 3. 浏览器强刷（dist 是静态服务，build 后立即生效）
#    Ctrl + Shift + R
```

> **不需要重启 preview-server**！它每次都从磁盘读取 dist/。

---

## 九、常见问题

### Q1: 验证码图片不显示 / 接口报 404
A: 检查浏览器强刷（Ctrl+Shift+R）后是否走 `http://dxlxx.sunjee.cn:89/api/...`。若仍是 `localhost:4000/api/api/...`，说明 `.env.production` 配置不对，重新看「三、配置环境变量」。

### Q2: `npm install` 报 ECONNRESET
A: 网络问题，重试即可：
```bash
npm install --no-audit --no-fund --fetch-retries=5 --fetch-timeout=60000
```

### Q3: `npm install` 卡在 `node-gyp` / `python` 报错
A: 装过 pnpm 后 npm 装会有残留，参考「二.2 清理」。

### Q4: 端口 4000 被占用
A: 改端口：
```bash
PORT=4001 node preview-server.mjs
```

### Q5: 能不能用 `npm run dev`？
A: **不推荐**。Vite 8.2.2 的 dev 依赖优化器（rolldown）在本环境会无限重打包，element-plus 等大依赖请求会一直超时。如必须用，参考「十、dev server 方案（备选）」。

### Q6: 改完代码没生效？
A: preview-server 是纯静态的，必须重新 build（`npm run build`）。改完直接 Ctrl+Shift+R 看效果。

---

## 十、dev server 方案（备选，不推荐）

> ⚠️ 本节方案在沙箱环境下会卡死，仅作记录。

```bash
# 启动 dev server
npm run dev

# 浏览器访问
http://localhost:4000/admin/
```

如果 dev 优化器一直卡在「bundling dependencies...」：

```bash
# 1. 杀掉所有 node
for pid in $(tasklist 2>/dev/null | grep -i "node.exe" | awk '{print $2}'); do taskkill -F -PID $pid; done

# 2. 强制清空 vite 缓存
rm -rf node_modules/.vite

# 3. 重启（首次会慢，约 5-10 分钟完成首次打包）
npm run dev
```

首次成功后所有请求会秒回。如果还是无限重打包，请改用本教程的「构建 + preview-server」方案。

---

## 十一、相关文件位置

| 文件 | 作用 |
|---|---|
| `src/config/index.ts` | 全局配置（含 `API_BASE_URL` 拼装逻辑） |
| `.env.development` | dev 环境变量 |
| `.env.production` | production 构建用环境变量 |
| `vite.config.ts` | Vite 配置（含 dev proxy） |
| `preview-server.mjs` | 自建预览服务器（推荐方案） |
| `dist/` | 生产构建产物（应 git ignore） |
| `package.json` | 依赖与脚本 |

---

## 十二、VSCode 推荐插件

| 插件 | 用途 |
|---|---|
| **Vue - Official** | Vue 3 SFC 语法高亮、格式化 |
| **TypeScript Vue Plugin** | TS 类型提示 |
| **ESLint** | 代码规范 |
| **Prettier** | 代码格式化 |
| **Stylelint** | CSS/SCSS 规范 |
| **UnoCSS** | 项目用 unocss，需装 |

---

## 十三、调试技巧

### 看 API 请求

打开浏览器 F12 → Network 面板，看：
- 验证码请求 URL 应是：`http://dxlxx.sunjee.cn:89/api/Auth/GetLoginVerCode?key=...`
- 状态码：200
- 响应体：含 `{"data":{"key":"...","base64":"..."}}`

### 看 dist 嵌入的 baseURL

```bash
# Git Bash
grep -l "dxlxx.sunjee.cn:89" dist/assets/*.js

# Windows PowerShell
Select-String -Path "dist\assets\*.js" -Pattern "dxlxx.sunjee.cn:89"
```

### 重新构建后清浏览器缓存

DevTools 打开 → 右键刷新按钮 → 「清空缓存并硬性重新加载」

---

## 一键运行脚本（可保存为 .bat / .sh）

**`run.bat`**（Windows）：
```bat
@echo off
cd /d "D:\Project\工蜂\2026\大兴路小学\src\AIJoin\admin-aijoin"
echo === 重新构建 ===
node node_modules/vite/bin/vite.js build --base=.
echo === 启动服务 ===
node preview-server.mjs
pause
```

**`run.sh`**（Git Bash）：
```bash
#!/bin/bash
cd "D:/Project/工蜂/2026/大兴路小学/src/AIJoin/admin-aijoin"
echo "=== 重新构建 ==="
node node_modules/vite/bin/vite.js build --base=.
echo "=== 启动服务 ==="
node preview-server.mjs
```

---

> 最后更新：2026-08-25
> 配套记录：`.workbuddy/memory/2026-08-25.md`（含详细踩坑记录）
