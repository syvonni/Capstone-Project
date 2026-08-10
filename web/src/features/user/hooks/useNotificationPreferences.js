import { useState, useEffect, useCallback, useRef } from 'react'
import notificationService from '@/features/user/services/notificationService'
import { useNotifier } from '@/shared/notifications.js'

/**
 * useNotificationPreferences Hook
 * Handles notification stream management and notification preferences
 */
export function useNotificationPreferences({ enabled = true }) {
  const { error } = useNotifier()
  
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [streamConnected, setStreamConnected] = useState(false)
  
  const eventSourceRef = useRef(null)
  const pollIntervalRef = useRef(null)

  /**
   * Load notifications
   */
  const loadNotifications = useCallback(async (options = {}) => {
    if (!enabled) return
    
    try {
      setLoading(true)
      const response = await notificationService.getNotifications(options)
      const items = response?.notifications || response || []
      setNotifications(Array.isArray(items) ? items : [])
    } catch (err) {
      console.error('Failed to load notifications:', err)
      error(err, 'Failed to load notifications')
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [enabled, error])

  /**
   * Load unread count
   */
  const loadUnreadCount = useCallback(async () => {
    if (!enabled) return
    
    try {
      const count = await notificationService.getUnreadCount()
      setUnreadCount(count)
    } catch (err) {
      console.error('Failed to load unread count:', err)
      setUnreadCount(0)
    }
  }, [enabled])

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId)
      // Update local state
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
      )
      await loadUnreadCount()
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
      error(err, 'Failed to mark notification as read')
    }
  }, [loadUnreadCount, error])

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead()
      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      )
      setUnreadCount(0)
    } catch (err) {
      console.error('Failed to mark all as read:', err)
      error(err, 'Failed to mark all as read')
    }
  }, [error])

  /**
   * Delete notification
   */
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId)
      // Update local state
      setNotifications(prev => 
        prev.filter(n => n._id !== notificationId)
      )
      await loadUnreadCount()
    } catch (err) {
      console.error('Failed to delete notification:', err)
      error(err, 'Failed to delete notification')
    }
  }, [loadUnreadCount, error])

  /**
   * Delete all notifications
   */
  const deleteAllNotifications = useCallback(async () => {
    try {
      const result = await notificationService.deleteAllNotifications()
      // Update local state
      setNotifications([])
      setUnreadCount(0)
      return result
    } catch (err) {
      console.error('Failed to delete all notifications:', err)
      error(err, 'Failed to delete all notifications')
      return null
    }
  }, [error])

  /**
   * Setup SSE stream for real-time notifications
   */
  const setupNotificationStream = useCallback(async () => {
    if (!enabled) return
    
    try {
      const { streamToken } = await notificationService.getNotificationStreamToken()
      if (!streamToken) {
        console.warn('Failed to get notification stream token')
        return
      }

      const eventSource = new EventSource(
        `/api/notifications/stream?token=${streamToken}`
      )

      eventSource.onmessage = (event) => {
        try {
          const notification = JSON.parse(event.data)
          setNotifications(prev => [notification, ...prev])
          setUnreadCount(prev => prev + 1)
        } catch (err) {
          console.error('Failed to parse notification:', err)
        }
      }

      eventSource.onerror = (err) => {
        console.error('Notification stream error:', err)
        setStreamConnected(false)
      }

      eventSource.onopen = () => {
        setStreamConnected(true)
      }

      eventSourceRef.current = eventSource
    } catch (err) {
      console.error('Failed to setup notification stream:', err)
      setStreamConnected(false)
    }
  }, [enabled])

  /**
   * Cleanup notification stream
   */
  const cleanupNotificationStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
      setStreamConnected(false)
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }, [])

  // Auto-load notifications when enabled
  useEffect(() => {
    if (enabled) {
      loadNotifications()
      loadUnreadCount()
      
      // Setup SSE stream (commented out as per existing codebase pattern)
      // setupNotificationStream()
      
      // Fallback polling every 30 seconds
      pollIntervalRef.current = setInterval(() => {
        loadUnreadCount()
      }, 30000)
    }

    return () => {
      cleanupNotificationStream()
    }
  }, [enabled, loadNotifications, loadUnreadCount, setupNotificationStream, cleanupNotificationStream])

  return {
    // Data
    notifications,
    unreadCount,
    loading,
    streamConnected,
    
    // Actions
    loadNotifications,
    loadUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    
    // Stream management
    setupNotificationStream,
    cleanupNotificationStream,
  }
}