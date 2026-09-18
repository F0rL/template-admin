@echo off
title admin-aijoin 本地启动

REM ═══════════════════════════════════════════════════════════════
REM 关键约定（改 base / 端口前必读，否则会白屏）：
REM   1. 构建参数 --base=/admin/ 必须与 preview-server.mjs 的 MOUNT='/admin/'
REM      以及 .env 的 VITE_APP_BASE_URL=/admin/ 三处保持一致。
REM      server 靠剥掉 /admin 前缀才能在 dist/ 里定位资源文件。
REM   2. 禁止 --base=.（Vite8 直接报 invalid "base" option: "."）；
REM      --base=./ 虽可用，但与 VITE_APP_BASE_URL 不一致，统一用 /admin/。
REM   3. 启动前必须杀掉占用 4000 端口的旧进程（步骤 0），
REM      否则旧进程继续占端口，浏览器访问的还是旧版本。
REM ═══════════════════════════════════════════════════════════════

cd /d "%~dp0"

echo ============================================
echo   admin-aijoin 一键启动（构建 + 预览）
echo ============================================
echo.

REM ── 0. 杀掉占用 4000 端口的旧进程（避免旧进程占端口、新版本不生效）──
echo [0/2] 清理旧进程 (端口 4000) ...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
echo     清理完成（若无占用则自动跳过）
echo.

if /i "%~1"=="dev" goto dev

REM ── 1. 重新构建（--base 必须与 preview-server.mjs 的 MOUNT 一致，见文件头约定）──
echo [1/2] 重新构建...
node node_modules/vite/bin/vite.js build --base=/admin/
if errorlevel 1 (
    echo.
    echo [X] 构建失败！请检查上面的错误信息
    pause
    exit /b 1
)

REM ── 2. 启动预览服务（静态托管 dist + 反向代理 /api）──
echo.
echo [2/2] 启动预览服务...
echo.
echo 访问地址: http://localhost:4000/admin/
echo API 代理: http://dxlxx.sunjee.cn:89 (经 /api/*)
echo 注意: 若浏览器此前已打开旧页面，启动后请按 Ctrl+F5 硬刷新
echo       （否则会用缓存的旧入口去请求已被清掉的旧 chunk，导致白屏/点击无反应）
echo 停止服务: 按 Ctrl+C
echo.
node preview-server.mjs
pause
goto :eof

:dev
echo 运行模式 : 开发 dev（热更新）
echo 接口指向 : 见 .env 配置（默认 http://dxlxx.sunjee.cn:89）
echo 访问地址 : http://localhost:4000/admin/
echo 停止服务 : 按 Ctrl+C
echo.
node node_modules/vite/bin/vite.js
pause
goto :eof
