import { useState, useCallback } from 'react'

/**
 * Hook for managing application selection state
 */
export function useApplicationSelection() {
  const [selectedApplicationId, setSelectedApplicationId] = useState(null)

  const selectApplication = useCallback((applicationId) => {
    setSelectedApplicationId(applicationId)
  }, [])

  return {
    selectedApplicationId,
    setSelectedApplicationId,
    selectApplication,
  }
}
