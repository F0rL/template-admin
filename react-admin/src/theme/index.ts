import type { ThemeConfig } from 'antd'

/**
 * 主题 token 唯一来源
 * ---------------------------------------------
 * 改主题（换主色、调圆角、定制组件）只改本文件：
 * - `token`：Seed / Alias Token，antd 据此派生 hover / active / bg 等派生色；
 * - `components`：组件级 Component Token（优先级高于全局 token）。
 *
 * 消费方：
 * - App.tsx 的 ConfigProvider `theme`；
 * - src/styles/tailwind.css 的 `@theme` 引用 antd 运行时 CSS 变量（`--ant-*`），
 *   因此 Tailwind 工具类自动跟随，CSS 侧无需重复声明色值。
 *
 * 主色对齐 vue3-admin 的 theme.css（两项目视觉基线一致）。
 */
export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: '#2563eb',
  },
  components: {
    Menu: {
      // 展开的子菜单区跟随父级背景，避免默认 colorFillAlter 与侧边栏白底形成色块分界
      subMenuItemBg: 'transparent',
    },
  },
}
