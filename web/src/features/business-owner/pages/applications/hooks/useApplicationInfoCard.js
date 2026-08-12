import { useState, useMemo, useCallback } from 'react'
import { isFieldComplete } from '@/features/business-owner/utils/formCompletion'

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
  const getFieldDisplayName = useCallback((fieldKey) => {
    const parts = fieldKey.split('.')
    const sectionIdx = parseInt(parts[0], 10)
    const fieldKeyPart = parts.slice(1).join('.')

    const section = sections[sectionIdx]
    if (!section) {
      // Fallback: try to get field name from formDefinition if available
      const formDef = safeApplication?.formDefinition || safeApplication?.formData?.formDefinition
      if (formDef?.sections?.[sectionIdx]) {
        const sec = formDef.sections[sectionIdx]
        const secName = sec?.label || sec?.title || `Section ${sectionIdx + 1}`
        const item = sec?.items?.find((item) => item.key === fieldKeyPart || item.name === fieldKeyPart)
        const fieldName = item?.label || item?.name || fieldKeyPart
        return `${secName} - ${fieldName}`
      }
      return fieldKey
    }

    const sectionName = section?.label || section?.title || `Section ${sectionIdx + 1}`

    // Find the field in the section items - try both key and name
    const item = section?.items?.find((item) => item.key === fieldKeyPart || item.name === fieldKeyPart)
    const fieldName = item?.label || item?.name || fieldKeyPart

    return `${sectionName} - ${fieldName}`
  }, [sections, safeApplication?.formDefinition, safeApplication?.formData?.formDefinition])

  // Calculate fields with request changes
  const fieldReviewDecisions = safeApplication?.fieldReviewDecisions || {}
  const requestChangeFields = Object.entries(fieldReviewDecisions)
    .filter(([_, decision]) => decision?.status === 'request_changes')
    .map(([fieldKey, decision]) => ({
      fieldKey,
      displayName: getFieldDisplayName(fieldKey),
      reason: decision?.requestOther || decision?.requestCode || 'No reason provided'
    }))

  // Calculate form completion progress for draft mode.
  // When live formValues are provided (overview tab) we use the same helpers as
  // useApplicationSectionCompletion so metadata, category uploads and LOB are all checked.
  // Otherwise we fall back to the saved application.formData (stories, list view, etc.)
  const formProgress = useMemo(() => {
    if (!isDraft || !sections.length) {
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
          const sectionName = `Section ${sectionIdx + 1}`
          const fieldName = section?.label || section?.title || 'Line of Business'
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
  }, [isDraft, sections, safeApplication?.formData, getFieldDisplayName, formValues])

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
    formProgress,
  }
}
