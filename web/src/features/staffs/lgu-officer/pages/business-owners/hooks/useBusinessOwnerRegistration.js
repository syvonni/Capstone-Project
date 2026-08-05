import { useState, useCallback, useMemo } from 'react'
import { Form, message } from 'antd'
import BusinessOwnerService from '@/features/staffs/lgu-officer/services/businessOwnerService'

/**
 * Manages registration logic for business owner registration
 * Handles multi-step registration flow, account linking, and form submission
 */
export function useBusinessOwnerRegistration(onSuccess) {
  const [form] = Form.useForm()
  const [currentStep, setCurrentStep] = useState(0)
  const [canSubmit, setCanSubmit] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [selectedResult, setSelectedResult] = useState(null)
  const [hasChecked, setHasChecked] = useState(false)
  const [loading, setLoading] = useState(false)

  const businessOwnerService = useMemo(() => new BusinessOwnerService(), [])

  /**
   * Check for existing business owner accounts by name
   */
  const checkExistingAccounts = useCallback(async (_firstName, _lastName) => {
    try {
      setLoading(true)
      // TODO: Implement actual API call to check for existing accounts
      // For now, return empty results
      setSearchResults([])
      setHasChecked(true)
      setCanSubmit(false)
    } catch (err) {
      console.error('Failed to check existing accounts:', err)
      message.error('Failed to check for existing accounts')
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Select a search result (link to existing account)
   */
  const selectResult = useCallback((result) => {
    setSelectedResult(result)
    setCanSubmit(true)
  }, [])

  /**
   * Clear search results
   */
  const clearResults = useCallback(() => {
    setSearchResults([])
    setSelectedResult(null)
    setHasChecked(false)
    setCanSubmit(false)
  }, [])

  /**
   * Handle form change
   */
  const handleFormChange = useCallback(() => {
    setHasChecked(false)
    setCanSubmit(false)
    setSearchResults([])
    setSelectedResult(null)
  }, [])

  /**
   * Go to next step
   */
  const nextStep = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, 2))
  }, [])

  /**
   * Go to previous step
   */
  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }, [])

  /**
   * Reset form
   */
  const resetForm = useCallback(() => {
    form.resetFields()
    setCurrentStep(0)
    setCanSubmit(false)
    setSearchResults([])
    setSelectedResult(null)
    setHasChecked(false)
  }, [form])

  /**
   * Submit registration
   */
  const submitRegistration = useCallback(async () => {
    try {
      setLoading(true)
      const values = await form.validateFields()

      // If linking to existing account, use that ID
      if (selectedResult) {
        // TODO: Implement account linking logic
        message.success('Account linked successfully')
      } else {
        // Register new account
        await businessOwnerService.registerBusinessOwner(values)
        message.success('Business owner registered successfully. Temporary credentials will be sent to their email.')
      }

      resetForm()
      if (onSuccess) onSuccess()
    } catch (err) {
      console.error('Failed to register business owner:', err)
      message.error('Failed to register business owner')
    } finally {
      setLoading(false)
    }
  }, [form, selectedResult, businessOwnerService, resetForm, onSuccess])

  /**
   * Get demo prefill data (development only)
   */
  const getDemoPrefill = useCallback(() => {
    if (import.meta.env.DEV) {
      return {
        firstName: 'Mark Stephen',
        lastName: 'Diaz',
        middleName: 'Cabalsi',
        suffix: '',
        email: 'stephendiaz.syv@gmail.com',
        phoneNumber: '09957811767',
        sex: 'male',
        dateOfBirth: '1995-03-25',
        maritalStatus: 'single',
        placeOfBirth: 'Manila',
        nationality: 'Filipino',
        highestEducationalAttainment: 'college',
        fatherName: 'Roberto Garcia',
        motherName: 'Luisa Martinez',
        distinctiveMark: '',
        streetAddress: '321 Elm St',
        barangay: 'Barangay 321',
        city: 'Pasig',
        province: 'Metro Manila',
        zipCode: '1600',
      }
    }
    return {}
  }, [])

  return {
    form,
    currentStep,
    canSubmit,
    searchResults,
    selectedResult,
    hasChecked,
    loading,
    checkExistingAccounts,
    selectResult,
    clearResults,
    handleFormChange,
    nextStep,
    prevStep,
    resetForm,
    submitRegistration,
    getDemoPrefill,
  }
}
