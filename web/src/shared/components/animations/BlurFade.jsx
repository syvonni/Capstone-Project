import { useEffect, useRef } from 'react'

export default function BlurFade({
  children,
  delay = 0,
  duration = 0.4,
  direction = 'down',
  blur = '6px',
  className = '',
  fullHeight = true,
  onViewport = false,
  rootMargin = '0px 0px -20% 0px',
}) {
  const ref = useRef(null)

  // Disable blur on iOS to avoid animation conflicts with nested animated elements
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const effectiveBlur = isIOS ? '0px' : blur

  // Inject keyframes once
  useEffect(() => {
    if (!document.getElementById('blur-fade-keyframes')) {
      const style = document.createElement('style')
      style.id = 'blur-fade-keyframes'
      style.textContent = `
        @keyframes blur-fade-in {
          from {
            opacity: 0;
            filter: blur(var(--blur));
            transform: translateY(var(--translate-y));
          }
          to {
            opacity: 1;
            filter: blur(0);
            transform: translateY(0);
          }
        }
      `
      document.head.appendChild(style)
    }
  }, [])

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const translateMap = {
      up: '-20px',
      down: '20px',
      left: '-20px',
      right: '20px',
    }

    element.style.setProperty('--blur', effectiveBlur)
    element.style.setProperty('--translate-y', translateMap[direction] || '20px')
    element.style.opacity = '0'

    const playAnimation = () => {
      // Ensure we don't override if already set
      element.style.animation = `blur-fade-in ${duration}s ease-out ${delay}s forwards`
    }

    if (onViewport && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            playAnimation()
            observer.unobserve(element)
          }
        })
      }, { root: null, rootMargin })

      observer.observe(element)
      return () => observer.disconnect()
    }

    // Default behavior: play immediately
    playAnimation()

    return () => {
      element.style.animation = ''
      element.style.opacity = ''
    }
  }, [delay, duration, direction, effectiveBlur, onViewport, rootMargin])

  return (
    <div ref={ref} className={className} style={{ height: fullHeight ? '100%' : 'auto', width: '100%', maxWidth: 'none' }}>
      {children}
    </div>
  )
}
