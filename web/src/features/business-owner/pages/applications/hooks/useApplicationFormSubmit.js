import { useState } from 'react'
import { App } from 'antd'
import { addBusiness, updateBusiness } from '../../../services/businessProfileService'

function useBusinessFormSubmit({
  _isEditing,
  editingBusiness,
  registrationType,
  generalPermitCategory,
  documentCids,
  formDefinition,
  onSubmitted,
  draftBusinessId,
  setDraftBusinessId,
  setSubmitted,
  setHasUnsavedChanges,
  updateFn, // Optional: override updateBusiness (e.g. officer walk-in uses PUT /api/business/walk-in/:id)
  onSaveSuccess, // Callback when save succeeds (for triggering overview refresh)
  currentApplicationStatus, // Current status to preserve during auto-save
}) {
  const { message } = App.useApp()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (values, isFinalSubmit = false) => {
    if (!formDefinition) {
      message.error('Form definition not loaded. Please try again.')
      return
    }

    setSubmitting(true)
    setError(null)

    // Try to extract business name from various possible fields
    // For general permits, the field is 'activityName' not 'businessName'
    const businessName = values.businessName || 
                        values.registeredBusinessName || 
                        values['Business / trade name'] ||
                        values.businessTradeName ||
                        values.activityName ||
                        'Business Application'

    // Extract CIDs from file fields in form values and merge into documentCids.
    // File fields are stored as [{uid, name, status, cid}] by DynamicFormRenderer's customRequest.
    // These arrays contain File blobs that get lost during JSON serialization, so we also
    // replace them in formData with the CID string for persistence.
    const mergedCids = { ...documentCids }
    const cleanedValues = { ...values }
    const allFields = (formDefinition?.sections || []).flatMap(s => s.items || [])

    allFields.forEach((field) => {
      if (field.type !== 'file') return
      const key = field.key
      if (!key) return
      const val = values[key]
      if (Array.isArray(val) && val.length > 0) {
        const first = val[0]
        const cid = first?.cid || first?.ipfsCid || first?.response?.cid || first?.response?.ipfsCid
        if (cid && typeof cid === 'string' && cid.trim()) {
          mergedCids[field.documentKey || key] = cid.trim()
          // Store CID string in formData so it persists on backend
          cleanedValues[key] = cid.trim()
        }
        const url = first?.url || first?.response?.url
        if (!cid && url && typeof url === 'string') {
          mergedCids[field.documentKey || key] = url.trim()
          cleanedValues[key] = url.trim()
        }
      } else if (documentCids && documentCids[field.documentKey || key]) {
        // Preserve existing CID from documentCids if field is empty (locked/read-only)
        cleanedValues[key] = documentCids[field.documentKey || key]
      }
    })

    const payload = {
      businessName,
      formType: registrationType,
      category: generalPermitCategory,
      formData: cleanedValues,
      documentCids: mergedCids,
    }

    // Determine application status:
    // - If final submit, set to 'submitted' (or 'resubmit' if current is 'returned')
    // - If auto-save, preserve current status if it's not 'draft'
    // - Otherwise, default to 'draft' for new applications
    if (isFinalSubmit) {
      payload.applicationStatus = currentApplicationStatus === 'returned' ? 'resubmit' : 'submitted'
      payload.submittedAt = new Date().toISOString()
    } else {
      // Auto-save: preserve current status if it's not draft
      const normalizedCurrentStatus = (currentApplicationStatus || '').toLowerCase()
      if (normalizedCurrentStatus && normalizedCurrentStatus !== 'draft') {
        payload.applicationStatus = currentApplicationStatus
      } else {
        payload.applicationStatus = 'draft'
      }
    }

    try {
      let response
      // Use draftBusinessId if available (draft was already created), otherwise check isEditing
      const existingBusinessId = editingBusiness?.businessId || editingBusiness?._id || draftBusinessId
      
      if (existingBusinessId) {
        const doUpdate = updateFn || updateBusiness
        response = await doUpdate(existingBusinessId, payload)
      } else {
        response = await addBusiness(payload)
        if (response.businessId) {
          setDraftBusinessId(response.businessId)
        }
      }

      if (isFinalSubmit) {
        setSubmitted(true)
        onSubmitted?.(response)
      } else {
        setHasUnsavedChanges(false)
      }
      
      // Trigger save success callback for overview refresh
      // Pass the cleanedValues (actual saved form data) instead of the API response
      if (onSaveSuccess) {
        onSaveSuccess(cleanedValues)
      }
      
      // Return the response so caller can use it
      return response
    } catch (err) {
      console.error('Failed to save business:', err)
      const errorMsg = err?.message || (isFinalSubmit ? 'Failed to submit application' : 'Failed to save draft')
      setError(errorMsg)
      message.error(errorMsg)
      throw err // Re-throw so caller knows it failed
    } finally {
      setSubmitting(false)
    }
  }

  return { handleSubmit, submitting, error, setError }
}

export default useBusinessFormSubmit
