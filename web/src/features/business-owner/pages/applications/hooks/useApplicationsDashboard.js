/**
 * Custom hook for applications dashboard data fetching and socket events
 * Extracts data fetching and realtime logic from BusinessOwnerMasterView
 */

import { useCallback, useEffect, useRef } from 'react'
import { App } from 'antd'
import { useAuthSession } from '@/features/authentication'
import { useSocketConnection, useSocketEvent } from '@/shared/hooks/useSocket'
import { getApplications } from '../../../services/applicationService'
import { getStatusLabel } from '../utils/statusUtils'

export function useApplicationsDashboard({
  _applications,
  setApplications,
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
  const fetchApplicationsRef = useRef(null)

  // Fetch applications
  const fetchApplications = useCallback(async (resetPage = false) => {
    if (resetPage) {
      setCurrentPage(1)
    }

    setLoading(true)
    try {
      const data = await getApplications({
        status: statusFilter,
        search: searchTerm
      })

      setApplications(data || [])
      setTotalItems(data?.length || 0)
    } catch (err) {
      console.error('Failed to fetch applications:', err)
      message.error('Failed to load applications')
    } finally {
      setLoading(false)
      setPaginationLoading(false)
    }
  }, [statusFilter, searchTerm, setApplications, setLoading, setPaginationLoading, setCurrentPage, message, setTotalItems])

  const fetchApplicationsPaginated = useCallback(async () => {
    setPaginationLoading(true)
    await fetchApplications()
  }, [fetchApplications, setPaginationLoading])

  // Keep ref updated for socket callbacks
  useEffect(() => {
    fetchApplicationsRef.current = fetchApplications
  }, [fetchApplications])

  // Initial fetch
  useEffect(() => {
    if (currentUser && roleSlug === 'business_owner' && !initialFetchDone.current) {
      initialFetchDone.current = true
      fetchApplications()
    }
  }, [currentUser, roleSlug, initialFetchDone, fetchApplications])

  // Re-fetch when filters change
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (currentUser && roleSlug === 'business_owner') {
      fetchApplications()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, searchTerm, statusFilter, sortBy, sortOrder, isFirstRender, fetchApplications])

  // Socket: application status updates
  useSocketEvent('application:updated', useCallback((data) => {
    console.log('[Realtime] Application updated:', data)
    const updatedApp = data.application
    if (!updatedApp) return

    setApplications(prev => prev.map(app => {
      if ((app.applicationId || app._id) === updatedApp.applicationId || (app.applicationId || app._id) === updatedApp._id) {
        return { ...app, ...updatedApp }
      }
      return app
    }))

    if (editingApplication && ((editingApplication.applicationId || editingApplication._id) === updatedApp.applicationId || (editingApplication.applicationId || editingApplication._id) === updatedApp._id)) {
      setEditingApplication(prev => prev ? { ...prev, ...updatedApp } : prev)
    }

    if (updatedApp.applicationStatus) {
      const statusLabel = getStatusLabel(updatedApp.applicationStatus)
      message.info(`${updatedApp.businessName || 'Your application'} status: ${statusLabel}`)
    }
  }, [editingApplication, message, setApplications, setEditingApplication]))

  // Socket: payment verified
  useSocketEvent('payment:verified', useCallback((data) => {
    console.log('[Realtime] Payment verified:', data)
    message.success('Payment has been verified!')
    fetchApplicationsRef.current?.(false)
  }, [message]))

  return {
    socketConnected,
    fetchApplications,
    fetchApplicationsPaginated,
    fetchApplicationsRef
  }
}
