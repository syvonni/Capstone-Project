/**
 * Custom hook for business dashboard data fetching and socket events
 * Extracts data fetching and realtime logic from BusinessOwnerDashboard
 */

import { useCallback, useEffect, useRef } from 'react'
import { App } from 'antd'
import { useAuthSession } from '@/features/authentication'
import { useSocketConnection, useSocketEvent } from '@/shared/hooks/useSocket'
import { getApplications } from '../../../services/applicationService'
import { getStatusLabel } from '../utils/statusUtils'

export function useBusinessDashboard({
  businesses: _businesses,
  setBusinesses,
  editingApplication,
  setEditingApplication,
  loading: _loading,
  setLoading,
  paginationLoading: _paginationLoading,
  setPaginationLoading,
  currentPage,
  pageSize,
  searchTerm,
  statusFilter,
  sortBy,
  sortOrder,
  setCurrentPage,
  setTotalItems,
  initialFetchDone,
  isFirstRender
}) {
  const { message } = App.useApp()
  const { currentUser, roleSlug } = useAuthSession()
  const { connected: socketConnected } = useSocketConnection()
  const fetchBusinessesRef = useRef(null)

  // Fetch applications with pagination
  const fetchBusinesses = useCallback(async (resetPage = false) => {
    if (resetPage) {
      setCurrentPage(1)
    }
    
    setLoading(true)
    try {
      const data = await getApplications({
        status: statusFilter,
        search: searchTerm
      })
      
      setBusinesses(data || [])
      setTotalItems(data?.length || 0)
    } catch (err) {
      console.error('Failed to fetch applications:', err)
      message.error('Failed to load applications')
    } finally {
      setLoading(false)
      setPaginationLoading(false)
    }
  }, [statusFilter, searchTerm, setBusinesses, setLoading, setPaginationLoading, message, setTotalItems])

  const fetchBusinessesPaginated = useCallback(async () => {
    setPaginationLoading(true)
    await fetchBusinesses()
  }, [fetchBusinesses, setPaginationLoading])

  // Keep ref updated for socket callbacks
  useEffect(() => {
    fetchBusinessesRef.current = fetchBusinesses
  }, [fetchBusinesses])

  // Initial fetch
  useEffect(() => {
    if (currentUser && roleSlug === 'business_owner' && !initialFetchDone.current) {
      initialFetchDone.current = true
      fetchBusinesses()
    }
  }, [currentUser, roleSlug, initialFetchDone, fetchBusinesses])

  // Re-fetch when filters change (not on currentUser/roleSlug changes - handled by initial fetch)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (currentUser && roleSlug === 'business_owner') {
      fetchBusinesses()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, searchTerm, statusFilter, sortBy, sortOrder, isFirstRender, fetchBusinesses])

  // Socket: application status updates
  useSocketEvent('application:updated', useCallback((data) => {
    console.log('[Realtime] Application updated:', data)
    const updatedApp = data.application
    if (!updatedApp) return
    
    setBusinesses(prev => prev.map(b => {
      if ((b.applicationId || b._id) === updatedApp.applicationId || (b.applicationId || b._id) === updatedApp._id) {
        return { ...b, ...updatedApp }
      }
      return b
    }))
    
    if (editingApplication && ((editingApplication.applicationId || editingApplication._id) === updatedApp.applicationId || (editingApplication.applicationId || editingApplication._id) === updatedApp._id)) {
      setEditingApplication(prev => prev ? { ...prev, ...updatedApp } : prev)
    }
    
    if (updatedApp.applicationStatus) {
      const statusLabel = getStatusLabel(updatedApp.applicationStatus)
      message.info(`${updatedApp.businessName || 'Your application'} status: ${statusLabel}`)
    }
  }, [editingApplication, message, setBusinesses, setEditingApplication]))

  // Socket: payment verified
  useSocketEvent('payment:verified', useCallback((data) => {
    console.log('[Realtime] Payment verified:', data)
    message.success('Payment has been verified!')
    fetchBusinessesRef.current?.(false)
  }, [message]))

  return {
    socketConnected,
    fetchBusinesses,
    fetchBusinessesPaginated,
    fetchBusinessesRef
  }
}
