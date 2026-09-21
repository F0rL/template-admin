# 命令与验证

## 命令

```
pnpm dev           # 开发服务器，如果存在优先使用 http://localhost:4000/admin/
pnpm build         # 生产构建 → dist/
pnpm preview       # 预览生产构建
pnpm lint          # ESLint 检查并自动修复（eslint . --fix）
pnpm lint:check    # ESLint 仅检查，不修复
pnpm typecheck     # vue-tsc 类型检查（--noEmit）
pnpm format        # Prettier 格式化（含 prettier-plugin-tailwindcss 类名自动排序）
pnpm format:check  # Prettier 仅检查
pnpm gen:api <Controller> [--all] [--force]  # 从 src/api/swagger.json 生成/合并接口文件
```

仅允许使用 `pnpm`（`packageManager` + `devEngines.packageManager` 强制，版本 >=10 <11）。

`gen:api` 从 `src/api/swagger.json` 生成/更新接口文件，详见 docs/data-layer.md。

## 验证

代码编写完成后必须同时通过 `pnpm lint` 和 `pnpm typecheck`。`lint` 管风格和语法（带 `--fix` 自动修复），`typecheck` 管类型推断；如需格式化再跑 `pnpm format`。

如果需要调用浏览器进行验证和分析，直接访问 `http://localhost:4000/admin/`，然后等待用户登录后，确认已登录再进行操作。
