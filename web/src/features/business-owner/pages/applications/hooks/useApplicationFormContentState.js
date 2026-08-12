import { useState, useEffect } from 'react'

export function useFormContentState(editingApplication, _form) {
  const [formDefinition, setFormDefinition] = useState(null)
  const [loading, setLoading] = useState(!!editingApplication)
  const [formValues, setFormValues] = useState(() => {
    const initial = editingApplication?.formData || {}
    // Ensure generalPermitCategory is set for conditional section visibility
    if (editingApplication?.category && !initial.generalPermitCategory) {
      return { ...initial, generalPermitCategory: editingApplication.category }
    }
    return initial
  })
  const [activeSectionIndex, setActiveSectionIndex] = useState(-1)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [documentCids, setDocumentCids] = useState({})
  const [draftBusinessId, setDraftBusinessId] = useState(null)

  // When editingApplication changes to a new business, update formValues immediately
  useEffect(() => {
    if (editingApplication) {
      const initial = editingApplication.formData || {}
      if (editingApplication.category && !initial.generalPermitCategory) {
        setFormValues({ ...initial, generalPermitCategory: editingApplication.category })
      } else {
        setFormValues(initial)
      }
      setDraftBusinessId(editingApplication.businessId || editingApplication._id)
      // Populate documentCids from backend response (documents or lguDocuments)
      const docs = editingApplication.documents || editingApplication.lguDocuments || {}
      setDocumentCids(docs)
    } else {
      setFormValues({})
      setDocumentCids({})
      setDraftBusinessId(null)
      setLoading(false)
      setActiveSectionIndex(-1)
      setHasUnsavedChanges(false)
    }
  }, [editingApplication])

  return {
    formDefinition,
    setFormDefinition,
    loading,
    setLoading,
    formValues,
    setFormValues,
    activeSectionIndex,
    setActiveSectionIndex,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    documentCids,
    setDocumentCids,
    draftBusinessId,
    setDraftBusinessId,
  }
}
