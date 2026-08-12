import { Typography, Button, Select, Grid } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { theme } from 'antd'

const { Text } = Typography
const { useBreakpoint } = Grid

export default function FormNavigation({ 
  mainNavItems = [], 
  formNavItems = [], 
  activeTab, 
  onTabChange, 
  getItemStatus,
  isMobile = false 
}) {
  const { token } = theme.useToken()
  const screens = useBreakpoint()

  const allNavItems = [...mainNavItems, ...formNavItems]

  // Mobile: Select dropdown switcher
  if (isMobile || !screens.lg) {
    return (
      <div style={{ padding: 16, borderBottom: `1px solid ${token.colorBorderSecondary}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text style={{ flexShrink: 0 }}>Section:</Text>
          <Select
            value={activeTab}
            onChange={onTabChange}
            style={{ flex: 1 }}
            options={allNavItems.map((item) => {
              let labelText = ''
              if (typeof item.label === 'string') {
                labelText = item.label
              } else if (item.label?.props?.children) {
                // Handle JSX labels like <><Icon />Text</>
                const children = item.label.props.children
                if (Array.isArray(children)) {
                  // Find the text content (usually the second child after icon)
                  labelText = children.find(c => typeof c === 'string') || 
                              children.find(c => c?.props?.children)?.props?.children || 
                              String(item.key)
                } else if (typeof children === 'string') {
                  labelText = children
                } else if (children?.props?.children) {
                  labelText = children.props.children
                }
              }
              return {
                value: item.key,
                label: labelText || String(item.key),
              }
            })}
          />
        </div>
      </div>
    )
  }

  // Desktop: Vertical button navigation
  return (
    <div
      style={{
        width: 220,
        flexShrink: 0,
        alignSelf: 'stretch',
        borderRight: `1px solid ${token.colorBorderSecondary}`,
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        overflowY: 'auto',
        background: token.colorBgContainer,
      }}
    >
      {mainNavItems.map((item) => {
        const isSelected = activeTab === item.key
        return (
          <Button
            key={item.key}
            onClick={() => onTabChange(item.key)}
            style={{
              textAlign: 'left',
              justifyContent: 'flex-start',
              whiteSpace: 'normal',
              height: 'auto',
              minHeight: 40,
              padding: '8px 12px',
              lineHeight: 1.4,
              border: isSelected ? `1px solid ${token.colorPrimary}` : undefined,
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', color: isSelected ? token.colorPrimary : undefined }}>
              {item.icon || item.label}
              {item.icon && <span style={{ marginLeft: 8 }}>{item.label}</span>}
            </span>
          </Button>
        )
      })}
      {formNavItems.length > 0 && (
        <>
          <div
            style={{
              marginTop: 12,
              marginBottom: 4,
              padding: '4px 12px 0',
              borderTop: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
          </div>
          {formNavItems.map((item) => {
            const isSelected = activeTab === item.key
            const status = getItemStatus ? getItemStatus(item) : null

            let statusIcon = null
            if (status === 'ok') {
              statusIcon = <CheckCircleOutlined style={{ color: token.colorSuccess, marginRight: 8, flexShrink: 0 }} />
            } else if (status === 'rejected') {
              statusIcon = <CloseCircleOutlined style={{ color: token.colorError, marginRight: 8, flexShrink: 0 }} />
            } else if (status === 'pending') {
              statusIcon = <ClockCircleOutlined style={{ color: token.colorTextTertiary, marginRight: 8, flexShrink: 0 }} />
            }

            return (
              <Button
                key={item.key}
                onClick={() => onTabChange(item.key)}
                style={{
                  textAlign: 'left',
                  justifyContent: 'flex-start',
                  whiteSpace: 'normal',
                  height: 'auto',
                  minHeight: 40,
                  padding: '8px 12px',
                  lineHeight: 1.4,
                  border: isSelected ? `1px solid ${token.colorPrimary}` : undefined,
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                  {statusIcon}
                  <span style={{ color: isSelected ? token.colorPrimary : undefined }}>
                    {item.label}
                  </span>
                </span>
              </Button>
            )
          })}
        </>
      )}
    </div>
  )
}
