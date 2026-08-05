import React, { useState, useRef, useCallback } from 'react'
import { useAuthSession } from '@/features/authentication'
import { getMe } from '@/features/authentication/services/authService'
import StepUpModal from '@/shared/components/StepUpModal'

/**
 * Hook for step-up authentication. Use before performing sensitive actions.
 * Generic component used by both admin and staff roles.
 * @returns {{ runWithStepUp: (callback: (stepUpToken: string) => Promise<void>) => Promise<void>, stepUpModal: React.ReactNode }}
 */
export function useStepUp() {
  const { currentUser } = useAuthSession()
  const [open, setOpen] = useState(false)
  const [stepUpMfaMethod, setStepUpMfaMethod] = useState(null)
  const resolveRef = useRef(null)
  const rejectRef = useRef(null)
  const pendingCallbackRef = useRef(null)

  const runWithStepUp = useCallback(
    (callback) => {
      return new Promise((resolve, reject) => {
        resolveRef.current = resolve
        rejectRef.current = reject
        pendingCallbackRef.current = callback
        setStepUpMfaMethod(null)
        getMe()
          .then((me) => {
            const method = me?.mfaMethod ?? currentUser?.mfaMethod ?? 'authenticator'
            setStepUpMfaMethod(method)
            setOpen(true)
          })
          .catch(() => {
            setStepUpMfaMethod(currentUser?.mfaMethod ?? 'authenticator')
            setOpen(true)
          })
      })
    },
    [currentUser?.mfaMethod]
  )

  const handleVerified = useCallback((stepUpToken) => {
    setStepUpMfaMethod(null)
    const cb = pendingCallbackRef.current
    pendingCallbackRef.current = null
    setOpen(false)
    if (cb) {
      Promise.resolve(cb(stepUpToken))
        .then(() => resolveRef.current?.())
        .catch((e) => rejectRef.current?.(e))
    } else {
      resolveRef.current?.()
    }
  }, [])

  const handleCancel = useCallback(() => {
    pendingCallbackRef.current = null
    setOpen(false)
    setStepUpMfaMethod(null)
    resolveRef.current?.()
  }, [])

  const mfaMethod = stepUpMfaMethod ?? currentUser?.mfaMethod ?? 'authenticator'
  const stepUpModal = (
    <StepUpModal
      open={open}
      onCancel={handleCancel}
      onVerified={handleVerified}
      mfaMethod={mfaMethod}
    />
  )

  return { runWithStepUp, stepUpModal }
}
