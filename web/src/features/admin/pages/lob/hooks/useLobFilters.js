/**
 * THERE WILL BE NO DIRECT HTTP CALLS! USE SERVICES!
 */

import { useState } from 'react'

export function useLobFilters() {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)

  const clearFilters = () => {
    setSearchTerm('')
    setCategoryFilter('')
    setStatusFilter('')
  }

  const activeFilterCount = (categoryFilter ? 1 : 0) + (searchTerm ? 1 : 0) + (statusFilter ? 1 : 0)

  return {
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    filterOpen,
    setFilterOpen,
    clearFilters,
    activeFilterCount,
  }
}
