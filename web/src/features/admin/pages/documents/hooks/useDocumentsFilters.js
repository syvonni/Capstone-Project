import { useState } from 'react'

export function useDocumentsFilters() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('')
  }

  const activeFilterCount = (statusFilter ? 1 : 0) + (searchTerm ? 1 : 0)

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    filterOpen,
    setFilterOpen,
    clearFilters,
    activeFilterCount,
  }
}
