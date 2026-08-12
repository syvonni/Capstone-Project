import { useState } from 'react'
import { App } from 'antd'
import { createApplication, updateApplication, submitApplication, patchApplicationFormData } from '../../../services/applicationService'
import { getBusinessNameFromFormDefinition } from '../../../utils/formUtils'

export function useApplicationFormSubmit({
  _isEditing,
  editingApplication,
  registrationType,
  generalPermitCategory,
  documentCids,
  formDefinition,
  onSubmitted,
  draftApplicationId,
  setDraftApplicationId,
  setSubmitted,
  setHasUnsavedChanges,
  updateFn, // Optional: override updateApplication (e.g. officer walk-in uses PUT /api/business/walk-in/:id)
  onSaveSuccess, // Callback when save succeeds (for triggering overview refresh)
  _currentApplicationStatus, // Current status to preserve during auto-save
}) {
  const { message } = App.useApp()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (values, isFinalSubmit = false, options = {}) => {
    if (!formDefinition) {
      message.error('Form definition not loaded. Please try again.')
      return
    }

    setSubmitting(true)
    setError(null)

    // Extract business name from the form definition's designated business name field
    const extractedBusinessName = getBusinessNameFromFormDefinition(formDefinition, values)
    const businessName = extractedBusinessName || 'Business Application'

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

    try {
      let response
      // Use draftApplicationId if available (draft was already created), otherwise check isEditing
      const existingApplicationId = editingApplication?.applicationId || editingApplication?._id || draftApplicationId

      if (isFinalSubmit) {
        // Final submit: use dedicated submit endpoint
        if (!existingApplicationId) {
          // First create the draft, then submit it
          response = await createApplication(payload)
          const application = response.application
          const newApplicationId = application?.applicationId || application?._id
          if (newApplicationId) {
            setDraftApplicationId(newApplicationId)
          }
          // Now submit it
          response = await submitApplication(newApplicationId)
        } else {
          // Draft exists, update it first then submit
          await updateApplication(existingApplicationId, payload)
          response = await submitApplication(existingApplicationId)
        }
      } else {
        // Auto-save: use lightweight PATCH for form data only
        const patchPayload = {
          formData: cleanedValues,
          businessName,
          documentCids: mergedCids,
        }
        if (existingApplicationId) {
          const doUpdate = updateFn || patchApplicationFormData
          response = await doUpdate(existingApplicationId, patchPayload, { signal: options.signal })
        } else {
          response = await createApplication(payload, { signal: options.signal })
          const application = response.application
          const newApplicationId = application?.applicationId || application?._id
          if (newApplicationId) {
            setDraftApplicationId(newApplicationId)
          }
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
      console.error('Failed to save application:', err)
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


