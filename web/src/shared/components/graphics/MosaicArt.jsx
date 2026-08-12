import { useEffect, useRef } from 'react'

export default function ZipperReveal({
  children,
  stripCount = 8,
  mobileStripCount = 6,
  animationDuration = 0.6,
  delayPerStrip = 0.06,
  overlayColor = '#ffffff',
  screens,
  style = {},
}) {
  const containerRef = useRef(null)

  useEffect(() => {
    // Inject keyframes for vertical pull animation with reveal
    const keyframeId = `zipper-reveal-keyframes-${overlayColor.replace('#', '')}`
    if (!document.getElementById(keyframeId)) {
      const style = document.createElement('style')
      style.id = keyframeId
      style.textContent = `
        @keyframes zipper-pull-up {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-100%);
          }
        }
        @keyframes zipper-pull-down {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(100%);
          }
        }
      `
      document.head.appendChild(style)
    }

    const container = containerRef.current
    if (!container) return

    // Apply staggered animation to each strip after DOM is ready
    const timer = setTimeout(() => {
      const strips = container.querySelectorAll('.zipper-strip')
      if (!strips) return

      strips.forEach((strip, index) => {
        const isEven = index % 2 === 0
        const animationName = isEven ? 'zipper-pull-up' : 'zipper-pull-down'
        const delay = index * delayPerStrip

        strip.style.animation = `${animationName} ${animationDuration}s ease-out ${delay}s forwards`
      })
    }, 50)

    return () => {
      clearTimeout(timer)
      const strips = container?.querySelectorAll('.zipper-strip')
      if (!strips) return
      strips.forEach((strip) => {
        strip.style.animation = ''
      })
    }
  }, [screens, stripCount, mobileStripCount, animationDuration, delayPerStrip, overlayColor])

  // Create vertical strips for zipper effect
  const currentStripCount = screens.md ? stripCount : mobileStripCount
  const strips = Array.from({ length: currentStripCount }, (_, i) => i)

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
        position: 'relative',
        ...style,
      }}
    >
      {/* Content layer (image or any content) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
        }}
      >
        {children}
      </div>
      {/* Overlay strips */}
      {strips.map((index) => (
        <div
          key={index}
          className="zipper-strip"
          style={{
            flex: 1,
            height: '100%',
            backgroundColor: overlayColor,
            zIndex: 1,
            overflow: 'hidden',
          }}
        />
      ))}
    </div>
  )
}
