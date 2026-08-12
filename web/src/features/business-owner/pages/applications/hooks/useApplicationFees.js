import { useState, useEffect } from 'react'
import { getApplicationFeesByFormType } from '@/features/business-owner/services/applicationService'

/**
 * Hook for fetching application fees for a permit form type
 * @param {string} formType - Permit form type
 * @returns {Object} Fee data and loading state
 */
export function useApplicationFees(formType) {
  const [feeData, setFeeData] = useState({ fees: [], total: 0 })
  const [loadingFees, setLoadingFees] = useState(false)

  useEffect(() => {
    if (!formType) return

    const fetchFees = async () => {
      setLoadingFees(true)
      try {
        const response = await getApplicationFeesByFormType(formType)
        if (response?.fees) {
          setFeeData(response)
        } else {
          setFeeData({ fees: [], total: 0 })
        }
      } catch (error) {
        console.error('Failed to fetch fees:', error)
        setFeeData({ fees: [], total: 0 })
      } finally {
        setLoadingFees(false)
      }
    }

    fetchFees()
  }, [formType])

  return { feeData, loadingFees }
}
