/**
 * THERE WILL BE NO DIRECT HTTP CALLS! USE SERVICES!
 */

import { useState } from 'react'
import { DEFAULT_FILTERS } from '../constants/postRequirements.constants'

export function usePostRequirementsFilters() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState(DEFAULT_FILTERS.isActive ? 'active' : '')

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter(DEFAULT_FILTERS.isActive ? 'active' : '')
  }

  const activeFilterCount = (statusFilter ? 1 : 0) + (searchTerm ? 1 : 0)

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    clearFilters,
    activeFilterCount,
  }
}
