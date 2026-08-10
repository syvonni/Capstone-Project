/**
 * Custom hook for managing business owner applications state
 * Composes granular hooks for better separation of concerns
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useBusinessSelection } from './useBusinessSelection'
import { usePagination } from './usePagination'
import { useFilters } from './useFilters'
import { useFormState } from './useFormState'
import { useBusinessDashboard } from './useBusinessDashboard'

export function useApplicationsState() {
  // Business data state
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)

  // Announcements state
  const [readAnnouncements, setReadAnnouncements] = useState({})

  // UI view state
  const [showSettings, setShowSettings] = useState(false)
  const [showWelcomeState, setShowWelcomeState] = useState(false)

  // Refs
  const initialFetchDone = useRef(false)
  const isFirstRender = useRef(true)

  // Composed hooks
  const businessSelection = useBusinessSelection()
  const pagination = usePagination()
  const filters = useFilters()
  const formState = useFormState()
  
  // Business dashboard hook (needs state props)
  const businessDashboard = useBusinessDashboard({
    businesses,
    setBusinesses,
    editingApplication: formState.editingApplication,
    setEditingApplication: formState.setEditingApplication,
    loading,
    setLoading,
    paginationLoading: pagination.paginationLoading,
    setPaginationLoading: pagination.setPaginationLoading,
    currentPage: pagination.currentPage,
    pageSize: pagination.pageSize,
    searchTerm: filters.searchTerm,
    statusFilter: filters.statusFilter,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    setCurrentPage: pagination.setCurrentPage,
    setTotalItems: pagination.setTotalItems,
    initialFetchDone,
    isFirstRender
  })

  // Actions
  const toggleSettings = useCallback(() => {
    setShowSettings(prev => !prev)
  }, [])

  // Load read announcements from localStorage on mount
  useEffect(() => {
    try {
      const savedRead = localStorage.getItem('bizclear_read_announcements')
      if (savedRead) {
        const parsed = JSON.parse(savedRead)
        
        // Migrate old boolean format to timestamp format
        const migrated = Object.fromEntries(
          Object.entries(parsed).map(([key, value]) => [
            key,
            typeof value === 'boolean' ? Date.now() : value
          ])
        )
        
        // Filter out any entries older than 30 days to prevent localStorage bloat
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
        const filtered = Object.fromEntries(
          Object.entries(migrated).filter(([_, timestamp]) => timestamp > thirtyDaysAgo)
        )
        
        // Save migrated data if format changed
        if (JSON.stringify(parsed) !== JSON.stringify(filtered)) {
          localStorage.setItem('bizclear_read_announcements', JSON.stringify(filtered))
        }
        
        setReadAnnouncements(filtered)
      }
    } catch (e) {
      console.error('Failed to load read announcements from localStorage:', e)
      // If localStorage is corrupted, start fresh
      setReadAnnouncements({})
    }
  }, [])

  const handleAnnouncementRead = useCallback((key) => {
    setReadAnnouncements(prev => {
      const updated = { ...prev, [key]: Date.now() } // Store timestamp instead of boolean
      try {
        localStorage.setItem('bizclear_read_announcements', JSON.stringify(updated))
      } catch (e) {
        console.error('Failed to save read announcements to localStorage:', e)
        // Continue without saving if localStorage fails
      }
      return updated
    })
  }, [])

  return {
    // Business data
    businesses,
    setBusinesses,
    loading,
    setLoading,
    lastUpdatedAt,
    setLastUpdatedAt,
    // Announcements
    readAnnouncements,
    setReadAnnouncements,
    // UI view state
    showSettings,
    setShowSettings,
    showWelcomeState,
    setShowWelcomeState,
    // Composed hooks
    ...businessSelection,
    ...pagination,
    ...filters,
    ...formState,
    ...businessDashboard,
    // Refs
    initialFetchDone,
    isFirstRender,
    // Actions
    toggleSettings,
    handleAnnouncementRead
  }
}
