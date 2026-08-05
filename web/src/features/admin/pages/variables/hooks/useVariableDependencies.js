import { useState, useEffect, useCallback } from 'react'
import { getLobs } from '@/shared/services/lobService'

export function useVariableDependencies(variableId, isNew) {
  const [dependencies, setDependencies] = useState([])

  const fetchDependencies = useCallback(async () => {
    try {
      const allLobs = await getLobs()
      const dependentLobs = allLobs.filter(lob => {
        const variableIds = (lob.variables || []).map(id => typeof id === 'object' ? id._id : id)
        return variableIds.includes(variableId)
      })
      setDependencies(dependentLobs)
    } catch (error) {
      console.error('Failed to fetch dependencies:', error)
    }
  }, [variableId])

  useEffect(() => {
    if (!isNew && variableId) {
      fetchDependencies()
    }
  }, [variableId, isNew, fetchDependencies])

  return { dependencies, fetchDependencies }
}
