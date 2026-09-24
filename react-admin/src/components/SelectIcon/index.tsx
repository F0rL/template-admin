/**
 * SelectIcon — 图标选择器（Popover + 双标签页）
 * ---------------------------------------------
 * 受控 value: string（图标名，如 'ad:menu' / 'ri:user-line'），
 * 数据源为 iconMap 的两张子表（ad.ts / ri.ts），键名与后端菜单 icon 字段一致。
 * 结构对齐 vue3-admin 版 SelectIcon；接入 Form.Item 时由表单注入 value/onChange。
 *
 * 用法：
 *   <SelectIcon value={icon} onChange={setIcon} />
 *   <Form.Item name="icon" label="图标"><SelectIcon /></Form.Item>
 */
import { useState } from 'react'
import { Input, Popover, Tabs } from 'antd'
import iconMap from '@/icons'
import adMap from '@/icons/ad'
import riMap from '@/icons/ri'

interface SelectIconProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
}

const adKeys = Object.keys(adMap)
const riKeys = Object.keys(riMap)

function SelectIcon({ value, onChange, placeholder = '请选择图标' }: SelectIconProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('ad')

  const CurrentIcon = value ? iconMap[value] : undefined

  /** 图标网格：点击选中并收起面板 */
  function renderGrid(keys: string[]) {
    return (
      <div className="grid max-h-64 grid-cols-[repeat(auto-fill,minmax(36px,1fr))] gap-1 overflow-y-auto">
        {keys.map(key => {
          const Icon = iconMap[key]
          const active = value === key
          return (
            <div
              key={key}
              title={key}
              className={`flex h-9 cursor-pointer items-center justify-center rounded border text-lg ${
                active
                  ? 'border-primary bg-primary-bg text-primary'
                  : 'border-transparent text-text-secondary hover:bg-primary-bg hover:text-primary'
              }`}
              onClick={() => {
                onChange?.(key)
                setOpen(false)
              }}
            >
              <Icon />
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomLeft"
      content={
        <div className="w-[420px]">
          <Tabs
            size="small"
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              { key: 'ad', label: 'Ant Design', children: renderGrid(adKeys) },
              { key: 'ri', label: 'RemixIcon', children: renderGrid(riKeys) },
            ]}
          />
        </div>
      }
    >
      <Input
        readOnly
        className="cursor-pointer"
        placeholder={placeholder}
        value={value}
        prefix={CurrentIcon ? <CurrentIcon /> : undefined}
      />
    </Popover>
  )
}

export default SelectIcon
