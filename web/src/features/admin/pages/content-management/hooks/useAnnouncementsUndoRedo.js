import { useCallback, useEffect } from 'react'
import useUndoRedo from '@/shared/hooks/useUndoRedo'

export default function useAnnouncementsUndoRedo(formValues, selectedId) {
  const { undo, redo, resetHistory, pushHistory, canUndo, canRedo } = useUndoRedo()

  // Reset history when selecting a different announcement
  useEffect(() => {
    if (formValues) {
      resetHistory(formValues)
    }
  }, [selectedId, formValues, resetHistory])

  // Push history on form field changes (only track form data, not status)
  const handleFieldChange = useCallback((changedValues) => {
    // Only track form fields, not status changes
    const formFields = ['title', 'body', 'priority', 'publishAt', 'expiresAt', 'isActive']
    const hasFormChange = Object.keys(changedValues).some(key => formFields.includes(key))
    
    if (hasFormChange && formValues) {
      pushHistory({ ...formValues, ...changedValues })
    }
  }, [formValues, pushHistory])

  return {
    undo,
    redo,
    resetHistory,
    pushHistory,
    canUndo,
    canRedo,
    handleFieldChange,
  }
}
