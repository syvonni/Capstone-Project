/**
 * Key Validator
 * 
 * Validates field keys in the form content editor.
 * Ensures keys are properly formatted, not reserved words, and unique within the form.
 */

import { FIELD_LIMITS, VALIDATION_ERRORS, VALIDATION_WARNINGS, VALIDATION_SEVERITY } from '../constants/validationConstants'
import {
  validateRequired,
  validateMinLength,
  validateMaxLength,
  validateKeyFormat,
  validateNotReserved,
  validateNotNumericKey,
  createResult,
} from './commonValidators'

/**
 * Validation context for key validation
 * @typedef {Object} KeyValidationContext
 * @property {Array} existingKeys - Array of existing keys in the form
 * @property {boolean} checkUniqueness - Whether to check for duplicate keys
 * @property {boolean} allowEmpty - Whether to allow empty keys (for auto-generation)
 */

/**
 * Validates a field key
 * @param {string} key - The key to validate
 * @param {KeyValidationContext} context - Validation context
 * @returns {Object} - Validation result with isValid, message, and severity
 */
export function validateKey(key, context = {}) {
  const { existingKeys = [], checkUniqueness = false, allowEmpty = false } = context
  
  // Allow empty if specified (for auto-generation)
  if (allowEmpty && (!key || key === '')) {
    return createResult(true)
  }
  
  // Check if required
  const requiredResult = validateRequired(key)
  if (!requiredResult.isValid) {
    return requiredResult
  }
  
  // Check minimum length
  const minLengthResult = validateMinLength(key, FIELD_LIMITS.KEY.MIN_LENGTH)
  if (!minLengthResult.isValid) {
    return minLengthResult
  }
  
  // Check maximum length
  const maxLengthResult = validateMaxLength(key, FIELD_LIMITS.KEY.MAX_LENGTH)
  if (!maxLengthResult.isValid) {
    return maxLengthResult
  }
  
  // Check key format
  const formatResult = validateKeyFormat(key)
  if (!formatResult.isValid) {
    return formatResult
  }
  
  // Check if reserved word
  const reservedResult = validateNotReserved(key)
  if (!reservedResult.isValid) {
    return reservedResult
  }
  
  // Warn if numeric-only
  const numericResult = validateNotNumericKey(key)
  if (!numericResult.isValid) {
    return numericResult
  }
  
  // Check for uniqueness if required
  if (checkUniqueness && existingKeys.length > 0) {
    const isDuplicate = existingKeys.some(
      existingKey => existingKey.toLowerCase() === key.toLowerCase()
    )
    if (isDuplicate) {
      return createResult(
        false,
        VALIDATION_ERRORS.KEY_COLLISION,
        VALIDATION_SEVERITY.ERROR
      )
    }
  }
  
  return createResult(true)
}

/**
 * Validates key on change (real-time validation)
 * @param {string} key - The key to validate
 * @param {KeyValidationContext} context - Validation context
 * @returns {Object} - Validation result
 */
export function validateKeyOnChange(key, context = {}) {
  // For on-change validation, allow empty during typing
  if (!key || key === '') {
    return createResult(true)
  }
  
  return validateKey(key, context)
}

/**
 * Checks for potential key collisions without blocking
 * @param {string} key - The key to check
 * @param {Array} existingKeys - Array of existing keys
 * @returns {Object} - Validation result with warning if collision detected
 */
export function checkKeyCollision(key, existingKeys = []) {
  if (!key || key === '') {
    return createResult(true)
  }
  
  const isDuplicate = existingKeys.some(
    existingKey => existingKey.toLowerCase() === key.toLowerCase()
  )
  
  if (isDuplicate) {
    return createResult(
      true, // Not blocking, just a warning
      VALIDATION_WARNINGS.KEY_COLLISION,
      VALIDATION_SEVERITY.WARNING
    )
  }
  
  return createResult(true)
}
