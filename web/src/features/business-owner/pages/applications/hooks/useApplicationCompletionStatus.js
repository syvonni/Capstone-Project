import { useMemo } from 'react'
import { hasValue, getDateRangeValue, isDateRangeComplete } from '@/features/business-owner/utils/formCompletion'

function resolveDateRangeOrValue(formData, fieldKey) {
  const range = getDateRangeValue(formData, fieldKey)
  if (range) {
    return isDateRangeComplete(formData, fieldKey) ? range : undefined
  }
  return formData[fieldKey]
}

/**
 * Resolve a field-review decision key to the actual form value.
 * Handles normal fields, repeatable-group rows, LOB activities and the LOB description.
 */
function getValueAtFieldKey(key, formData = {}) {
  if (!key) return undefined

  // LOB activity line: "businessActivities.0"
  if (key.startsWith('businessActivities.')) {
    const idx = parseInt(key.split('.')[1], 10)
    return formData.businessActivities?.[idx]
  }

  // LOB description key used by some form definitions
  if (key === 'businessDescriptionText') {
    return formData.businessDescriptionText
  }

  const parts = key.split('.')
  const first = parts[0]

  // Field-review keys normally start with a section index, e.g. "0.fieldKey" or "0.repeatable.1"
  if (/^\d+$/.test(first)) {
    const rest = parts.slice(1)
    if (rest.length === 1) {
      return resolveDateRangeOrValue(formData, rest[0])
    }
    if (rest.length === 2) {
      const [groupKey, rowIndex] = rest
      return formData[groupKey]?.[parseInt(rowIndex, 10)]
    }
    return undefined
  }

  return resolveDateRangeOrValue(formData, key)
}

/**
 * Hook for calculating application completion and locked field state.
 * @param {Object} params
 * @param {Object} params.application - Current application/application
 * @param {Object} [params.formData] - Current form data (falls back to application.formData)
 * @param {boolean} params.formAllSectionsComplete - Whether all form sections are complete
 * @param {boolean} params.isReturned - Whether the application is in returned state
 * @param {boolean} params.hasLockedFields - Whether the application may have locked fields
 * @returns {Object} allSectionsComplete, lockedFields
 */
export function useApplicationCompletionStatus({
  application,
  formData: formDataProp,
  formAllSectionsComplete,
  isReturned,
  hasLockedFields,
}) {
  const allSectionsComplete = useMemo(() => {
    if (!isReturned) {
      // Normal submit: all sections must be complete
      return formAllSectionsComplete
    }

    // Returned state: requested-change fields must have values, and the overall form must be complete.
    const requestedFieldKeys = Object.entries(application?.fieldReviewDecisions || {})
      .filter(([_key, decision]) => decision?.status === 'request_changes')
      .map(([key]) => key)

    const formData = formDataProp ?? application?.formData ?? {}

    // If no field-level changes were requested, the resubmit button should still be
    // governed by whether the whole form is complete.
    if (requestedFieldKeys.length === 0) {
      return formAllSectionsComplete
    }

    const allRequestedComplete = requestedFieldKeys.every(key =>
      hasValue(getValueAtFieldKey(key, formData))
    )

    if (!allRequestedComplete) return false

    return formAllSectionsComplete
  }, [application, formDataProp, formAllSectionsComplete, isReturned])

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
