import { useEffect, useState, useRef } from 'react'
import { postSessionActivity } from '../services/sessionService.js'
import { getCurrentUser } from '../lib/authEvents.js'

/**
 * Simple session timeout hook
 */
export function useSessionTimeout({ timeoutMs = 60 * 60 * 1000, warningMs = 2 * 60 * 1000, onTimeout, onWarning } = {}) {
  const [remaining, setRemaining] = useState(timeoutMs)
  const onTimeoutRef = useRef(onTimeout)
  const onWarningRef = useRef(onWarning)

  // Keep refs in sync with latest callbacks
  useEffect(() => {
    onTimeoutRef.current = onTimeout
    onWarningRef.current = onWarning
  }, [onTimeout, onWarning])

  useEffect(() => {
    let interval = null
    let warningFired = false

    const tick = () => {
      setRemaining((prev) => {
        const next = prev - 1000
        if (next <= warningMs && !warningFired) {
          warningFired = true
          onWarningRef.current?.()
        }
        if (next <= 0) {
          onTimeoutRef.current?.()
          clearInterval(interval)
          return 0
        }
        return next
      })
    }

    const start = () => { interval = setInterval(tick, 1000) }
    const stop = () => { if (interval) { clearInterval(interval); interval = null } }

    const onVisibility = () => {
      if (document.hidden) {
        stop()
      } else {
        start()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    start()

    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [timeoutMs, warningMs])

  useEffect(() => {
    // refresh server activity on mount, but only if user is logged in
    const currentUser = getCurrentUser()
    if (currentUser) {
      postSessionActivity().catch(() => null)
    }
  }, [])

  return { remaining }
}
