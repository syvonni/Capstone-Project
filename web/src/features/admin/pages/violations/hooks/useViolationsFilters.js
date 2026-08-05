/**
 * THERE WILL BE NO DIRECT HTTP CALLS! USE SERVICES!
 */

import { useState } from 'react'
import { DEFAULT_FILTERS } from '../constants/violations.constants'

export function useViolationsFilters() {
  const [searchTerm, setSearchTerm] = useState('')
  const [severityFilter, setSeverityFilter] = useState(DEFAULT_FILTERS.severity)
  const [statusFilter, setStatusFilter] = useState(DEFAULT_FILTERS.isActive ? true : null)
  const [filterOpen, setFilterOpen] = useState(false)

  const resetFilters = () => {
    setSearchTerm('')
    setSeverityFilter(DEFAULT_FILTERS.severity)
    setStatusFilter(DEFAULT_FILTERS.isActive ? true : null)
  }

  const activeFilterCount = (severityFilter ? 1 : 0) + (statusFilter !== null ? 1 : 0) + (searchTerm ? 1 : 0)

  return {
    searchTerm,
    setSearchTerm,
    severityFilter,
    setSeverityFilter,
    statusFilter,
    setStatusFilter,
    filterOpen,
    setFilterOpen,
    resetFilters,
    activeFilterCount,
  }
}
