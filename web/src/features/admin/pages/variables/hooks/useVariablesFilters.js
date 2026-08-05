import { useState } from 'react'
import { DEFAULT_FILTERS } from '../constants/variables.constants'

export function useVariablesFilters() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState(DEFAULT_FILTERS.isActive ? 'active' : '')

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
  }
}
