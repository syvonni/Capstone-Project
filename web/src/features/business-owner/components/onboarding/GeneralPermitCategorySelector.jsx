import { Typography, theme, Button } from 'antd'
import { GENERAL_PERMIT_CATEGORIES } from '../../constants/businessFormConstants'
import {
  TeamOutlined, HeartOutlined, ToolOutlined, FireOutlined,
  GiftOutlined, ShoppingCartOutlined, RiseOutlined, ShopOutlined,
  ExperimentOutlined, BlockOutlined, InboxOutlined, MoreOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons'

const { Title, Text } = Typography

const ICON_MAP = {
  TeamOutlined,
  HeartOutlined,
  ToolOutlined,
  FireOutlined,
  GiftOutlined,
  ShoppingCartOutlined,
  RiseOutlined,
  ShopOutlined,
  ExperimentOutlined,
  BlockOutlined,
  InboxOutlined,
  MoreOutlined,
}

function GeneralPermitCategorySelector({ onSelect, onBack, title = 'Select Permit Category' }) {
  const { token } = theme.useToken()

  const handleSelectCategory = (value) => {
    onSelect(value)
  }

  return (
    <div style={{ padding: '24px', maxWidth: 600, margin: '0 auto', width: 'fit-content' }}>
      {onBack && (
        <Button 
          onClick={() => {
            onBack()
          }}
          icon={<ArrowLeftOutlined />}
          style={{ 
            marginBottom: 16
          }}
        >
          Back
        </Button>
      )}
      <Title level={4} style={{ marginBottom: 24, textAlign: 'center' }}>
        {title}
      </Title>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        {GENERAL_PERMIT_CATEGORIES.map((category) => {
          const IconComponent = ICON_MAP[category.icon] || MoreOutlined
          return (
            <div
              key={category.value}
              role="button"
              tabIndex={0}
              onClick={() => handleSelectCategory(category.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleSelectCategory(category.value)
                }
              }}
              style={{
                cursor: 'pointer',
                border: `1px solid ${token.colorBorder}`,
                borderRadius: token.borderRadiusLG,
                transition: 'all 0.2s',
                background: token.colorBgContainer,
                display: 'flex',
                flexDirection: 'row',
                width: '100%',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = token.colorPrimary
                e.currentTarget.style.boxShadow = token.boxShadowTertiary
                e.currentTarget.style.transform = 'scale(1.02)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = token.colorBorder
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.transform = 'scale(1)'
              }}
            >
              {/* Left panel - Icon and title */}
              <div
                style={{
                  flex: '0 0 40%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-end',
                  padding: '16px 20px',
                  paddingTop: 60,
                }}
              >
                <IconComponent
                  style={{
                    fontSize: 24,
                    color: token.colorTextSecondary,
                    marginBottom: 8,
                  }}
                />
                <Title level={5} style={{ margin: 0 }}>
                  {category.label}
                </Title>
              </div>

              {/* Right panel - Description */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  padding: '24px',
                  borderLeft: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                <Text
                  style={{
                    display: 'block',
                    marginBottom: 16,
                    fontSize: 14,
                    lineHeight: 1.5,
                    color: token.colorText,
                  }}
                >
                  {category.description}
                </Text>
                <div>
                  <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                    Best for:
                  </Text>
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: token.colorTextSecondary }}>
                    {category.bestFor.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default GeneralPermitCategorySelector
