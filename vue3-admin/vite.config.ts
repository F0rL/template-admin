import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_APP_')

  return {
    base: env.VITE_APP_BASE_URL || '/',
    define: {
      // 构建期字面量，由 .env 驱动；false 时 mock 分支被 Rollup 彻底 tree-shake
      __USE_MOCK__: JSON.stringify(env.VITE_APP_USE_MOCK === 'true'),
    },
    plugins: [
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
      // 产物兼容目标：平衡体积与现代浏览器兼容性
      target: 'es2018',
      sourcemap: false,
      cssCodeSplit: true,
      reportCompressedSize: true,
      rollupOptions: {
        output: {
          // 手动分包：稳定缓存 + 避免单 chunk 过大
          manualChunks(id) {
            if (!id.includes('node_modules')) return
            if (id.includes('element-plus') || id.includes('@element-plus') || id.includes('vant'))
              return 'ui'
            // vue-echarts 单独分组并放在 echarts 之前，避免被 id.includes('echarts') 误归入
            // echarts chunk 而引入 vue 依赖，把 echarts 顶到首屏预加载
            if (id.includes('vue-echarts')) return 'vue-echarts'
            if (id.includes('echarts') || id.includes('zrender')) return 'echarts'
            // vue-query 独立缓存：@tanstack 自开发版节奏，与 vue 生态不同步
            if (id.includes('@tanstack')) return 'vue-query'
            if (id.includes('axios')) return 'axios'
            if (id.includes('node-forge') || id.includes('jsencrypt')) return 'crypto'
            // vue 生态：路径边界精确匹配，避免误吞名称含 vue 的包
            if (
              id.includes('@vueuse') ||
              id.includes('@vue/') ||
              id.includes('vue-router') ||
              id.includes('pinia') ||
              id.includes('/vue/')
            )
              return 'vue-vendor'
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
