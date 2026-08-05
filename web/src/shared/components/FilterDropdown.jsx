import { createPortal } from 'react-dom'
import { Typography, Button, Select, Drawer, Grid, theme } from 'antd'
import { CloseOutlined } from '@ant-design/icons'

const { Text } = Typography
const { useBreakpoint } = Grid

export default function FilterDropdown({
  open,
  onClose,
  filterFields = [],
  activeFilterCount = 0,
  onClearAll,
  position = { top: 0, right: 0 },
}) {
  const { token } = theme.useToken()
  const screens = useBreakpoint()
  const isMobile = !screens.md

  if (!open) return null

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {filterFields.map((field) => (
        <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>{field.label}</Text>
          <Select
            placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`}
            allowClear
            value={field.value}
            onChange={field.onChange}
            style={{ width: '100%' }}
            options={field.options}
            disabled={field.disabled}
          />
        </div>
      ))}
      {activeFilterCount > 0 && onClearAll && (
        <Button onClick={onClearAll} style={{ width: '100%' }}>
          Clear all filters
        </Button>
      )}
    </div>
  )

  // Mobile: Bottom drawer
  if (isMobile) {
    const drawer = (
      <Drawer
        open={open}
        onClose={onClose}
        title="Filters"
        placement="bottom"
        height="auto"
        styles={{ body: { padding: 16 } }}
        destroyOnHidden
      >
        {content}
      </Drawer>
    )
    return createPortal(drawer, document.body)
  }

  // Desktop: Fixed dropdown
  const dropdown = (
    <div
      style={{
        position: 'fixed',
        top: position.top,
        right: position.right,
        padding: '16px 20px',
        background: token.colorBgElevated,
        borderRadius: 10,
        border: `1px solid ${token.colorBorderSecondary}`,
        boxShadow: token.boxShadowSecondary,
        zIndex: 1050,
        minWidth: 280,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text strong style={{ fontSize: 13 }}>Filters</Text>
        <Button type="text" size="small" icon={<CloseOutlined style={{ fontSize: 12 }} />} onClick={onClose} aria-label="Close filters" />
      </div>
      {content}
    </div>
  )

  return createPortal(dropdown, document.body)
}
