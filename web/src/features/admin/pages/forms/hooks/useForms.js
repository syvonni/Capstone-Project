import { useState, useCallback } from 'react'
import useUndoRedo from '@/shared/hooks/useUndoRedo'
import { useFormChangeTracking } from '@/shared/hooks/useFormChangeTracking'
import { useAudit } from '@/shared/audit/hooks/useAudit'

// Mock data
const MOCK_FORMS = [
  {
    id: 'form-1',
    name: 'Unified Business Permit Application Form',
    description: 'Main application form for all business types',
    status: 'active',
    lastModified: '2024-01-15',
    sections: [
      { id: 'section-1', title: 'Business Information', completed: true },
      { id: 'section-2', title: 'Owner Information', completed: true },
      { id: 'section-3', title: 'Line of Business', completed: false },
    ],
  },
]

export function useForms() {
  const [forms, setForms] = useState(MOCK_FORMS)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Use shared hooks
  const { canUndo, canRedo, undo, redo, pushHistory } = useUndoRedo()
  const { hasUnsavedChanges, markAsDirty, markAsClean } = useFormChangeTracking()
  const { logAuditEvent } = useAudit()

  const updateForm = useCallback((formId, updates) => {
    setForms((prevForms) =>
      prevForms.map((form) =>
        form.id === formId ? { ...form, ...updates } : form
      )
    )
    pushHistory(forms)
    markAsDirty()
  }, [forms, pushHistory, markAsDirty])

  const saveForm = useCallback(async (formId) => {
    setSaving(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500))
    await logAuditEvent('form_updated', { formId })
    markAsClean()
    setSaving(false)
  }, [logAuditEvent, markAsClean])

  const deleteForm = useCallback(async (formId) => {
    setLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500))
    setForms((prevForms) => prevForms.filter((form) => form.id !== formId))
    await logAuditEvent('form_deleted', { formId })
    setLoading(false)
  }, [logAuditEvent])

  return {
    forms,
    loading,
    saving,
    canUndo,
    canRedo,
    hasUnsavedChanges,
    updateForm,
    saveForm,
    deleteForm,
    undo,
    redo,
  }
}
