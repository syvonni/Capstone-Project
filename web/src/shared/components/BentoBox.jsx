import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Typography, Card, theme, Grid } from 'antd'
import CountUp from 'react-countup'
import BizClearLogo from '@/shared/components/graphics/BizClearLogo.jsx'
import BlurFade from '@/shared/components/animations/BlurFade.jsx'

const { Title, Text } = Typography

export default function BentoBox({
  card,
  index = 0,
  delay = index * 0.1,
  duration = 0.5,
  onViewport = false,
  fullHeight = true,
  animated = true,
  inView = true,
  style = {},
  bodyStyle = {},
}) {
  const { token } = theme.useToken()
  const screens = Grid.useBreakpoint()
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(false)

  const isInteractive = !!(card.link || card.scrollTo)
  const isLarge = !!screens.lg

  const handleClick = () => {
    if (card.link) {
      navigate(card.link)
    } else if (card.scrollTo) {
      const element = document.getElementById(card.scrollTo)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  const cardStyle = {
    height: '100%',
    background: token.colorBgContainer,
    border:
      isInteractive && isLarge && hovered
        ? `1px solid ${token.colorPrimary}`
        : `1px solid ${token.colorBorder}`,
    borderRadius: token.borderRadiusLG,
    cursor: isInteractive ? 'pointer' : 'default',
    transition: isLarge
      ? 'border-color 0.2s, box-shadow 0.2s, transform 0.2s'
      : 'none',
    boxShadow:
      isInteractive && isLarge && hovered
        ? token.boxShadowCard
        : 'none',
    transform:
      isInteractive && isLarge && hovered
        ? 'scale(1.02)'
        : 'scale(1)',
  }

  const cardBody = {
    paddingTop: isLarge ? 16 : 12,
    paddingRight: isLarge ? 16 : 12,
    paddingBottom: isLarge ? 16 : 12,
    paddingLeft: isLarge ? 16 : 12,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  }

  const renderContent = () => {
    if (card.value !== undefined) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
          }}
        >
          <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.5 }}>
            {card.title}
          </Text>
          <Text
            style={{
              display: 'block',
              fontSize: isLarge ? 32 : 28,
              fontWeight: 700,
              color: token.colorTextHeading,
              lineHeight: 1.1,
            }}
          >
            <CountUp
              end={inView ? Number(card.value) : 0}
              separator=","
              duration={1.5}
            />
          </Text>
        </div>
      )
    }

    if (card.icon === 'bizclear') {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            transition: 'transform 0.3s ease-out',
          }}
        >
          <BizClearLogo
            width={isLarge ? 32 : 28}
            style={{ marginBottom: 8 }}
          />
          <Title
            level={5}
            style={{ margin: 0, fontSize: isLarge ? 20 : 18 }}
          >
            {card.title}
          </Title>
          <Text
            type="secondary"
            style={{
              display: 'block',
              marginTop: 4,
              fontSize: 12,
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              whiteSpace: 'pre-line',
            }}
          >
            {card.description}
          </Text>
        </div>
      )
    }

    const Icon = card.icon
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
        }}
      >
        {Icon && (
          <div
            style={{
              fontSize: 16,
              color: token.colorText,
              border: '1px solid',
              borderColor: token.colorBorder,
              padding: 6,
              height: 32,
              width: 32,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 8,
            }}
          >
            <Icon style={{ fontSize: 16 }} />
          </div>
        )}
        <Text style={{ margin: 0 }}>
          {card.title}
        </Text>
        {card.description && (
          <Text
            type="secondary"
            style={{
              display: 'block',
              marginTop: 4,
              fontSize: 12,
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              whiteSpace: 'pre-line',
            }}
          >
            {card.description}
          </Text>
        )}
        {isInteractive && (
          <div
            style={{
              maxHeight: isLarge && hovered ? 30 : 0,
              overflow: 'hidden',
              transition: isLarge
                ? 'max-height 0.15s ease-out'
                : 'none',
            }}
          >
            <Text
              style={{
                display: 'block',
                marginTop: 8,
                color: token.colorPrimary,
                fontSize: 12,
                fontWeight: 500,
                opacity: isLarge && hovered ? 1 : 0,
                transform: isLarge && hovered
                  ? 'translateY(0)'
                  : 'translateY(10px)',
                transition: isLarge
                  ? 'opacity 0.15s ease-out, transform 0.15s ease-out'
                  : 'none',
              }}
            >
              {card.linkText || 'Learn more →'}
            </Text>
          </div>
        )}
      </div>
    )
  }

  const cardElement = (
    <Card
      size="small"
      style={{ ...cardStyle, ...style }}
      styles={{ body: { ...cardBody, ...bodyStyle } }}
      onMouseEnter={isLarge ? () => setHovered(true) : undefined}
      onMouseLeave={isLarge ? () => setHovered(false) : undefined}
      onClick={isInteractive ? handleClick : undefined}
    >
      {renderContent()}
    </Card>
  )

  if (!animated) {
    return cardElement
  }

  return (
    <BlurFade
      delay={delay}
      duration={duration}
      onViewport={onViewport}
      fullHeight={fullHeight}
    >
      {cardElement}
    </BlurFade>
  )
}
