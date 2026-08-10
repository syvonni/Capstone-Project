/**
 * Profile Validation Utilities
 * Reuses validation rules from authentication feature and adds profile-specific validations
 */

// Reuse existing validation rules from authentication
export {
  firstNameRules,
  lastNameRules,
  middleNameRules,
  suffixRules,
  phoneNumberRules,
} from '@/features/authentication/utils/validations'

// Business owner specific validations
export const pisSexRules = [
  { required: false, message: 'Please select sex' }
]

export const pisDateOfBirthRules = [
  { required: false, message: 'Please select date of birth' }
]

export const pisMaritalStatusRules = [
  { required: false, message: 'Please select marital status' }
]

export const pisPlaceOfBirthRules = [
  { required: false, message: 'Please enter place of birth' }
]

export const pisNationalityRules = [
  { required: false, message: 'Please enter nationality' }
]

export const pisEducationRules = [
  { required: false, message: 'Please select educational attainment' }
]

export const pisFatherNameRules = [
  { required: false, message: 'Please enter father\'s name' }
]

export const pisMotherNameRules = [
  { required: false, message: 'Please enter mother\'s name' }
]

/**
 * Validate address fields
 * @param {object} address - Address object to validate
 * @returns {object} Validation result with isValid and errors
 */
export function validateAddress(address) {
  const errors = []
  
  if (!address) {
    return { isValid: false, errors: ['Address is required'] }
  }

  if (!address.street || address.street.trim() === '') {
    errors.push('Street address is required')
  }

  if (!address.barangay || address.barangay.trim() === '') {
    errors.push('Barangay is required')
  }

  if (!address.city || address.city.trim() === '') {
    errors.push('City is required')
  }

  if (!address.province || address.province.trim() === '') {
    errors.push('Province is required')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate phone number format
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} Whether phone number is valid
 */
export function isValidPhoneNumber(phoneNumber) {
  // Philippine phone number format: 09XXXXXXXXX
  const phoneRegex = /^09\d{9}$/
  return phoneRegex.test(phoneNumber)
}

/**
 * Format phone number for display
 * @param {string} phoneNumber - Phone number to format
 * @returns {string} Formatted phone number
 */
export function formatPhoneNumber(phoneNumber) {
  if (!phoneNumber) return ''
  
  // Remove any non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '')
  
  // Format as 09XX XXX XXXX
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`
  }
  
  return phoneNumber
}