import { useState, useEffect } from 'react'
import { getLobs } from '@/shared/services/lobService'
import { getVariables } from '@/features/admin/services/variableService'

export function useLOBData() {
  const [lobs, setLobs] = useState([])
  const [allVariables, setAllVariables] = useState([])
  const [lobsLoading, setLobsLoading] = useState(true)
  const [lobsError, setLobsError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      setLobsLoading(true)
      setLobsError(null)
      try {
        const [lobsData, variables] = await Promise.all([
          getLobs({ status: 'active' }),
          getVariables({ isActive: true }),
        ])
        setLobs(lobsData || [])
        setAllVariables(variables || [])
      } catch (error) {
        console.error('Failed to fetch data:', error)
        setLobsError('Failed to load line of business data. Please refresh the page.')
        setLobs([])
      } finally {
        setLobsLoading(false)
      }
    }
    fetchData()
  }, [])

  return {
    lobs,
    allVariables,
    lobsLoading,
    lobsError,
  }
}
