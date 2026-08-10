import { useState, useEffect, useCallback } from 'react'
import { getLobs } from '@/shared/services/lobService'

export function useDocumentDependencies(documentId, isNew) {
  const [dependencies, setDependencies] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchDependencies = useCallback(async () => {
    try {
      setLoading(true)
      const allLobs = await getLobs()
      const dependentLobs = allLobs.filter(lob => {
        const documentIds = (lob.documents || []).map(id => typeof id === 'object' ? id._id : id)
        return documentIds.includes(documentId)
      })
      setDependencies(dependentLobs)
    } catch (error) {
      console.error('Failed to fetch dependencies:', error)
    } finally {
      setLoading(false)
    }
  }, [documentId])

  useEffect(() => {
    if (!isNew && documentId) {
      fetchDependencies()
    }
  }, [documentId, isNew, fetchDependencies])

  return { dependencies, loading, fetchDependencies }
}
