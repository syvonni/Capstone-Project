import { useState, useEffect, useCallback } from 'react'
import BusinessOwnerService from '@/features/staffs/lgu-officer/services/businessOwnerService'

/**
 * Manages data fetching and state management for business owner details
 * Handles business owner, applications, and businesses data
 */
export function useBusinessOwnerData(businessOwnerId) {
  const [businessOwner, setBusinessOwner] = useState(null)
  const [applications, setApplications] = useState([])
  const [applicationsLoading, setApplicationsLoading] = useState(false)
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const businessOwnerService = useCallback(() => new BusinessOwnerService(), [])

  /**
   * Fetch business owner details
   */
  const fetchBusinessOwner = useCallback(async () => {
    if (!businessOwnerId) return

    try {
      setLoading(true)
      setError(null)
      const response = await businessOwnerService().getBusinessOwnerById(businessOwnerId)
      setBusinessOwner(response)
    } catch (err) {
      console.error('Failed to fetch business owner:', err)
      setError(err.message || 'Failed to fetch business owner')
    } finally {
      setLoading(false)
    }
  }, [businessOwnerId, businessOwnerService])

  /**
   * Fetch business owner's applications
   */
  const fetchApplications = useCallback(async () => {
    if (!businessOwnerId) return

    try {
      setApplicationsLoading(true)
      const response = await businessOwnerService().getBusinessOwnerApplications(businessOwnerId)
      const apps = (response.applications || []).filter(app => {
        const status = app.status || app.applicationStatus
        return status !== 'draft'
      })
      setApplications(apps)
    } catch (err) {
      console.error('Failed to fetch applications:', err)
      setApplications([])
    } finally {
      setApplicationsLoading(false)
    }
  }, [businessOwnerId, businessOwnerService])

  /**
   * Fetch business owner's businesses
   */
  const fetchBusinesses = useCallback(async () => {
    if (!businessOwnerId) return

    try {
      const response = await businessOwnerService().getBusinessOwnerBusinesses(businessOwnerId)
      setBusinesses(response || [])
    } catch (err) {
      console.error('Failed to fetch businesses:', err)
      setBusinesses([])
    }
  }, [businessOwnerId, businessOwnerService])

  /**
   * Refresh all data
   */
  const refresh = useCallback(() => {
    fetchBusinessOwner()
    fetchApplications()
    fetchBusinesses()
  }, [fetchBusinessOwner, fetchApplications, fetchBusinesses])

  /**
   * Update local business owner state
   */
  const updateBusinessOwner = useCallback((updates) => {
    setBusinessOwner(prev => ({ ...prev, ...updates }))
  }, [])

  // Fetch on mount and when businessOwnerId changes
  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    businessOwner,
    applications,
    applicationsLoading,
    businesses,
    loading,
    error,
    refresh,
    updateBusinessOwner,
  }
}
