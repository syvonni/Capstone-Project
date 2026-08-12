import { useState } from 'react'
import { Typography, Grid, theme, Card } from 'antd'
import { CustomerServiceOutlined } from '@ant-design/icons'
import DynamicFaqSection from '@/shared/components/cms/DynamicFaqSection'
import BlurFade from '@/shared/components/animations/BlurFade.jsx'

const { Title, Text } = Typography
const { useBreakpoint } = Grid

export default function FaqSection() {
  const { token } = theme.useToken()
  const screens = useBreakpoint()
  const [hoveredCard, setHoveredCard] = useState(null)

  const horizontalPadding = screens.xl ? '192px' : screens.lg ? '128px' : screens.md ? '64px' : '24px'

  return (
    <BlurFade delay={0.2} duration={0.5} onViewport>
      <div
        id="faq-section"
        style={{
          scrollMarginTop: 80,
          width: '100%',
          padding: `80px ${horizontalPadding}`,
          flex: 1,
        }}
      >
        <div>
          <div style={{ marginBottom: 32 }}>
            <Title
              level={4}
              style={{
                marginTop: 0,
                marginBottom: 8,
                fontSize: screens.md ? 20 : 18,
                lineHeight: 1.25,
                color: token.colorTextHeading,
                textAlign: 'left',
              }}
            >
              Frequently Asked Questions
            </Title>
            <Text
              style={{
                display: 'block',
                marginTop: 0,
                marginBottom: 8,
                fontSize: screens.md ? 13 : 13,
                lineHeight: 1.25,
                color: token.colorTextSecondary,
                textAlign: 'left',
              }}
            >
              Quick answers to common questions about permits and applications.
            </Text>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: screens.lg ? '2fr 1fr' : '1fr',
              gridTemplateRows: screens.lg ? 'auto' : 'auto auto',
              gap: 16,
              marginTop: 32,
            }}
          >
            <DynamicFaqSection
              slotId="landing-page-faq"
              hideWrapper
              hideHeader
            />

            <Card
              size="small"
              style={{
                background: token.colorBgContainer,
                border: screens.lg && hoveredCard === 'help' ? `1px solid ${token.colorPrimary}` : `1px solid ${token.colorBorder}`,
                borderRadius: token.borderRadiusLG,
                cursor: 'pointer',
                transition: screens.lg ? 'border-color 0.2s, box-shadow 0.2s, transform 0.2s' : 'none',
                boxShadow: screens.lg && hoveredCard === 'help' ? token.boxShadowCard : 'none',
                transform: screens.lg && hoveredCard === 'help' ? 'scale(1.02)' : 'scale(1)',
              }}
              styles={{
                body: {
                  padding: screens.lg ? 16 : 12,
                  height: '100%',
                  display: 'flex',
                  paddingTop: screens.lg ? 90 : 48,
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  alignItems: 'flex-start',
                }
              }}
              onMouseEnter={screens.lg ? () => setHoveredCard('help') : undefined}
              onMouseLeave={screens.lg ? () => setHoveredCard(null) : undefined}
              onClick={() => window.location.href = '/help'}
            >
              <CustomerServiceOutlined
                style={{
                  fontSize: screens.lg ? 24 : 20,
                  color: token.colorTextSecondary,
                  marginBottom: 8,
                }}
              />
              <Title level={5} style={{ margin: 0, fontSize: 16 }}>
                Need More Help?
              </Title>
              <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
                Visit our Help Center for detailed guides and support
              </Text>
              <div
                style={{
                  maxHeight: screens.lg && hoveredCard === 'help' ? 30 : 0,
                  overflow: 'hidden',
                  transition: screens.lg ? 'max-height 0.15s ease-out' : 'none',
                }}
              >
                <Text
                  style={{
                    display: 'block',
                    marginTop: 8,
                    color: token.colorPrimary,
                    fontSize: 12,
                    fontWeight: 500,
                    opacity: screens.lg && hoveredCard === 'help' ? 1 : 0,
                    transform: screens.lg && hoveredCard === 'help' ? 'translateY(0)' : 'translateY(10px)',
                    transition: screens.lg ? 'opacity 0.15s ease-out, transform 0.15s ease-out' : 'none',
                  }}
                >
                  Get help →
                </Text>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </BlurFade>
  )
}
