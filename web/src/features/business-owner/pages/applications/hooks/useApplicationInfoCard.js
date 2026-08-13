import { useState, useMemo, useCallback } from 'react'
import { isFieldComplete } from '@/features/business-owner/utils/formCompletion'
import { getFieldDisplayName as getFieldDisplayNameFromUtils } from '@/features/staffs/lgu-officer/utils/fieldKeyUtils'

export function useApplicationInfoCard(application, sections = [], formValues = null) {
  const [permitModalOpen, setPermitModalOpen] = useState(false)
  const [changesModalOpen, setChangesModalOpen] = useState(false)
  const [progressModalOpen, setProgressModalOpen] = useState(false)

  // Guard against undefined application
  const safeApplication = application || {}
  
  const status = safeApplication.applicationStatus || safeApplication.permitStatus || 'submitted'
  const statusLower = status.toLowerCase()
  const isDraft = statusLower === 'draft'
  const isRejected = statusLower === 'rejected'
  const isReturned = statusLower === 'returned' || statusLower === 'needs_revision'

  // Determine permit type: formType contains the specific form ID (e.g., 'association-foundation-permit', 'unified-business-permit')
  const formType = safeApplication?.formType

  // Format kebab-case to Title Case for display
  const formatToTitleCase = (str) => {
    if (!str) return str
    return str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  // Extract permit type name from formType
  // If formType is 'unified-business-permit', show 'Unified Business Permit'
  // If formType is 'association-foundation-permit', show 'Association Foundation Permit'
  let permitTypeLabel
  if (formType === 'unified-business-permit') {
    permitTypeLabel = 'Unified Business Permit'
  } else if (formType) {
    // Remove '-permit' suffix and format as title case
    const baseName = formType.replace(/-permit$/, '')
    permitTypeLabel = formatToTitleCase(baseName) + ' Permit'
  } else {
    permitTypeLabel = 'Unknown Permit'
  }

  const rejectionReason = (safeApplication?.hadAppealGranted && safeApplication?.originalRejectionReason) || safeApplication?.rejectionReason || null
  const approvalComment = safeApplication?.reviewComments || null

  // Helper to get section and field name from fieldKey
  const effectiveSections = useMemo(() => {
    if (sections?.length > 0) return sections
    return (
      safeApplication?.formDefinition?.sections ||
      safeApplication?.formData?.formDefinition?.sections ||
      []
    )
  }, [
    sections,
    safeApplication?.formDefinition,
    safeApplication?.formData?.formDefinition,
  ])

  const getFieldDisplayName = useCallback(
    (fieldKey) => {
      const formData = formValues || safeApplication?.formData || {}
      return getFieldDisplayNameFromUtils(fieldKey, effectiveSections, formData)
    },
    [effectiveSections, formValues, safeApplication?.formData],
  )

  // Calculate fields with request changes
  const fieldReviewDecisions = safeApplication?.fieldReviewDecisions || {}
  const requestChangeFields = Object.entries(fieldReviewDecisions)
    .filter(([_, decision]) => decision?.status === 'request_changes')
    .map(([fieldKey, decision]) => ({
      fieldKey,
      displayName: getFieldDisplayName(fieldKey),
      reason: decision?.requestOther || decision?.requestCode || 'No reason provided'
    }))

  // Build return history for display in the requested changes modal
  const returnHistory = useMemo(() => {
    const rawHistory = safeApplication?.returnHistory || []
    return rawHistory.map((entry) => {
      const fields = Object.entries(entry.fields || {})
        .filter(([_, decision]) => decision?.status === 'request_changes')
        .map(([fieldKey, decision]) => ({
          fieldKey,
          displayName: getFieldDisplayName(fieldKey),
          reason: decision?.requestOther || decision?.requestCode || 'No reason provided'
        }))
      return {
        returnNumber: entry.returnNumber,
        returnedAt: entry.returnedAt,
        returnedByName: entry.returnedByName,
        reviewComments: entry.reviewComments,
        fields,
      }
    })
  }, [safeApplication?.returnHistory, getFieldDisplayName])

  // Calculate form completion progress for draft and returned states.
  // When live formValues are provided (overview tab) we use the same helpers as
  // useApplicationSectionCompletion so metadata, category uploads and LOB are all checked.
  // Otherwise we fall back to the saved application.formData (stories, list view, etc.)
  const formProgress = useMemo(() => {
    if ((!isDraft && !isReturned) || !sections.length) {
      return { completed: 0, total: 0, incompleteFields: [], isSectionLevel: false }
    }

    const liveFormValues = formValues || safeApplication?.formData || {}
    let totalFields = 0
    let completedFields = 0
    const incompleteFieldsMap = new Map()

    sections.forEach((section, sectionIdx) => {
      // LOB section is special: it has no `items`, so we count it as one field.
      if (section?.type === 'lob_section') {
        totalFields++
        const hasLob = Array.isArray(liveFormValues.businessActivities) && liveFormValues.businessActivities.length > 0
        if (hasLob) {
          completedFields++
        } else {
          const sectionName = section?.sectionName || section?.label || section?.title || `Section ${sectionIdx + 1}`
          const fieldName = section?.sectionName || section?.label || section?.title || 'Line of Business'
          const fullPath = `${sectionIdx}.lob`
          if (!incompleteFieldsMap.has(fullPath)) {
            incompleteFieldsMap.set(fullPath, {
              fieldKey: fullPath,
              displayName: `${sectionName} - ${fieldName}`
            })
          }
        }
        return
      }

      if (!section?.items) return

      section.items.forEach((item) => {
        // Only count fields that have a key/label
        const fieldKey = (item.key && item.key !== '') ? item.key : (item.name || item.label)
        if (!fieldKey) return

        totalFields++
        const fullPath = `${sectionIdx}.${fieldKey}`

        if (isFieldComplete(item, fieldKey, liveFormValues)) {
          completedFields++
        } else {
          if (!incompleteFieldsMap.has(fullPath)) {
            incompleteFieldsMap.set(fullPath, {
              fieldKey: fullPath,
              displayName: getFieldDisplayName(fullPath)
            })
          }
        }
      })
    })

    const incompleteFields = Array.from(incompleteFieldsMap.values())
    return { completed: completedFields, total: totalFields, incompleteFields }
  }, [isDraft, isReturned, sections, safeApplication?.formData, getFieldDisplayName, formValues])

  return {
    permitModalOpen,
    setPermitModalOpen,
    changesModalOpen,
    setChangesModalOpen,
    progressModalOpen,
    setProgressModalOpen,
    status,
    statusLower,
    isDraft,
    isRejected,
    isReturned,
    formType,
    permitTypeLabel,
    rejectionReason,
    approvalComment,
    getFieldDisplayName,
    requestChangeFields,
    returnHistory,
    formProgress,
  }
}
