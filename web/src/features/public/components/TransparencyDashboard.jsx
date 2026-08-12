import { useEffect, useRef, useState } from 'react'
import { Typography, Grid, theme, Card, Statistic } from 'antd'
import CountUp from 'react-countup'
import BlurFade from '@/shared/components/animations/BlurFade.jsx'

const { Title, Text } = Typography
const { useBreakpoint } = Grid

const countUpFormatter = (value) => (
  <CountUp key={String(value)} end={Number(value)} separator="," duration={1.5} />
)

export default function TransparencyDashboard({ publicStats }) {
  const { token } = theme.useToken()
  const screens = useBreakpoint()
  const [inView, setInView] = useState(false)
  const [hoveredCard, setHoveredCard] = useState(null)
  const ref = useRef(null)

  const sampleValues = [
    248,
    1364,
    29,
  ]

  const statCards = [
    {
      label: 'Businesses registered this year',
      value: publicStats?.totalRegisteredThisYear ?? sampleValues[0],
    },
    {
      label: 'Applications processed this year',
      value: publicStats?.applicationsProcessedThisYear ?? sampleValues[1],
    },
    {
      label: 'Pending applications',
      value: publicStats?.pendingApplications ?? sampleValues[2],
    },
  ]

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          setInView(true)
          obs.unobserve(el)
        }
      })
    }, { root: null, rootMargin: '0px 0px -20% 0px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const horizontalPadding = screens.xl ? '192px' : screens.lg ? '128px' : screens.md ? '64px' : '24px'

  return (
    <section
      ref={ref}
      style={{
        width: '100%',
        padding: `80px ${horizontalPadding}`,
        boxSizing: 'border-box',
      }}
    >
      <div>
        <BlurFade delay={0.05} duration={0.45} onViewport={true}>
          <div style={{ marginBottom: 32, textAlign: 'left' }}>
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
              Trusted public progress
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
              See the momentum behind every business permit and approval.
            </Text>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: screens.md ? 'nowrap' : 'wrap',
              gap: 12,
              width: '100%',
              justifyContent: screens.md ? 'space-between' : 'center',
              alignItems: 'stretch',
            }}
          >
            {statCards.map((item, index) => (
              <BlurFade key={item.label} delay={0.12 + index * 0.08} duration={0.35} fullHeight={false}>
                <Card
                  size="small"
                  style={{
                    flex: screens.md ? '1 1 0' : '1 1 100%',
                    minWidth: screens.md ? 0 : '100%',
                    width: '100%',
                    background: token.colorBgContainer,
                    borderRadius: token.borderRadiusLG,
                    border: `1px solid ${token.colorBorder}`,
                    cursor: 'default',
                    transition: screens.md ? 'border-color 0.2s, box-shadow 0.2s, transform 0.2s' : 'none',
                    boxShadow: screens.md && hoveredCard === index ? token.boxShadowCard : 'none',
                    transform: screens.md && hoveredCard === index ? 'scale(1.02)' : 'scale(1)',
                  }}
                  styles={{ body: { 
                    padding: screens.md ? '96px 14px 12px' : '48px 12px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    alignItems: 'flex-start',
                    textAlign: 'left',
                  } }}
                  onMouseEnter={screens.md ? () => setHoveredCard(index) : undefined}
                  onMouseLeave={screens.md ? () => setHoveredCard(null) : undefined}
                >
                  <Statistic
                    title={<Text type="secondary" style={{ fontSize: 13, lineHeight: 1.5 }}>{item.label}</Text>}
                    value={inView ? item.value : 0}
                    formatter={countUpFormatter}
                    valueStyle={{
                      display: 'block',
                      fontSize: screens.md ? 32 : 28,
                      fontWeight: 700,
                      color: token.colorTextHeading,
                      lineHeight: 1.1,
                    }}
                  />
                </Card>
              </BlurFade>
            ))}
          </div>
      </BlurFade>
      </div>
    </section>
  )
}
