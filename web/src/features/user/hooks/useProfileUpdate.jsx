import { useState, useCallback, useRef } from 'react'
import { App } from 'antd'
import { useAuthSession } from '@/features/authentication'
import { profileService } from '@/features/user/services'
import { useAuthNotification, useNotifier } from '@/shared/notifications.js'
import { getRoleSlug } from '@/features/user/utils/roleHelpers.js'

/**
 * useProfileUpdate Hook
 * Handles all profile update operations with optimistic updates and change detection
 */
export function useProfileUpdate({ onSuccess }) {
  const { modal } = App.useApp()
  const { currentUser, role, login } = useAuthSession()
  const { notificationSuccess } = useAuthNotification()
  const { error } = useNotifier()
  
  const [isSubmitting, setSubmitting] = useState(false)
  const [optimisticProfile, setOptimisticProfile] = useState(null)
  const initialValuesRef = useRef({})

  const roleSlug = getRoleSlug(role)
  const isBusinessOwner = roleSlug === 'business_owner'

  /**
   * Calculate changed fields between two profile states
   */
  const getChangedFields = useCallback((newValues, oldValues) => {
    const changes = []
    const fmt = (v) => (v === undefined || v === null || v === '') ? '(empty)' : String(v)
    const fmtDate = (v) => (!v) ? '(empty)' : (v.toDate ? v.toDate() : v)

    if (newValues.firstName !== oldValues.firstName) {
      changes.push(`First Name: "${fmt(oldValues.firstName)}" → "${fmt(newValues.firstName)}"`)
    }
    if (newValues.lastName !== oldValues.lastName) {
      changes.push(`Last Name: "${fmt(oldValues.lastName)}" → "${fmt(newValues.lastName)}"`)
    }
    
    if (isBusinessOwner) {
      if (newValues.middleName !== oldValues.middleName) {
        changes.push(`Middle Name: "${fmt(oldValues.middleName)}" → "${fmt(newValues.middleName)}"`)
      }
      if (newValues.suffix !== oldValues.suffix) {
        changes.push(`Suffix: "${fmt(oldValues.suffix)}" → "${fmt(newValues.suffix)}"`)
      }
      if (newValues.sex !== oldValues.sex) {
        changes.push(`Sex: "${fmt(oldValues.sex)}" → "${fmt(newValues.sex)}"`)
      }
      
      const oldDob = oldValues.dateOfBirth ? (oldValues.dateOfBirth.toDate?.() || oldValues.dateOfBirth) : null
      const newDob = newValues.dateOfBirth ? (newValues.dateOfBirth.toDate?.() || newValues.dateOfBirth) : null
      if (String(oldDob?.toISOString?.() ?? '') !== String(newDob?.toISOString?.() ?? '')) {
        changes.push(`Date of Birth: ${fmtDate(oldValues.dateOfBirth)} → ${fmtDate(newValues.dateOfBirth)}`)
      }
      
      if (newValues.maritalStatus !== oldValues.maritalStatus) {
        changes.push(`Marital Status: "${fmt(oldValues.maritalStatus)}" → "${fmt(newValues.maritalStatus)}"`)
      }
      if (newValues.placeOfBirth !== oldValues.placeOfBirth) {
        changes.push(`Place of Birth: "${fmt(oldValues.placeOfBirth)}" → "${fmt(newValues.placeOfBirth)}"`)
      }
      if (newValues.nationality !== oldValues.nationality) {
        changes.push(`Nationality: "${fmt(oldValues.nationality)}" → "${fmt(newValues.nationality)}"`)
      }
      if (newValues.highestEducationalAttainment !== oldValues.highestEducationalAttainment) {
        changes.push(`Education: "${fmt(oldValues.highestEducationalAttainment)}" → "${fmt(newValues.highestEducationalAttainment)}"`)
      }
      if (newValues.fatherName !== oldValues.fatherName) {
        changes.push(`Father's Name: "${fmt(oldValues.fatherName)}" → "${fmt(newValues.fatherName)}"`)
      }
      if (newValues.motherName !== oldValues.motherName) {
        changes.push(`Mother's Name: "${fmt(oldValues.motherName)}" → "${fmt(newValues.motherName)}"`)
      }
      if (newValues.distinctiveMark !== oldValues.distinctiveMark) {
        changes.push(`Distinctive Mark: "${fmt(oldValues.distinctiveMark)}" → "${fmt(newValues.distinctiveMark)}"`)
      }
      
      const oldAddr = oldValues.address || {}
      const newAddr = newValues.address || {}
      if (oldAddr.street !== newAddr.street || oldAddr.barangay !== newAddr.barangay || 
          oldAddr.city !== newAddr.city || oldAddr.province !== newAddr.province || 
          oldAddr.zipCode !== newAddr.zipCode) {
        changes.push('Address')
      }
    }
    
    if (newValues.phoneNumber !== oldValues.phoneNumber) {
      changes.push(`Phone Number: "${fmt(oldValues.phoneNumber)}" → "${fmt(newValues.phoneNumber)}"`)
    }

    return changes
  }, [isBusinessOwner])

  /**
   * Update profile with confirmation dialog
   */
  const updateProfile = useCallback(async (values, currentValues) => {
    const changedFields = getChangedFields(values, currentValues)
    
    if (changedFields.length === 0) {
      return { success: false, message: 'No changes to save' }
    }

    return new Promise((resolve) => {
      const content = (
        <div>
          <p>You are about to update the following fields:</p>
          <ul style={{ marginTop: 8, marginBottom: 8 }}>
            {changedFields.map((change, idx) => (
              <li key={idx} style={{ marginBottom: 4 }}>{change}</li>
            ))}
          </ul>
        </div>
      )

      modal.confirm({
        title: 'Confirm Profile Changes',
        content,
        okText: 'Save Changes',
        cancelText: 'Cancel',
        onOk: async () => {
          try {
            setSubmitting(true)
            setOptimisticProfile(values)
            initialValuesRef.current = values
            
            if (isBusinessOwner) {
              // Business owner: use specialized endpoints
              const namePayload = {
                firstName: values.firstName,
                lastName: values.lastName,
                middleName: values.middleName ?? '',
                suffix: values.suffix ?? '',
                sex: values.sex ?? '',
                dateOfBirth: values.dateOfBirth ? (values.dateOfBirth.toDate?.() || values.dateOfBirth) : undefined,
              }
              
              const contactPayload = { phoneNumber: values.phoneNumber }
              
              const addr = values.address || {}
              const pisPayload = {
                address: {
                  street: addr.street ?? '',
                  zipCode: addr.zipCode ?? '',
                  province: addr.province ?? '',
                  city: addr.city ?? '',
                  barangay: addr.barangay ?? '',
                },
                maritalStatus: values.maritalStatus,
                placeOfBirth: values.placeOfBirth,
                nationality: values.nationality,
                fatherName: values.fatherName,
                motherName: values.motherName,
                distinctiveMark: values.distinctiveMark,
                highestEducationalAttainment: values.highestEducationalAttainment,
              }

              // Call all three endpoints in parallel
              await Promise.all([
                profileService.updateBusinessOwnerProfileName(namePayload, currentUser, role),
                profileService.updateBusinessOwnerProfileContact(contactPayload, currentUser, role),
                profileService.updateBusinessOwnerProfilePis(pisPayload, currentUser, role),
              ])
            } else {
              // Regular user: use general endpoint
              const payload = {
                firstName: values.firstName,
                lastName: values.lastName,
                phoneNumber: values.phoneNumber,
              }
              await profileService.updateProfile(payload, currentUser, role)
            }

            // Refresh user session
            await login()
            
            notificationSuccess('Profile updated successfully')
            if (onSuccess) onSuccess()
            
            resolve({ success: true, message: 'Profile updated successfully' })
          } catch (err) {
            console.error('Profile update failed:', err)
            error(err, 'Failed to update profile')
            setOptimisticProfile(null)
            resolve({ success: false, message: 'Failed to update profile' })
          } finally {
            setSubmitting(false)
          }
        },
        onCancel: () => {
          resolve({ success: false, message: 'Update cancelled' })
        }
      })
    })
  }, [currentUser, role, isBusinessOwner, getChangedFields, modal, notificationSuccess, error, login, onSuccess])

  /**
   * Check if profile has unsaved changes
   */
  const hasChanges = useCallback((values) => {
    return JSON.stringify(values) !== JSON.stringify(initialValuesRef.current)
  }, [])

  /**
   * Reset to initial values
   */
  const reset = useCallback(() => {
    setOptimisticProfile(null)
  }, [])

  return {
    isSubmitting,
    optimisticProfile,
    updateProfile,
    hasChanges,
    reset,
    setInitialValues: (values) => {
      initialValuesRef.current = values
    },
  }
}