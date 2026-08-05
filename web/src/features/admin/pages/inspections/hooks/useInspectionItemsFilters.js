/**
 * THERE WILL BE NO DIRECT HTTP CALLS! USE SERVICES!
 */

import { useState } from 'react'

export function useInspectionItemsFilters() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState(null)

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
  }
}
