import { useState, useCallback } from 'react'

export function useBusinessSelection() {
  const [selectedBusinessId, setSelectedBusinessId] = useState(null)

  const selectBusiness = useCallback((businessId) => {
    setSelectedBusinessId(businessId)
  }, [])

  return {
    selectedBusinessId,
    setSelectedBusinessId,
    selectBusiness,
  }
}
