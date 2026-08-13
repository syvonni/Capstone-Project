import { useState } from 'react'
import { Typography, Grid, theme, Card } from 'antd'
import { EnvironmentOutlined, PhoneOutlined, ClockCircleOutlined } from '@ant-design/icons'
import BentoBox from '@/shared/components/BentoBox.jsx'

const { Title, Paragraph, Text } = Typography
const { useBreakpoint } = Grid

export default function OfficeLocationSection() {
  const screens = useBreakpoint()
  const { token } = theme.useToken()
  const [hoveredCard, setHoveredCard] = useState(null)

  const horizontalPadding = screens.xl ? '192px' : screens.lg ? '128px' : screens.md ? '64px' : '24px'

  const infoCards = [
    {
      id: 'address',
      icon: EnvironmentOutlined,
      title: 'Address',
      description: 'City Hall Complex, Lucap Road\nAlaminos City, Pangasinan 2404',
    },
    {
      id: 'contact',
      icon: PhoneOutlined,
      title: 'Contact',
      description: 'Phone: (075) 551-1234\nEmail: bplo@alaminoscity.gov.ph',
    },
    {
      id: 'hours',
      icon: ClockCircleOutlined,
      title: 'Hours',
      description: 'Mon-Fri: 8:00 AM - 5:00 PM\nSat: 8:00 AM - 12:00 PM',
    },
  ]

  return (
    <section
      id="office-location-section"
      style={{
        width: '100%',
        padding: `80px ${horizontalPadding}`,
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
            Office Location
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
            Visit us in person or contact us for assistance.
          </Text>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: screens.lg ? '2fr 1fr' : screens.md ? '1fr' : '1fr',
            gridTemplateRows: screens.lg ? 'repeat(3, 1fr)' : 'auto',
            gap: 16,
          }}
        >
          <Card
            size="small"
            style={{
              gridRow: screens.lg ? '1 / 4' : 'auto',
              gridColumn: screens.lg ? '1 / 2' : 'auto',
              border: `1px solid ${token.colorBorder}`,
              borderRadius: token.borderRadiusLG,
              padding: 0,
              overflow: 'hidden',
              background: token.colorBgContainer,
              cursor: 'default',
              transition: screens.lg ? 'border-color 0.2s, box-shadow 0.2s, transform 0.2s' : 'none',
              boxShadow: screens.lg && hoveredCard === 'map' ? token.boxShadowCard : 'none',
              transform: screens.lg && hoveredCard === 'map' ? 'scale(1.02)' : 'scale(1)',
            }}
            styles={{
              body: {
                padding: 0,
                height: '100%',
              }
            }}
            onMouseEnter={screens.lg ? () => setHoveredCard('map') : undefined}
            onMouseLeave={screens.lg ? () => setHoveredCard(null) : undefined}
          >
            <iframe
              title="Alaminos City Hall BPLO Location"
              src="https://maps.google.com/maps?q=Alaminos+City+Hall,+Pangasinan,+Philippines&t=&z=16&ie=UTF8&iwloc=&output=embed"
              width="100%"
              height={screens.lg ? '100%' : 300}
              style={{
                border: 'none',
                display: 'block',
                minHeight: screens.lg ? 400 : 300,
              }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </Card>

          {infoCards.map((card) => (
            <BentoBox
              key={card.id}
              card={card}
              animated={false}
              bodyStyle={{ paddingTop: screens.lg ? 90 : 48 }}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
