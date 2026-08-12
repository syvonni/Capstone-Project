import { useState, useEffect } from 'react'
import { Typography, theme } from 'antd'
import { useLottie } from 'lottie-react'

const { Title } = Typography

export default function AnimatedBrandLogo({
  size = 32,
  showBrandName = true,
  collapsed = false,
  onClick,
}) {
  const { token } = theme.useToken()
  const [animationData, setAnimationData] = useState(null)

  useEffect(() => {
    fetch('/LogoLottie.json')
      .then((res) => res.json())
      .then((data) => setAnimationData(data))
      .catch((err) => console.error('Failed to load logo animation:', err))
  }, [])

  const options = {
    animationData,
    loop: false,
    autoplay: false,
    style: {
      width: '100%',
      height: '100%',
      display: 'block',
    },
  }

  const { View, play, goToAndStop } = useLottie(options)

  const handleMouseEnter = () => {
    goToAndStop(0)
    play()
  }

  const handleClick = () => {
    onClick?.()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick?.()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: collapsed ? 0 : 12,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'gap 0.2s ease-in-out',
      }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
    >
      <div
        style={{
          width: size,
          height: size,
          flexShrink: 0,
          overflow: 'hidden',
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {View}
      </div>
      {showBrandName && (
        <Title
          level={4}
          style={{
            margin: 0,
            lineHeight: 1.2,
            color: token.colorText,
            fontSize: size >= 40 ? '20px' : '18px',
            opacity: collapsed ? 0 : 1,
            width: collapsed ? 0 : 'auto',
            transition: 'opacity 0.2s ease-in-out, width 0.2s ease-in-out',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          {import.meta.env.VITE_APP_BRAND_NAME || 'BizClear'}
        </Title>
      )}
    </div>
  )
}
