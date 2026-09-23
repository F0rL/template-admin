import { resolve } from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import Icons from 'unplugin-icons/vite'
import { mockDevServerPlugin } from 'vite-plugin-mock-dev-server'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_APP_')

  return {
    base: env.VITE_APP_BASE_URL || '/',
    plugins: [
      // dev server 中间件层拦截 /api 请求（proxy 之前），生产构建天然无 mock
      mockDevServerPlugin({
        enabled: env.VITE_APP_USE_MOCK === 'true',
        dir: 'mock',
        // 默认 include 仅匹配 *.mock.ts 等带 .mock. 的文件名，本项目沿用原文件名，显式放开；
        // db.ts / utils.ts 是纯数据源与工具模块（无 defineMock 默认导出），必须排除：
        // 若被扫描，插件会把其命名导出误当作 mock 配置，产生幽灵项遮蔽后续 handler（实测空响应）
        include: ['**/*.ts'],
        exclude: ['**/db.ts', '**/utils.ts'],
      }),
      tailwindcss(),
      // React Compiler（babel 稳定路线）：仅处理 src 下 ts/tsx，避免全量 babel 开销；
      // 插件已自动为 .ts/.tsx/.jsx 配置 Babel parser，无需额外 preset-typescript
      babel({
        include: /[\\/]src[\\/].*\.[jt]sx?(?:$|\?)/,
        plugins: ['babel-plugin-react-compiler'],
      }),
      react(),
      Icons({
        compiler: 'jsx',
        scale: 1,
        autoInstall: false,
      }),
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    // 预构建大型依赖，加速冷启动与 HMR
    optimizeDeps: {
      include: ['antd', 'dayjs', 'axios', 'nprogress'],
    },
    build: {
      // 产物兼容目标：类字段等语法原生支持（Chrome 94+ / Safari 15.4+），避免降级
      target: 'es2022',
      sourcemap: false,
      cssCodeSplit: true,
      reportCompressedSize: true,
      rolldownOptions: {
        output: {
          // 手动分包：稳定缓存 + 避免单 chunk 过大
          codeSplitting: {
            // 依赖递归捕获（includeDependenciesRecursively，默认 true）下，
            // 分组按声明顺序竞争：靠前的分组捕获模块时会一并吞下其未分组的依赖。
            // react-vendor 必须排在最前，否则 ui 组的依赖闭包会先把 react 运行时吞进 ui chunk
            groups: [
              // react 生态：包名边界精确匹配，避免误吞名称含 react 的包
              {
                name: 'react-vendor',
                test: /[\\/]node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/,
              },
              // antd 及其未分组依赖（rc-*、dayjs、@babel/runtime 等）整体进入 ui，保证缓存稳定
              { name: 'ui', test: /[\\/]node_modules[\\/](@ant-design|antd|rc-)[\\/]/ },
              // react-query 独立缓存：@tanstack 自开发版节奏，与 react 生态不同步
              { name: 'react-query', test: /[\\/]node_modules[\\/]@tanstack[\\/]/ },
              { name: 'axios', test: /[\\/]node_modules[\\/]axios[\\/]/ },
              { name: 'crypto', test: /[\\/]node_modules[\\/](node-forge|jsencrypt)[\\/]/ },
            ],
          },
        },
      },
    },
    server: {
      port: 4001,
      host: '0.0.0.0',
      warmup: {
        clientFiles: ['./src/main.tsx', './src/router/index.tsx'],
      },
      proxy: {
        '/api': {
          target: env.VITE_APP_BASE_API,
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 4001,
      host: '0.0.0.0',
    },
  }
})
