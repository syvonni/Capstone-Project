import { useEffect, useRef } from 'react'

/**
 * Hook for marking the form dirty when switching between sections so the
 * unified autosave scheduler can flush it.
 * @param {Object} params
 * @param {number} activeSectionIndex - Current active section index
 * @param {string} draftApplicationId - Draft application ID
 * @param {boolean} isEditing - Whether editing an existing application
 * @param {boolean} hasUnsavedChanges - Whether there are unsaved changes
 * @param {boolean} submitting - Whether currently submitting
 * @param {boolean} formReadOnly - Whether form is read-only
 * @param {Object} form - Form instance
 * @param {Function} setFormValues - Function to update form values state
 * @param {Function} setHasUnsavedChanges - Function to set unsaved changes flag
 * @param {Function} markDirty - Function from useApplicationAutosave to trigger a flush
 */
export function useApplicationAutosaveSectionChange({
  activeSectionIndex,
  draftApplicationId,
  isEditing,
  hasUnsavedChanges,
  submitting,
  formReadOnly,
  form,
  setFormValues,
  setHasUnsavedChanges,
  markDirty,
}) {
  const previousSectionRef = useRef(-1)

  // Auto-save when switching sections
  useEffect(() => {
    // Skip auto-save if:
    // - Not editing/no draft exists yet
    // - Form is read-only
    // - No unsaved changes
    // - Still on the same section (initial render)
    // - Currently submitting
    if (!isEditing && !draftApplicationId) return
    if (formReadOnly) return
    if (!hasUnsavedChanges) return
    if (previousSectionRef.current === activeSectionIndex) return
    if (submitting) return

    // Keep track of the section even when going back to overview
    if (activeSectionIndex === -1) {
      previousSectionRef.current = activeSectionIndex
      return
    }

    // Mark the latest form values as dirty so the unified autosave queue flushes.
    const values = form.getFieldsValue(true)
    const businessActivities = form.getFieldValue('businessActivities')
    const valuesWithLob = businessActivities !== undefined
      ? { ...values, businessActivities }
      : values
    setFormValues(valuesWithLob)
    setHasUnsavedChanges(true)
    markDirty()

    previousSectionRef.current = activeSectionIndex
  }, [activeSectionIndex, isEditing, draftApplicationId, formReadOnly, hasUnsavedChanges, submitting, form, setFormValues, setHasUnsavedChanges, markDirty])
}
