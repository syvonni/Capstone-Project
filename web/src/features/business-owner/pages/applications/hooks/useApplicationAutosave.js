import { useEffect, useRef, useCallback, useState } from 'react'
import { message } from 'antd'
import { getObjectHash } from '@/lib/deepEqual.js'

const DEFAULT_AUTOSAVE_DELAY_MS = 15000
const MARK_DIRTY_DELAY_MS = 2000
const MIN_AUTOSAVE_INTERVAL_MS = 10500 // slightly longer than the backend's 10s rate-limit window
const PENDING_SAVE_DELAY_MS = 1000
const MAX_RETRIES = 3
const RETRY_DELAYS = [1000, 2000, 4000] // Exponential backoff
const RATE_LIMIT_CODES = ['autosave_rate_limit_exceeded', 'rate_limit_exceeded']

export function useApplicationAutosave(formValues, onSave, enabled = true, options = {}, hasUnsavedChanges = false, onSaved = null, setHasUnsavedChanges = null) {
  const timerRef = useRef(null)
  const lastSavedHashRef = useRef(null)
  const isSavingRef = useRef(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [dirtyToken, setDirtyToken] = useState(0)
  const abortControllerRef = useRef(null)
  const formValuesRef = useRef(formValues)
  const pendingSaveRef = useRef(false)
  const performSaveRef = useRef(null)
  const nextAllowedSaveAtRef = useRef(0)
  const overrideDelayRef = useRef(null)
  const manualScheduleRef = useRef(false)

  const { delayMs = DEFAULT_AUTOSAVE_DELAY_MS } = options

  // Keep formValuesRef in sync
  useEffect(() => {
    formValuesRef.current = formValues
  }, [formValues])

  const scheduleSave = useCallback((targetDelay) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    const now = Date.now()
    const earliest = nextAllowedSaveAtRef.current || 0
    const wait = Math.max(targetDelay, earliest - now)

    timerRef.current = setTimeout(() => {
      timerRef.current = null

      // If a save is currently in flight, mark a pending save and let the
      // current save's finally block schedule the follow-up.
      if (isSavingRef.current) {
        pendingSaveRef.current = true
        return
      }

      const latest = formValuesRef.current
      const latestHash = getObjectHash(latest)

      // Nothing has changed since the last successful save.
      if (lastSavedHashRef.current && latestHash === lastSavedHashRef.current) {
        if (setHasUnsavedChanges) {
          setHasUnsavedChanges(false)
        }
        return
      }

      performSaveRef.current(latest)
    }, wait)
  }, [setHasUnsavedChanges])

  const performSave = useCallback(async (values, attempt = 0) => {
    // Cancel any in-flight request before starting a new one
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    isSavingRef.current = true
    setIsSaving(true)
    setSaveError(null)

    try {
      await onSave(values, { signal: abortControllerRef.current.signal, attempt })
      lastSavedHashRef.current = getObjectHash(values)
      // Respect the backend's 10s rate-limit window even on success
      nextAllowedSaveAtRef.current = Date.now() + MIN_AUTOSAVE_INTERVAL_MS
      // Notify parent that save completed successfully
      onSaved?.()
    } catch (err) {
      // Aborted saves are not failures
      if (err?.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
        return
      }

      console.error('Autosave failed:', err)

      const isRateLimit = err?.status === 429 || RATE_LIMIT_CODES.includes(err?.code)

      if (isRateLimit) {
        // The server told us when we can try again. Schedule a follow-up save
        // after that cooldown instead of immediately hammering the endpoint.
        nextAllowedSaveAtRef.current = Date.now() + (err?.retryAfter ?? MIN_AUTOSAVE_INTERVAL_MS)
        pendingSaveRef.current = true
      }

      // Don't retry 4xx errors (client errors will never succeed)
      const isClientError = err?.status >= 400 && err?.status < 500

      if (!isClientError && attempt < MAX_RETRIES - 1) {
        // Retry with exponential backoff for network errors and 5xx
        const delay = RETRY_DELAYS[attempt]
        await new Promise(resolve => setTimeout(resolve, delay))
        return performSaveRef.current(values, attempt + 1)
      }

      // All retries exhausted or client error
      const errorMsg = err?.message || 'Autosave failed. Please save manually.'
      // Don't spam toasts for rate limits; the cooldown handles those.
      if (!isRateLimit) {
        message.error(errorMsg)
      }
      setSaveError(err)
      // Keep unsaved flag true so user knows data is not saved
      if (setHasUnsavedChanges) {
        setHasUnsavedChanges(true)
      }
    } finally {
      isSavingRef.current = false
      setIsSaving(false)
    }

    // If a save was requested while we were busy, save the latest values
    if (pendingSaveRef.current) {
      pendingSaveRef.current = false
      const latest = formValuesRef.current
      const latestHash = getObjectHash(latest)
      if (lastSavedHashRef.current && latestHash === lastSavedHashRef.current) {
        return
      }
      scheduleSave(PENDING_SAVE_DELAY_MS)
    }
  }, [onSave, onSaved, setHasUnsavedChanges, scheduleSave])

  // Keep performSaveRef in sync
  performSaveRef.current = performSave

  const markDirty = useCallback((overrideDelay = null) => {
    if (!enabled) return

    overrideDelayRef.current = overrideDelay ?? MARK_DIRTY_DELAY_MS
    manualScheduleRef.current = true

    // Bumps the effect so it can consume the manual override.
    setDirtyToken(prev => prev + 1)

    if (setHasUnsavedChanges) {
      setHasUnsavedChanges(true)
    }
  }, [enabled, setHasUnsavedChanges])

  // Trigger autosave when form values change.
  // We watch both hasUnsavedChanges and formValues so the timer restarts on
  // every keystroke (true debounce), not just on the first change.
  useEffect(() => {
    if (!enabled || !hasUnsavedChanges) {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      return
    }

    // If a save is currently in flight, mark that we want to save again.
    if (isSavingRef.current) {
      pendingSaveRef.current = true
      // Consume any manual trigger so it doesn't leak into a later effect.
      manualScheduleRef.current = false
      overrideDelayRef.current = null
      return
    }

    // Clear any pending timer and start a fresh one
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    const useManual = manualScheduleRef.current
    const targetDelay = useManual ? (overrideDelayRef.current ?? delayMs) : delayMs
    manualScheduleRef.current = false
    overrideDelayRef.current = null

    scheduleSave(targetDelay)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [hasUnsavedChanges, enabled, delayMs, formValues, dirtyToken, scheduleSave])

  // Cleanup on unmount: cancel in-flight request and pending timer
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Navigation protection - warn user if unsaved changes
  useEffect(() => {
    if (!enabled) return undefined

    const handleBeforeUnload = (e) => {
      const currentHash = getObjectHash(formValues)
      if (lastSavedHashRef.current && currentHash !== lastSavedHashRef.current) {
        e.preventDefault()
        e.returnValue = '' // Chrome requires returnValue to be set
        return ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [formValues, enabled])

  return { isSaving, saveError, markDirty }
}
