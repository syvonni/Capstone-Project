import { useMemo } from 'react'

/**
 * Hook for calculating application completion and locked field state.
 * @param {Object} params
 * @param {Object} params.application - Current application/application
 * @param {boolean} params.formAllSectionsComplete - Whether all form sections are complete
 * @param {boolean} params.isReturned - Whether the application is in returned state
 * @param {boolean} params.hasLockedFields - Whether the application may have locked fields
 * @returns {Object} allSectionsComplete, lockedFields
 */
export function useApplicationCompletionStatus({
  application,
  formAllSectionsComplete,
  isReturned,
  hasLockedFields,
}) {
  const allSectionsComplete = useMemo(() => {
    if (!isReturned) {
      // Normal submit: all sections must be complete
      return formAllSectionsComplete
    }

    // Returned state: only requested fields need to be complete
    const requestedFieldKeys = Object.entries(application?.fieldReviewDecisions || {})
      .filter(([_key, decision]) => decision.status === 'request_changes')
      .map(([key]) => key)

    if (requestedFieldKeys.length === 0) return false

    // Check if all requested fields have values in formData
    const formData = application?.formData || {}
    const allRequestedComplete = requestedFieldKeys.every(key => {
      // Handle section prefixes (e.g. "0.activityLocation" -> check formData for "activityLocation")
      const fieldKey = key.includes('.') ? key.split('.').pop() : key
      const value = formData[fieldKey]
      return value !== undefined && value !== null && value !== ''
    })

    return allRequestedComplete
  }, [application, formAllSectionsComplete, isReturned])

  const lockedFields = useMemo(() => {
    if (!hasLockedFields || !application?.fieldReviewDecisions) return []

    // For returned state: lock all fields EXCEPT those with status === 'request_changes'
    // For needs_revision: lock fields where approved === true
    return isReturned
      ? Object.entries(application.fieldReviewDecisions)
          .filter(([_fieldKey, decision]) => decision.status !== 'request_changes')
          .map(([fieldKey]) => fieldKey)
      : Object.entries(application.fieldReviewDecisions)
          .filter(([_fieldKey, decision]) => decision.approved === true)
          .map(([fieldKey]) => fieldKey)
  }, [application, hasLockedFields, isReturned])

  return { allSectionsComplete, lockedFields }
}
