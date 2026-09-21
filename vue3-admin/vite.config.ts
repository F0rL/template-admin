import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'
import { viteMockServe } from 'vite-plugin-mock'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_APP_')

  return {
    base: env.VITE_APP_BASE_URL || '/',
    plugins: [
      // dev server 中间件层拦截 /api 请求（proxy 之前），生产构建天然无 mock
      viteMockServe({
        enable: env.VITE_APP_USE_MOCK === 'true',
        mockPath: 'mock',
      }),
      tailwindcss(),
      vue(),
      AutoImport({
        resolvers: [ElementPlusResolver(), IconsResolver({ prefix: 'Icon' })],
        // imports: ['vue', 'vue-router', 'pinia'],
        dts: 'src/auto-imports.d.ts',
      }),
      Components({
        resolvers: [
          // 按需引入组件样式，替代 main.ts 里的全量 element-plus CSS
          ElementPlusResolver({ importStyle: 'css' }),
          IconsResolver({ prefix: 'Icon', enabledCollections: ['ri', 'ep'] }),
        ],
        dts: 'src/components.d.ts',
      }),
      Icons({
        compiler: 'vue3',
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
      include: ['element-plus', '@vueuse/core', 'dayjs', 'axios', 'nprogress'],
    },
    build: {
      // 产物兼容目标：类字段等语法原生支持（Chrome 94+ / Safari 15.4+），避免降级
      // helper 被分配进懒加载 chunk，产生入口 → 懒 chunk 的静态依赖链
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
            // vue-vendor 必须排在最前，否则 element-plus（ui）的依赖闭包会先把
            // vue 运行时吞进 ui chunk（manualChunks 单组模拟时代的实际表现）
            groups: [
              // vue 生态：包名边界精确匹配，避免误吞名称含 vue 的包
              {
                name: 'vue-vendor',
                test: /[\\/]node_modules[\\/](@vue|@vueuse|vue|vue-router|pinia(?:-plugin-persistedstate)?)[\\/]/,
              },
              // echarts 须在 vue-echarts 之前：vue-echarts 依赖 echarts/core，
              // 分组靠前者优先捕获，echarts 完整实现（含 zrender）归 echarts，
              // vue-echarts 保持薄壳仅存包装层，升级互不拉动对方缓存
              { name: 'echarts', test: /[\\/]node_modules[\\/](echarts|zrender)[\\/]/ },
              { name: 'vue-echarts', test: /[\\/]node_modules[\\/]vue-echarts[\\/]/ },
              // element-plus 及其未分组依赖（dayjs 等）整体进入 ui，保证缓存稳定
              { name: 'ui', test: /[\\/]node_modules[\\/](element-plus|@element-plus|vant)[\\/]/ },
              // vue-query 独立缓存：@tanstack 自开发版节奏，与 vue 生态不同步
              { name: 'vue-query', test: /[\\/]node_modules[\\/]@tanstack[\\/]/ },
              { name: 'axios', test: /[\\/]node_modules[\\/]axios[\\/]/ },
              { name: 'crypto', test: /[\\/]node_modules[\\/](node-forge|jsencrypt)[\\/]/ },
            ],
          },
        },
      },
    },
    server: {
      port: 4000,
      host: '0.0.0.0',
      warmup: {
        clientFiles: ['./src/main.ts', './src/router/index.ts'],
      },
      proxy: {
        '/api': {
          target: env.VITE_APP_BASE_API,
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 4000,
      host: '0.0.0.0',
    },
  }
})
