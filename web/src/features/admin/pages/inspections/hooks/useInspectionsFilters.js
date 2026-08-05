/**
 * THERE WILL BE NO DIRECT HTTP CALLS! USE SERVICES!
 */

import { useState } from 'react'

export function useInspectionsFilters() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState(null)

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
  }
}
