import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'
import eslintConfigPrettier from 'eslint-config-prettier'

export default [
  // 全局忽略
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'migrations/**'],
  },

  // 基础 JS 推荐规则
  js.configs.recommended,

  // TypeScript 推荐规则（类型检查关闭，仅语法规则）
  ...tseslint.configs.recommended,

  // 全局变量声明（Node 环境）
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // Prettier 规则覆盖（关闭与 Prettier 冲突的规则，必须放最后）
  eslintConfigPrettier,
]
