import { useState, useEffect, useRef } from 'react'

export function useApplicationFormStepState(editingApplication, initialRegistrationType, form) {
  const isEditing = !!editingApplication
  const [step, setStep] = useState(isEditing ? 'form' : 'type_selection')
  const [registrationType, setRegistrationType] = useState(editingApplication?.formId || editingApplication?.formType || initialRegistrationType || (isEditing ? 'unified-business-permit' : null))
  const [generalPermitCategory, setGeneralPermitCategory] = useState(editingApplication?.category || null)

  const initialTypeRef = useRef(initialRegistrationType)

  // When switching to "Add" (editingApplication becomes null), reset to type selection
  // BUT skip reset if initialRegistrationType is provided (coming from welcome modal)
  // When editingApplication changes to a new application, update formValues immediately
  useEffect(() => {
    if (!editingApplication && !initialTypeRef.current) {
      setStep('type_selection')
      setRegistrationType(null)
      setGeneralPermitCategory(null)
      form.resetFields()
    } else if (editingApplication) {
      setGeneralPermitCategory(editingApplication.category || null)
      setRegistrationType(editingApplication.formId || editingApplication.formType || 'unified-business-permit')
    }
  }, [editingApplication, form])

  // When registrationType changes to a formId (not 'general'), set step to 'type_selection' to trigger form loading
  useEffect(() => {
    if (registrationType && registrationType !== 'general' && step !== 'form' && !isEditing) {
      // Step is already type_selection, no need to change it
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registrationType, isEditing])

  return {
    step,
    setStep,
    registrationType,
    setRegistrationType,
    generalPermitCategory,
    setGeneralPermitCategory,
  }
}
