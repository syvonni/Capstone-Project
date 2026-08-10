import { useState, useCallback } from 'react'
import { validateName } from '@/features/admin/services/nameValidationService'

/**
 * Custom hook for real-time name validation across entity types
 * @param {string} entityType - The entity type being created/edited
 * @param {string} excludeId - Exclude current entity ID for updates (optional)
 * @returns {Object} - Validation state and methods
 */
export const useNameValidation = (entityType, excludeId = null) => {
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState(null)
  const [conflicts, setConflicts] = useState([])

  const validateNameField = useCallback(
    async (name) => {
      if (!name || name.trim() === '') {
        setError(null)
        setConflicts([])
        return true
      }

      setIsValidating(true)
      try {
        const result = await validateName(name, entityType, excludeId)
        if (!result.valid) {
          const conflictNames = result.conflicts.map((c) => c.entityType).join(', ')
          setError(`Name already exists in: ${conflictNames}`)
          setConflicts(result.conflicts)
          return false
        }
        setError(null)
        setConflicts([])
        return true
      } catch (err) {
        setError('Failed to validate name')
        return false
      } finally {
        setIsValidating(false)
      }
    },
    [entityType, excludeId]
  )

  const clearError = useCallback(() => {
    setError(null)
    setConflicts([])
  }, [])

  return {
    validateName: validateNameField,
    isValidating,
    error,
    conflicts,
    clearError,
  }
}
