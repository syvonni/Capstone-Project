import { useCallback } from 'react'
import { createApplication } from '../../../services/applicationService'
import { generateTestDataForDefinition, formDataWithDayjs } from '../../../utils/businessFormUtils'

/**
 * Hook for managing test data generation for permit applications
 * @param {Object} params
 * @param {Object} formDefinition - Form definition
 * @param {string} generalPermitCategory - General permit category
 * @param {Object} form - Form instance
 * @param {Function} setFormValues - Function to set form values
 * @param {Object} lobSectionRef - Ref to the LOBSection component
 * @param {boolean} isEditing - Whether editing an existing application
 * @param {string} draftApplicationId - Draft application ID
 * @param {Function} setDraftApplicationId - Function to set draft application ID
 * @param {string} registrationType - Registration type
 * @param {Object} message - Ant Design message API
 * @param {string} mode - 'create' (business owner) or 'update' (LGU officer)
 * @param {Function} updateFn - Optional update function for officer mode
 * @param {string} applicationId - Application ID for update mode
 * @returns {Object} Test data handler
 */
export function useApplicationTestData({
  formDefinition,
  generalPermitCategory,
  form,
  setFormValues,
  lobSectionRef = null,
  isEditing,
  draftApplicationId,
  setDraftApplicationId,
  registrationType,
  message,
  mode = 'create',
  updateFn = null,
  applicationId = null,
}) {
  const doFillTestData = useCallback(async () => {
    if (!formDefinition) {
      message.error('Form definition not loaded yet. Please wait a moment and try again.')
      return
    }
    const testData = generateTestDataForDefinition(formDefinition, generalPermitCategory, [], registrationType)
    const processedTestData = formDataWithDayjs(testData, formDefinition)

    // Set category fields first so conditional metadata fields mount before values are applied
    const categoryFields = {}
    Object.keys(processedTestData).forEach((key) => {
      if (key.endsWith('_category')) categoryFields[key] = processedTestData[key]
    })
    form.setFieldsValue(categoryFields)
    await new Promise((resolve) => setTimeout(resolve, 0))

    // Fill the LOB section if it is mounted (unified business permit)
    if (lobSectionRef?.current) {
      const lobActivity = lobSectionRef.current.fillTestData()
      if (lobActivity) {
        processedTestData.businessActivities = [lobActivity]
      }
    }

    form.setFieldsValue(processedTestData)
    setFormValues((prev) => ({ ...prev, ...processedTestData }))

    // Handle saving based on mode
    if (mode === 'create') {
      // Business owner mode: create draft if one doesn't exist yet
      if (!isEditing && !draftApplicationId) {
        try {
          const payload = {
            businessName: 'New Business Application',
            applicationStatus: 'draft',
            formType: registrationType,
            category: generalPermitCategory,
            formData: processedTestData,
          }
          const response = await createApplication(payload)
          const application = response.application
          const newApplicationId = application?.applicationId || application?._id
          if (newApplicationId) {
            setDraftApplicationId(newApplicationId)
          }
        } catch (err) {
          console.error('Failed to create draft for test data:', err)
        }
      }
    } else if (mode === 'update' && updateFn && applicationId) {
      // LGU officer mode: update existing application
      try {
        await updateFn(applicationId, {
          formData: processedTestData
        })
      } catch (err) {
        console.error('Failed to save test data:', err)
        message.error('Failed to save test data')
        return
      }
    }

    message.success('Form filled with test data')
  }, [
    formDefinition,
    generalPermitCategory,
    form,
    message,
    lobSectionRef,
    isEditing,
    draftApplicationId,
    registrationType,
    setDraftApplicationId,
    setFormValues,
    mode,
    updateFn,
    applicationId,
  ])

  return {
    doFillTestData,
  }
}
