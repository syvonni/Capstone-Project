import { useEffect, useRef } from 'react'

export default function PanAnimation({
  imageUrl,
  direction = 'southeast',
  speed = 20, // seconds for one full cycle
  backgroundSize = '800px',
  mobileBackgroundSize = '400px',
  backgroundRepeat = 'repeat',
  backgroundPosition = 'center',
  screens,
  style = {},
}) {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Inject keyframes for pan animation
    const keyframeId = `pan-animation-${direction}-${speed}`
    if (!document.getElementById(keyframeId)) {
      const style = document.createElement('style')
      style.id = keyframeId

      // Define animation based on direction
      const animations = {
        southeast: `
          @keyframes pan-southeast {
            0% {
              background-position: 0 0;
            }
            100% {
              background-position: 100% 100%;
            }
          }
        `,
        southwest: `
          @keyframes pan-southwest {
            0% {
              background-position: 100% 0;
            }
            100% {
              background-position: 0 100%;
            }
          }
        `,
        northeast: `
          @keyframes pan-northeast {
            0% {
              background-position: 0 100%;
            }
            100% {
              background-position: 100% 0;
            }
          }
        `,
        northwest: `
          @keyframes pan-northwest {
            0% {
              background-position: 100% 100%;
            }
            100% {
              background-position: 0 0;
            }
          }
        `,
        south: `
          @keyframes pan-south {
            0% {
              background-position: 0 0;
            }
            100% {
              background-position: 0 100%;
            }
          }
        `,
        north: `
          @keyframes pan-north {
            0% {
              background-position: 0 100%;
            }
            100% {
              background-position: 0 0;
            }
          }
        `,
        east: `
          @keyframes pan-east {
            0% {
              background-position: 0 0;
            }
            100% {
              background-position: 100% 0;
            }
          }
        `,
        west: `
          @keyframes pan-west {
            0% {
              background-position: 100% 0;
            }
            100% {
              background-position: 0 0;
            }
          }
        `,
      }

      style.textContent = animations[direction] || animations.southeast
      document.head.appendChild(style)
    }

    // Apply animation to container (which has the background)
    const animationName = `pan-${direction}`
    container.style.animation = `${animationName} ${speed}s linear infinite`

    return () => {
      if (container) {
        container.style.animation = ''
      }
    }
  }, [direction, speed])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        backgroundImage: `url(${imageUrl})`,
        backgroundRepeat,
        backgroundSize: screens.md ? backgroundSize : mobileBackgroundSize,
        backgroundPosition,
        ...style,
      }}
    />
  )
}
