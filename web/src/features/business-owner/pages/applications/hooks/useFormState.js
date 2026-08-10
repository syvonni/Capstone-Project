import { useState, useCallback } from 'react'

export function useFormState() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [showProgressView, setShowProgressView] = useState(false)
  const [showBusinessTypeSelector, setShowBusinessTypeSelector] = useState(false)
  const [editingApplication, setEditingApplication] = useState(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [permitType, setPermitType] = useState('general')
  const [fromWelcomeModal, setFromWelcomeModal] = useState(false)

  const resetFormState = useCallback(() => {
    setShowAddForm(false)
    setShowProgressView(false)
    setEditingApplication(null)
    setFromWelcomeModal(false)
  }, [])

  const openApplicationForm = useCallback((options = {}) => {
    const { formId = null, registrationType = 'general', fromWelcome = false } = options
    // Use formId if provided, otherwise fall back to registrationType for backward compatibility
    console.log('openApplicationForm called with formId:', formId, 'registrationType:', registrationType)
    setPermitType(formId || registrationType)
    setFromWelcomeModal(fromWelcome)
    setShowAddForm(true)
    setEditingApplication(null)
  }, [])

  const openEditApplicationForm = useCallback((application) => {
    if (!application) return
    setEditingApplication(application)
    setShowAddForm(true)
    // Note: selectedBusinessId should be cleared by the caller to ensure proper panel rendering
  }, [])

  return {
    showAddForm,
    setShowAddForm,
    showProgressView,
    setShowProgressView,
    showBusinessTypeSelector,
    setShowBusinessTypeSelector,
    editingApplication,
    setEditingApplication,
    formSubmitting,
    setFormSubmitting,
    permitType,
    setPermitType,
    fromWelcomeModal,
    setFromWelcomeModal,
    resetFormState,
    openApplicationForm,
    openEditApplicationForm,
  }
}
