import { useState, useEffect, useCallback } from 'react'
import { getLobs } from '@/shared/services/lobService'

export function usePostRequirementDependencies(postRequirementId, isNew) {
  const [dependencies, setDependencies] = useState([])

  const fetchDependencies = useCallback(async () => {
    try {
      const allLobs = await getLobs()
      const dependentLobs = allLobs.filter(lob => {
        const requiredIds = (lob.postRequirements?.required || []).map(id => typeof id === 'object' ? id._id : id)
        const conditionalIds = (lob.postRequirements?.conditional || []).map(id => typeof id === 'object' ? id._id : id)
        return requiredIds.includes(postRequirementId) || conditionalIds.includes(postRequirementId)
      })
      setDependencies(dependentLobs)
    } catch (error) {
      console.error('Failed to fetch dependencies:', error)
    }
  }, [postRequirementId])

  useEffect(() => {
    if (!isNew && postRequirementId) {
      fetchDependencies()
    }
  }, [postRequirementId, isNew, fetchDependencies])

  return { dependencies, fetchDependencies }
}
