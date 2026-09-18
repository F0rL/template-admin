import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: [
      // NodeNext 约定：TS 源码里 import './x.js' 指向 x.ts。
      // 测试经 Vite 解析源文件时去掉 .js 后缀，交由 extensions 匹配 .ts
      { find: /^(.*)\.js$/, replacement: '$1' },
    ],
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    // 集成测试涉及 DB/Redis，给足超时
    testTimeout: 15_000,
    hookTimeout: 15_000,
    // 内联 @fastify/autoload：其内部对路由文件的原生 Node import()
    // 会绕过 Vite（Node 只做类型剥离，不认 NodeNext 的 .js→.ts 映射），
    // 内联后动态导入经 Vite 解析，与上面的 alias 协同工作
    server: {
      deps: {
        inline: ['@fastify/autoload'],
      },
    },
  },
})
