/**
 * Label Validator
 * 
 * Validates field labels in the form content editor.
 * Ensures labels are required, not too long, and properly formatted.
 */

import { FIELD_LIMITS, VALIDATION_SEVERITY } from '../constants/validationConstants'
import {
  validateRequired,
  validateMinLength,
  validateMaxLength,
  trimValue,
  createResult,
} from './commonValidators'

/**
 * Validation context for label validation
 * @typedef {Object} LabelValidationContext
 * @property {Array} existingLabels - Array of existing labels in the form
 * @property {boolean} checkUniqueness - Whether to check for duplicate labels
 */

/**
 * Validates a field label
 * @param {string} label - The label to validate
 * @param {LabelValidationContext} context - Validation context
 * @returns {Object} - Validation result with isValid, message, and severity
 */
export function validateLabel(label, context = {}) {
  const { existingLabels = [], checkUniqueness = false } = context
  
  // Trim the label
  const trimmedLabel = trimValue(label)
  
  // Check if required
  const requiredResult = validateRequired(trimmedLabel)
  if (!requiredResult.isValid) {
    return requiredResult
  }
  
  // Check minimum length
  const minLengthResult = validateMinLength(trimmedLabel, FIELD_LIMITS.LABEL.MIN_LENGTH)
  if (!minLengthResult.isValid) {
    return minLengthResult
  }
  
  // Check maximum length
  const maxLengthResult = validateMaxLength(trimmedLabel, FIELD_LIMITS.LABEL.MAX_LENGTH)
  if (!maxLengthResult.isValid) {
    return maxLengthResult
  }
  
  // Check for uniqueness if required
  if (checkUniqueness && existingLabels.length > 0) {
    const isDuplicate = existingLabels.some(
      existingLabel => existingLabel.toLowerCase() === trimmedLabel.toLowerCase()
    )
    if (isDuplicate) {
      return createResult(
        false,
        'This label already exists in the form',
        VALIDATION_SEVERITY.ERROR
      )
    }
  }
  
  return createResult(true)
}

/**
 * Validates label on change (real-time validation)
 * @param {string} label - The label to validate
 * @param {LabelValidationContext} context - Validation context
 * @returns {Object} - Validation result
 */
export function validateLabelOnChange(label, context = {}) {
  // For on-change validation, we can be more lenient
  // Only validate if the label is not empty
  if (!label || label.trim() === '') {
    return createResult(true) // Allow empty during typing
  }
  
  return validateLabel(label, context)
}
