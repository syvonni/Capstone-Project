import { useState } from 'react'

export function useFeesFilters() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)

  const clearFilters = () => {
    setStatusFilter('')
    setCategoryFilter('')
  }

  const activeFilterCount = (statusFilter ? 1 : 0) + (categoryFilter ? 1 : 0)

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    filterOpen,
    setFilterOpen,
    clearFilters,
    activeFilterCount,
  }
}
