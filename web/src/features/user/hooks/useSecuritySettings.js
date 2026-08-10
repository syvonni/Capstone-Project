import { useState, useEffect, useCallback } from 'react'
import { usePasskeyManager } from '@/features/authentication/passkey/hooks/usePasskeyManager'
import { getActiveSessions, getSessionHistory, invalidateSession } from '@/features/authentication/services/sessionService'
import { useNotifier } from '@/shared/notifications.js'

/**
 * useSecuritySettings Hook
 * Handles security-related settings: MFA, passkeys, sessions
 */
export function useSecuritySettings() {
  const { error } = useNotifier()
  
  // Passkey management
  const { credentials: passkeys, isAdmin, hasPasskeys } = usePasskeyManager()
  
  // Session management
  const [sessions, setSessions] = useState([])
  const [sessionHistory, setSessionHistory] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)

  const loadSessions = useCallback(async () => {
    try {
      setSessionsLoading(true)
      const res = await getActiveSessions()
      setSessions(res?.sessions || [])
    } catch (err) {
      console.error('Failed to load sessions:', err)
      error(err, 'Failed to load sessions')
      setSessions([])
    } finally {
      setSessionsLoading(false)
    }
  }, [error])

  const loadSessionHistory = async () => {
    try {
      setHistoryLoading(true)
      const res = await getSessionHistory()
      setSessionHistory(res?.sessions || [])
    } catch (err) {
      console.error('Failed to load session history:', err)
      error(err, 'Failed to load session history')
      setSessionHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleInvalidateSession = async (sessionId) => {
    try {
      await invalidateSession(sessionId)
      await loadSessions()
    } catch (err) {
      console.error('Failed to invalidate session:', err)
      error(err, 'Failed to invalidate session')
    }
  }

  const handleInvalidateAllSessions = async () => {
    try {
      // Session invalidation is handled by authentication service
      // This is a placeholder for future implementation
      console.warn('Invalidate all sessions not yet implemented')
    } catch (err) {
      console.error('Failed to invalidate all sessions:', err)
      error(err, 'Failed to invalidate all sessions')
    }
  }

  // Auto-load sessions when component mounts
  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  return {
    // Passkey data
    passkeys,
    hasPasskeys,
    isAdmin,
    
    // Session data
    sessions,
    sessionHistory,
    sessionsLoading,
    historyLoading,
    
    // Session actions
    loadSessions,
    loadSessionHistory,
    invalidateSession: handleInvalidateSession,
    invalidateAllSessions: handleInvalidateAllSessions,
  }
}