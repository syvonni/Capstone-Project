import { useState, useMemo, useCallback } from 'react'


export function useApplicationInfoCard(business, sections = [], refreshKey = 0) {
  const [permitModalOpen, setPermitModalOpen] = useState(false)
  const [changesModalOpen, setChangesModalOpen] = useState(false)
  const [progressModalOpen, setProgressModalOpen] = useState(false)

  // Guard against undefined business
  const safeBusiness = business || {}
  
  const status = safeBusiness.applicationStatus || safeBusiness.permitStatus || 'submitted'
  const statusLower = status.toLowerCase()
  const isDraft = statusLower === 'draft'
  const isRejected = statusLower === 'rejected'
  const isReturned = statusLower === 'returned' || statusLower === 'needs_revision'

  // Determine permit type: formType contains the specific form ID (e.g., 'association-foundation-permit', 'unified-business-permit')
  const formType = safeBusiness?.formType

  // Format kebab-case to Title Case for display
  const formatToTitleCase = (str) => {
    if (!str) return str
    return str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  // Extract permit type name from formType
  // If formType is 'unified-business-permit', show 'Unified Business Permit'
  // If formType is 'association-foundation-permit', show 'Association Foundation Permit'
  let businessTypeLabel
  if (formType === 'unified-business-permit') {
    businessTypeLabel = 'Unified Business Permit'
  } else if (formType) {
    // Remove '-permit' suffix and format as title case
    const baseName = formType.replace(/-permit$/, '')
    businessTypeLabel = formatToTitleCase(baseName) + ' Permit'
  } else {
    businessTypeLabel = 'Unknown Permit'
  }

  const rejectionReason = (safeBusiness?.hadAppealGranted && safeBusiness?.originalRejectionReason) || safeBusiness?.rejectionReason || null
  const approvalComment = safeBusiness?.reviewComments || null

  // Helper to get section and field name from fieldKey
  const getFieldDisplayName = useCallback((fieldKey) => {
    const parts = fieldKey.split('.')
    const sectionIdx = parseInt(parts[0], 10)
    const fieldKeyPart = parts.slice(1).join('.')

    const section = sections[sectionIdx]
    if (!section) {
      // Fallback: try to get field name from formDefinition if available
      const formDef = safeBusiness?.formDefinition || safeBusiness?.formData?.formDefinition
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
  }, [sections, safeBusiness?.formDefinition, safeBusiness?.formData?.formDefinition])

  // Calculate fields with request changes
  const fieldReviewDecisions = safeBusiness?.fieldReviewDecisions || {}
  const requestChangeFields = Object.entries(fieldReviewDecisions)
    .filter(([_, decision]) => decision?.status === 'request_changes')
    .map(([fieldKey, decision]) => ({
      fieldKey,
      displayName: getFieldDisplayName(fieldKey),
      reason: decision?.requestOther || decision?.requestCode || 'No reason provided'
    }))

  // Calculate form completion progress for draft mode
  const formProgress = useMemo(() => {
    if (!isDraft || !sections.length) {
      return { completed: 0, total: 0, incompleteFields: [] }
    }

    const formData = safeBusiness?.formData || {}
    let totalFields = 0
    let completedFields = 0
    const incompleteFields = []

    sections.forEach((section, sectionIdx) => {
      if (!section?.items) return

      section.items.forEach((item) => {
        totalFields++
        const fieldKey = item.key || item.name
        const fullPath = `${sectionIdx}.${fieldKey}`
        
        // Check if field has a value
        const value = formData[fieldKey]
        const isComplete = value !== undefined && value !== null && value !== '' &&
                     (Array.isArray(value) ? value.length > 0 : true)
        
        if (isComplete) {
          completedFields++
        } else {
          incompleteFields.push({
            fieldKey: fullPath,
            displayName: getFieldDisplayName(fullPath)
          })
        }
      })
    })

    return { completed: completedFields, total: totalFields, incompleteFields }
  }, [isDraft, sections, safeBusiness?.formData, getFieldDisplayName, refreshKey])

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
    businessTypeLabel,
    rejectionReason,
    approvalComment,
    getFieldDisplayName,
    requestChangeFields,
    formProgress,
  }
}
