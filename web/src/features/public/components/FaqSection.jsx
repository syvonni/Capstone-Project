import { Typography, Grid, theme } from 'antd'
import { CustomerServiceOutlined } from '@ant-design/icons'
import DynamicFaqSection from '@/shared/components/cms/DynamicFaqSection'
import BlurFade from '@/shared/components/animations/BlurFade.jsx'
import BentoBox from '@/shared/components/BentoBox.jsx'

const { Title, Text } = Typography
const { useBreakpoint } = Grid

export default function FaqSection() {
  const { token } = theme.useToken()
  const screens = useBreakpoint()

  const horizontalPadding = screens.xl ? '192px' : screens.lg ? '128px' : screens.md ? '64px' : '24px'

  const helpCard = {
    id: 'help',
    icon: CustomerServiceOutlined,
    title: 'Need More Help?',
    description: 'Visit our Help Center for detailed guides and support',
    link: '/help',
    linkText: 'Get help →',
  }

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

            <BentoBox
              card={helpCard}
              animated={false}
              bodyStyle={{ paddingTop: screens.lg ? 90 : 48 }}
            />
          </div>
        </div>
      </div>
    </BlurFade>
  )
}
