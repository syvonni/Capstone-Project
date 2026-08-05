import { useCallback } from 'react'
import { findProvinceByName, findCityByName, findBarangayByName } from '@/shared/services/psgcService'

/**
 * Manages address logic for business owner forms
 * Handles Philippine address field operations and PSGC lookups
 */
export function useBusinessOwnerAddress() {
  /**
   * Format address from form values
   */
  const formatAddress = useCallback((values) => {
    return {
      street: values.streetAddress || '',
      barangay: values.barangay || '',
      city: values.city || '',
      province: values.province || '',
      zipCode: values.zipCode || '',
    }
  }, [])

  /**
   * Validate address fields
   */
  const validateAddress = useCallback((values) => {
    const errors = {}

    if (!values.streetAddress) {
      errors.streetAddress = 'Street address is required'
    }
    if (!values.barangay) {
      errors.barangay = 'Barangay is required'
    }
    if (!values.city) {
      errors.city = 'City is required'
    }
    if (!values.province) {
      errors.province = 'Province is required'
    }
    if (!values.zipCode) {
      errors.zipCode = 'Zip code is required'
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    }
  }, [])

  /**
   * Lookup province by name
   */
  const lookupProvince = useCallback((name) => {
    return findProvinceByName(name)
  }, [])

  /**
   * Lookup city by name
   */
  const lookupCity = useCallback((name) => {
    return findCityByName(name)
  }, [])

  /**
   * Lookup barangay by name
   */
  const lookupBarangay = useCallback((name) => {
    return findBarangayByName(name)
  }, [])

  return {
    formatAddress,
    validateAddress,
    lookupProvince,
    lookupCity,
    lookupBarangay,
  }
}
