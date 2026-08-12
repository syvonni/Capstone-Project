import React, { useState } from 'react'
import { Typography, Grid, theme, Card } from 'antd'
import { WarningOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import BizClearLogo from '@/shared/components/graphics/BizClearLogo.jsx'
import BlurFade from '@/shared/components/animations/BlurFade.jsx'
import ZipperReveal from '@/shared/components/graphics/MosaicArt.jsx'
import PanAnimation from '@/shared/components/animations/PanAnimation.jsx'
import AnnouncementsCard from '@/shared/components/cms/AnnouncementsCard.jsx'
import { BENTO_CARDS } from '@/features/public/constants/landing.constants.js'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { useBreakpoint } = Grid

export default function HeroSection({
  announcementItems,
  announcements,
  maintenanceStatus,
  hasAnnouncementPanel,
  defaultOpenKey,
  _onNavigate,
}) {
  const { token } = theme.useToken()
  const screens = useBreakpoint()
  const navigate = useNavigate()
  const [hoveredCard, setHoveredCard] = useState(null)

  // Filter bento cards based on maintenance status
  const visibleBentoCards = BENTO_CARDS.filter(card => {
    if (maintenanceStatus?.active) {
      // Hide these cards during maintenance
      const hiddenIds = ['apply-now', 'track-application', 'business-search', 'office-location']
      return !hiddenIds.includes(card.id)
    }
    return true
  })

  return (
    <div
      data-hero-section
      style={{
        width: '100vw',
        minHeight: screens.lg ? '100vh' : 'auto',
        height: screens.lg ? '100vh' : 'auto',
        display: 'flex',
        flexDirection: screens.lg ? 'row' : 'column',
        overflow: 'hidden',
      }}
    >
      {/* Left Panel - Art (60% on desktop, remaining space on mobile) */}
      <ZipperReveal
        screens={screens}
        style={{
          width: screens.lg ? '60%' : '100%',
          height: screens.lg ? '100%' : 'auto',
          flex: screens.lg ? 1 : 1,
          minHeight: screens.lg ? 'none' : '120px',
        }}
      >
        <PanAnimation
          imageUrl="/Mosaic.png"
          direction="southeast"
          speed={30}
          screens={screens}
        />
      </ZipperReveal>

      {/* Right Panel - Content (40% on desktop, 100% on mobile) */}
      <div style={{
        width: screens.lg ? '40%' : '100%',
        height: screens.lg ? 'auto' : 'auto',
        background: token.colorBgContainer,
        padding: screens.lg ? '32px' : '24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: screens.lg ? 'center' : 'flex-start',
        overflowX: 'hidden',
        overflowY: screens.lg ? 'auto' : 'visible',
        flex: screens.lg ? 'none' : '0 0 auto',
        minHeight: screens.lg ? '100vh' : 'auto',
      }}>
        {/* Bento Grid */}
        <div style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gridAutoRows: screens.lg ? '140px' : '120px',
          gap: screens.lg ? 12 : 8,
          paddingTop: screens.lg ? 0 : 0,
          marginBottom: screens.lg ? 12 : 8,
        }}>
          {visibleBentoCards.map((card, index) => (
            <div
              key={card.id}
              style={{
                gridColumn: card.span === 24 ? 'span 2' : 'span 1',
                gridRow: card.isTall ? 'span 2' : 'span 1',
                height: '100%',
              }}
            >
              <BlurFade delay={index * 0.1} duration={0.5}>
                <Card
                size="small"
                style={{
                  height: '100%',
                  background: token.colorBgContainer,
                  border: (card.link || card.scrollTo) && screens.lg && hoveredCard === card.id
                    ? `1px solid ${token.colorPrimary}`
                    : `1px solid ${token.colorBorder}`,
                  borderRadius: token.borderRadiusLG,
                  cursor: (card.link || card.scrollTo) ? 'pointer' : 'default',
                  transition: screens.lg ? 'border-color 0.2s, box-shadow 0.2s, transform 0.2s' : 'none',
                  boxShadow: (card.link || card.scrollTo) && screens.lg && hoveredCard === card.id
                    ? token.boxShadowCard
                    : 'none',
                  transform: (card.link || card.scrollTo) && screens.lg && hoveredCard === card.id ? 'scale(1.02)' : 'scale(1)',
                }}
                styles={{
                  body: {
                    padding: screens.lg ? 16 : 12,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    alignItems: 'flex-start',
                  }
                }}
                onMouseEnter={screens.lg ? () => setHoveredCard(card.id) : undefined}
                onMouseLeave={screens.lg ? () => setHoveredCard(null) : undefined}
                onClick={() => {
                  if (card.link) {
                    navigate(card.link)
                  } else if (card.scrollTo) {
                    const element = document.getElementById(card.scrollTo)
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth' })
                    }
                  }
                }}
              >
                {card.icon === 'bizclear' ? (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    transition: 'transform 0.3s ease-out',
                  }}>
                    <BizClearLogo width={screens.lg ? 32 : 28} style={{ marginBottom: 8 }} />
                    <Title level={5} style={{ margin: 0, fontSize: screens.lg ? 20 : 18 }}>
                      {card.title}
                    </Title>
                    <Text type="secondary" style={{ display: 'block', marginTop: 4, wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                      {card.description}
                    </Text>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                  }}>
                    {React.createElement(card.icon, {
                      style: { fontSize: screens.lg ? 24 : 20, color: token.colorTextSecondary, marginBottom: 8 }
                    })}
                    <Title level={5} style={{ margin: 0 }}>
                      {card.title}
                    </Title>
                    {card.description && (
                      <Text type="secondary" style={{ display: 'block', marginTop: 4, wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                        {card.description}
                      </Text>
                    )}
                    {(card.link || card.scrollTo) && (
                      <div style={{
                        maxHeight: screens.lg && hoveredCard === card.id ? 30 : 0,
                        overflow: 'hidden',
                        transition: screens.lg ? 'max-height 0.15s ease-out' : 'none',
                      }}>
                        <Text
                          style={{
                            display: 'block',
                            marginTop: 8,
                            color: token.colorPrimary,
                            fontSize: 12,
                            fontWeight: 500,
                            opacity: screens.lg && hoveredCard === card.id ? 1 : 0,
                            transform: screens.lg && hoveredCard === card.id ? 'translateY(0)' : 'translateY(10px)',
                            transition: screens.lg ? 'opacity 0.15s ease-out, transform 0.15s ease-out' : 'none',
                          }}
                        >
                          {card.linkText || 'Learn more →'}
                        </Text>
                      </div>
                    )}
                  </div>
                )}
              </Card>
              </BlurFade>
            </div>
          ))}
        </div>

        {/* Maintenance Card */}
        {maintenanceStatus?.active && (
          <BlurFade delay={visibleBentoCards.length * 0.1} duration={0.5} fullHeight={false}>
            <Card
              size="small"
              style={{
                width: '100%',
                marginTop: screens.lg ? 12 : 8,
                background: token.colorBgContainer,
                border: `1px solid ${token.colorBorder}`,
                borderRadius: token.borderRadiusLG,
              }}
              styles={{
                body: {
                  padding: screens.lg ? 16 : 12,
                  paddingTop: screens.lg ? 48 : 32,
                  height: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  alignItems: 'flex-start',
                }
              }}
            >
              <WarningOutlined style={{ fontSize: screens.lg ? 24 : 20, color: token.colorTextSecondary, marginBottom: 8 }} />
              <Title level={5} style={{ margin: 0 }}>
                {maintenanceStatus.active ? 'System Maintenance' : 'Scheduled Maintenance'}
              </Title>
              <Text style={{ display: 'block', marginTop: 4, wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                {(maintenanceStatus.message || "We're performing scheduled maintenance. Some features may be temporarily unavailable.").replace(/^Upcoming:\s*/i, '')}
              </Text>
              {maintenanceStatus.scheduledStartAt && (
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
                  Starting at: {dayjs(maintenanceStatus.scheduledStartAt).format('MMM D, YYYY h:mm A')}
                </Text>
              )}
              {maintenanceStatus.expectedResumeAt && (
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>
                  Back online at: {dayjs(maintenanceStatus.expectedResumeAt).format('MMM D, YYYY h:mm A')}
                </Text>
              )}
            </Card>
          </BlurFade>
        )}

        {/* Announcements Card */}
        {hasAnnouncementPanel && (
          <AnnouncementsCard
            announcementItems={announcementItems}
            announcements={announcements}
            defaultOpenKey={defaultOpenKey}
            enableUnreadTracking={false}
            delay={(visibleBentoCards.length + (maintenanceStatus?.active ? 1 : 0)) * 0.1}
          />
        )}
      </div>
    </div>
  )
}
