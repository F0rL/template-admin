/**
 * PlaceholderPage — 页面占位（Phase 1 统一形制）
 * ---------------------------------------------
 * panel-card 内居中展示页面名；Phase 2/3 逐个替换页面体时，
 * 路由与菜单保持不动，仅替换各页面文件内容。
 */
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="panel-card flex h-full items-center justify-center">
      <h2 className="text-xl font-medium text-[var(--ant-color-text)]">{title}</h2>
    </div>
  )
}

export default PlaceholderPage
