import { useCallback } from 'react'
import { message } from 'antd'
import BusinessOwnerService from '@/features/staffs/lgu-officer/services/businessOwnerService'
import { useStepUp } from '@/shared/hooks/useStepUp'

/**
 * Manages event handlers for business owner operations
 * Handles bookmark, edit, email, history, manual, and info actions
 */
export function useBusinessOwnerHandlers(businessOwner, onUpdate) {
  const businessOwnerService = useCallback(() => new BusinessOwnerService(), [])
  const { runWithStepUp, stepUpModal } = useStepUp()

  /**
   * Handle bookmark toggle
   */
  const handleBookmarkToggle = useCallback(async (toggleBookmarkFn) => {
    if (!toggleBookmarkFn) return
    try {
      await toggleBookmarkFn()
    } catch (err) {
      console.error('Failed to toggle bookmark:', err)
      message.error('Failed to update bookmark')
    }
  }, [])

  /**
   * Handle edit info submit
   */
  const handleEditInfoSubmit = useCallback(async (values, onSuccess) => {
    if (!businessOwner) return
    try {
      const ownerId = businessOwner._id || businessOwner.id
      // Transform field names to match backend expectations
      // Use names instead of PSGC codes for address fields
      const transformedValues = {
        ...values,
        address: {
          ...values.address,
          street: values.address?.streetAddress,
          zipCode: values.address?.postalCode,
          province: values.address?.provinceName || values.address?.province,
          city: values.address?.cityName || values.address?.city,
          barangay: values.address?.barangayName || values.address?.barangay,
        },
      }
      // Remove the form-specific field names
      delete transformedValues.address?.streetAddress
      delete transformedValues.address?.postalCode
      delete transformedValues.address?.provinceName
      delete transformedValues.address?.cityName
      delete transformedValues.address?.barangayName
      
      await runWithStepUp(async (stepUpToken) => {
        await businessOwnerService().updateBusinessOwnerInfo(ownerId, transformedValues, { headers: { 'X-Step-Up-Token': stepUpToken } })
      })
      message.success('Information updated successfully')
      if (onSuccess) onSuccess()
      // Update local state
      if (onUpdate) {
        onUpdate({
          ...businessOwner,
          ...values,
          address: {
            street: values.address?.streetAddress,
            barangay: values.address?.barangayName || values.address?.barangay,
            city: values.address?.cityName || values.address?.city,
            province: values.address?.provinceName || values.address?.province,
            zipCode: values.address?.postalCode,
          },
        })
      }
    } catch (err) {
      console.error('Failed to update business owner info:', err)
      if (err?.message !== 'Step-up cancelled') {
        message.error('Failed to update information')
      }
    }
  }, [businessOwner, businessOwnerService, onUpdate, runWithStepUp])

  /**
   * Handle update email submit
   */
  const handleUpdateEmailSubmit = useCallback(async (values, onSuccess) => {
    if (!businessOwner) return
    try {
      await runWithStepUp(async (stepUpToken) => {
        const ownerId = businessOwner._id || businessOwner.id
        await businessOwnerService().updateBusinessOwnerEmail(ownerId, { newEmail: values.newEmail }, { stepUpToken })
      })
      message.success('Email update request sent. Verification emails sent to both addresses.')
      // Update local state
      if (onUpdate) {
        onUpdate({
          ...businessOwner,
          email: values.newEmail,
        })
      }
      // Close modal after successful update
      if (onSuccess) onSuccess()
    } catch (err) {
      if (err?.message !== 'Step-up cancelled') {
        console.error('Failed to update email:', err)
        message.error('Failed to update email')
      }
    }
  }, [businessOwner, businessOwnerService, onUpdate, runWithStepUp])

  /**
   * Handle copy to clipboard
   */
  const handleCopyToClipboard = useCallback(async (text, label) => {
    try {
      await navigator.clipboard.writeText(text)
      message.success(`${label} copied to clipboard`)
    } catch {
      message.error('Failed to copy')
    }
  }, [])

  return {
    handleBookmarkToggle,
    handleEditInfoSubmit,
    handleUpdateEmailSubmit,
    handleCopyToClipboard,
    stepUpModal,
  }
}
