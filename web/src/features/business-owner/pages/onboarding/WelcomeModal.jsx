import { Typography, theme, Divider } from 'antd'
import { ShopOutlined, CalendarOutlined, LinkOutlined } from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography

const BUSINESS_TYPES = [
  {
    type: 'permit',
    title: 'Apply for a Business Permit',
    description: 'For established businesses with permanent locations operating year-round',
    bestFor: ['Stores', 'Restaurants', 'Offices', 'Service businesses'],
  },
  {
    type: 'general_permit',
    title: 'Apply for a Temporary Permit',
    description: 'For short-term, seasonal, or special event operations',
    bestFor: ['Bazaar vendors', 'Peddlers', 'Festival stalls', 'Seasonal operations'],
  },
]

export default function WelcomeInline({ onSelect, onLinkExisting }) {
  const { token } = theme.useToken()

  const handleSelectBusiness = (type) => {
    onSelect(type)
  }

  return (
    <div style={{ padding: '48px 24px', maxWidth: 800, margin: '0 auto' }}>
      <Title level={4} style={{ marginBottom: 16, textAlign: 'center' }}>
        Welcome to BizClear!
      </Title>
      <Paragraph style={{ marginBottom: 48, textAlign: 'center' }}>
        BizClear is your digital gateway to smoother transactions with the BPLO office of Alaminos.
        We simplify business permit applications, track your application status, and help you stay compliant
        with local regulations—all in one convenient platform. How would you like to get started?
      </Paragraph>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        marginBottom: 32,
        maxWidth: 600,
        margin: '0 auto',
      }}>
        {BUSINESS_TYPES.map((business) => (
          <div
            key={business.type}
            role="button"
            tabIndex={0}
            onClick={() => handleSelectBusiness(business.type)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleSelectBusiness(business.type)
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
                paddingTop: 90,
              }}
            >
              {business.type === 'permit' ? (
                <ShopOutlined
                  style={{
                    fontSize: 24,
                    color: token.colorTextSecondary,
                    marginBottom: 8,
                  }}
                />
              ) : (
                <CalendarOutlined
                  style={{
                    fontSize: 24,
                    color: token.colorTextSecondary,
                    marginBottom: 8,
                  }}
                />
              )}
              <Title level={5} style={{ margin: 0 }}>
                {business.title}
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
                {business.description}
              </Text>
              <div>
                <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                  Best for:
                </Text>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: token.colorTextSecondary }}>
                  {business.bestFor.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}

        <Divider style={{ margin: '24px 0' }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Already have an existing business?
          </Text>
        </Divider>

        {/* Link Existing Business Option */}
        <div
          role="button"
          tabIndex={0}
          onClick={onLinkExisting}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onLinkExisting()
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
              paddingTop: 90,
            }}
          >
            <LinkOutlined
              style={{
                fontSize: 24,
                color: token.colorTextSecondary,
                marginBottom: 8,
              }}
            />
            <Title level={5} style={{ margin: 0 }}>
              Link Existing Business
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
                fontSize: 14,
                lineHeight: 1.5,
                color: token.colorText,
              }}
            >
              Already have a business registered with BPLO? Link it to your account.
            </Text>
          </div>
        </div>
      </div>

      <Text type="secondary" style={{ fontSize: 12, display: 'block', textAlign: 'center', marginTop: 24 }}>
        You can always add another business type later or remove one if you make a mistake.
      </Text>
    </div>
  )
}
