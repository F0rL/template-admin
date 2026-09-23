import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'
import eslintConfigPrettier from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default tseslint.config(
  // 全局忽略
  {
    ignores: ['dist/**', 'node_modules/**'],
  },

  // 基础 JS 推荐规则
  js.configs.recommended,

  // TypeScript 推荐规则（类型检查关闭，仅语法规则）
  ...tseslint.configs.recommended,

  // React Hooks 推荐规则（v7 flat 预设，内含 React Compiler 校验规则）
  reactHooks.configs.flat.recommended,

  // react-refresh：仅导出组件（HMR 边界安全）
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-refresh': reactRefresh },
    rules: {
      'react-refresh/only-export-components': 'warn',
    },
  },

  // 路由模块：React.lazy 常量 + RouteObject 数组导出共存，非 HMR 组件边界
  {
    files: ['src/router/modules/**'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },

  // 全局变量声明
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },

  // 自定义规则覆盖
  {
    rules: {
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },

  // Prettier 规则覆盖（关闭与 Prettier 冲突的 ESLint 规则，必须放最后）
  eslintConfigPrettier,
)
