import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageSlideContext } from '@/shared/hooks/usePageSlide.js'

export default function PageSlide({ children, duration = 0.4 }) {
  const [state, setState] = useState('entering')
  const navigate = useNavigate()

  useEffect(() => {
    // Trigger enter animation on next frame
    const timer = requestAnimationFrame(() => {
      setState('entered')
    })
    return () => cancelAnimationFrame(timer)
  }, [])

  const exit = useCallback((targetPath = '/') => {
    setState('exiting')
    setTimeout(() => {
      navigate(targetPath)
    }, duration * 1000)
  }, [navigate, duration])

  return (
    <PageSlideContext.Provider value={{ exit }}>
      {/* Instant white backdrop - no grey visible */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 900,
          background: '#fff',
          overflow: 'auto',
        }}
      >
        {/* Content slides up / down */}
        <div
          style={{
            width: '100%',
            minHeight: '100%',
            opacity: state === 'entered' ? 1 : 0,
            transform: state === 'entered'
              ? 'translateY(0)'
              : state === 'exiting'
                ? 'translateY(40px)'
                : 'translateY(40px)',
            transition: `opacity ${duration}s cubic-bezier(0.16, 1, 0.3, 1), transform ${duration}s cubic-bezier(0.16, 1, 0.3, 1)`,
          }}
        >
          {children}
        </div>
      </div>
    </PageSlideContext.Provider>
  )
}
