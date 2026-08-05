import { useState, useMemo, useCallback } from 'react'
import { GENERAL_PERMIT_CATEGORIES } from '../constants'

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

  // Determine permit type: formType 'general_permit' = temporary, 'permit' = regular
  const isGeneralPermit = safeBusiness?.formType === 'general_permit'
  const categoryValue = safeBusiness?.category || safeBusiness?.formData?.category
  const categoryLabel = GENERAL_PERMIT_CATEGORIES.find(cat => cat.value === categoryValue)?.label || categoryValue
  const businessTypeLabel = isGeneralPermit 
    ? (categoryLabel || 'Temporary') 
    : 'Regular'

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
        
        // Check if field has a value - handle special field mappings
        let isComplete = false
        
        // Special mapping for aiLobRecommendation field
        if (fieldKey === 'aiLobRecommendation') {
          isComplete = !!(formData.businessDescriptionText || formData.businessActivities)
        } else {
          const value = formData[fieldKey]
          isComplete = value !== undefined && value !== null && value !== '' && 
                       (Array.isArray(value) ? value.length > 0 : true)
        }
        
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
    isGeneralPermit,
    categoryLabel,
    businessTypeLabel,
    rejectionReason,
    approvalComment,
    getFieldDisplayName,
    requestChangeFields,
    formProgress,
  }
}
