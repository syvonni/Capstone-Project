import { useState, useCallback } from 'react'

export function useFilters() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('updatedAt')
  const [sortOrder, setSortOrder] = useState('desc')

  const resetFilters = useCallback(() => {
    setSearchTerm('')
    setStatusFilter('')
    setSortBy('updatedAt')
    setSortOrder('desc')
  }, [])

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    resetFilters,
  }
}
