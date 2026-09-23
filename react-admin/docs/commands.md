# 命令与验证

## 命令

```
pnpm dev           # 开发服务器：http://localhost:4001/react-admin/
pnpm build         # 生产构建 → dist/
pnpm preview       # 预览生产构建（同端口 4001）
pnpm lint          # ESLint 检查并自动修复（eslint . --fix）
pnpm lint:check    # ESLint 仅检查，不修复
pnpm typecheck     # tsc 类型检查（--noEmit）
pnpm format        # Prettier 格式化（含 prettier-plugin-tailwindcss 类名自动排序）
pnpm format:check  # Prettier 仅检查
```

仅允许使用 `pnpm`（`packageManager` + `devEngines.packageManager` 强制，版本 >=10 <11）。

## 验证

代码编写完成后必须同时通过 `pnpm lint` 和 `pnpm typecheck`。`lint` 管风格和语法（带 `--fix` 自动修复），`typecheck` 管类型；如需格式化再跑 `pnpm format`。

## 浏览器验收

dev 环境默认开启 mock（`.env.development` 中 `VITE_APP_USE_MOCK=true`）。访问 `http://localhost:4001/react-admin/`，未登录会自动跳转登录页；登录表单任意输入均可通过（mock 不校验凭据），验证码 OTP 输满 4 位自动提交。
