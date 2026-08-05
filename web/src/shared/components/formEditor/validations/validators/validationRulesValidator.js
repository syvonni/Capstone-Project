/**
 * Validation Rules Validator
 * 
 * Validates validation rule configurations in the form content editor.
 * Ensures validation rules are properly configured and consistent.
 */

import { FIELD_LIMITS, VALIDATION_SEVERITY } from '../constants/validationConstants'
import {
  validateMinLessThanMax,
  validateNonNegative,
  validateRegexPattern,
  validateRange,
  createResult,
} from './commonValidators'

/**
 * Validation context for validation rules
 * @typedef {Object} ValidationRulesContext
 * @property {string} fieldType - The type of field being validated
 */

/**
 * Validates a validation rule configuration
 * @param {Object} validation - The validation object to validate
 * @param {ValidationRulesContext} context - Validation context
 * @returns {Object} - Validation result with isValid, message, and severity
 */
export function validateValidationRules(validation, context = {}) {
  const { fieldType = 'text' } = context
  
  if (!validation || Object.keys(validation).length === 0) {
    return createResult(true) // No validation rules is valid
  }
  
  // Validate minLength and maxLength for text-based fields
  if (validation.minLength !== undefined || validation.maxLength !== undefined) {
    if (!['text', 'textarea', 'email', 'phone'].includes(fieldType)) {
      return createResult(
        false,
        'Length validation is only applicable to text-based fields',
        VALIDATION_SEVERITY.ERROR
      )
    }
    
    // Check if min > max
    const rangeResult = validateMinLessThanMax(validation.minLength, validation.maxLength)
    if (!rangeResult.isValid) {
      return rangeResult
    }
    
    // Validate range values
    if (validation.minLength !== undefined) {
      const minResult = validateRange(
        validation.minLength,
        FIELD_LIMITS.VALIDATION_RULES.MIN_NUMBER,
        FIELD_LIMITS.VALIDATION_RULES.MAX_NUMBER
      )
      if (!minResult.isValid) {
        return minResult
      }
    }
    
    if (validation.maxLength !== undefined) {
      const maxResult = validateRange(
        validation.maxLength,
        FIELD_LIMITS.VALIDATION_RULES.MIN_NUMBER,
        FIELD_LIMITS.VALIDATION_RULES.MAX_NUMBER
      )
      if (!maxResult.isValid) {
        return maxResult
      }
    }
  }
  
  // Validate minValue and maxValue for number fields
  if (validation.minValue !== undefined || validation.maxValue !== undefined) {
    if (fieldType !== 'number') {
      return createResult(
        false,
        'Range validation is only applicable to number fields',
        VALIDATION_SEVERITY.ERROR
      )
    }
    
    // Check if min > max
    const rangeResult = validateMinLessThanMax(validation.minValue, validation.maxValue)
    if (!rangeResult.isValid) {
      return rangeResult
    }
    
    // Validate range values
    if (validation.minValue !== undefined) {
      const minResult = validateRange(
        validation.minValue,
        FIELD_LIMITS.VALIDATION_RULES.MIN_NUMBER,
        FIELD_LIMITS.VALIDATION_RULES.MAX_NUMBER
      )
      if (!minResult.isValid) {
        return minResult
      }
    }
    
    if (validation.maxValue !== undefined) {
      const maxResult = validateRange(
        validation.maxValue,
        FIELD_LIMITS.VALIDATION_RULES.MIN_NUMBER,
        FIELD_LIMITS.VALIDATION_RULES.MAX_NUMBER
      )
      if (!maxResult.isValid) {
        return maxResult
      }
    }
  }
  
  // Validate regex pattern
  if (validation.pattern !== undefined) {
    if (!['text', 'textarea', 'email', 'phone'].includes(fieldType)) {
      return createResult(
        false,
        'Pattern validation is only applicable to text-based fields',
        VALIDATION_SEVERITY.ERROR
      )
    }
    
    const patternResult = validateRegexPattern(validation.pattern)
    if (!patternResult.isValid) {
      return patternResult
    }
  }
  
  // Validate maxFileSize for file upload fields
  if (validation.maxFileSize !== undefined) {
    if (!['file', 'category_upload', 'download'].includes(fieldType)) {
      return createResult(
        false,
        'File size validation is only applicable to file upload fields',
        VALIDATION_SEVERITY.ERROR
      )
    }
    
    const nonNegativeResult = validateNonNegative(validation.maxFileSize)
    if (!nonNegativeResult.isValid) {
      return nonNegativeResult
    }
  }
  
  // Validate acceptedFileTypes for file upload fields
  if (validation.acceptedFileTypes !== undefined) {
    if (!['file', 'category_upload', 'download'].includes(fieldType)) {
      return createResult(
        false,
        'File type validation is only applicable to file upload fields',
        VALIDATION_SEVERITY.ERROR
      )
    }
    
    // Validate format (comma-separated list)
    if (typeof validation.acceptedFileTypes === 'string') {
      const types = validation.acceptedFileTypes.split(',').map(t => t.trim())
      const validExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx']
      
      for (const type of types) {
        if (!validExtensions.includes(type.toLowerCase())) {
          return createResult(
            false,
            `Invalid file type: ${type}. Valid types are: ${validExtensions.join(', ')}`,
            VALIDATION_SEVERITY.ERROR
          )
        }
      }
    }
  }
  
  return createResult(true)
}

/**
 * Validates a single validation rule value
 * @param {string} ruleName - The name of the validation rule
 * @param {*} value - The value to validate
 * @param {string} fieldType - The type of field
 * @returns {Object} - Validation result
 */
export function validateValidationRuleValue(ruleName, value, fieldType) {
  switch (ruleName) {
    case 'minLength':
    case 'maxLength':
      if (!['text', 'textarea', 'email', 'phone'].includes(fieldType)) {
        return createResult(false, 'Not applicable for this field type', VALIDATION_SEVERITY.ERROR)
      }
      return validateRange(value, FIELD_LIMITS.VALIDATION_RULES.MIN_NUMBER, FIELD_LIMITS.VALIDATION_RULES.MAX_NUMBER)
    
    case 'minValue':
    case 'maxValue':
      if (fieldType !== 'number') {
        return createResult(false, 'Not applicable for this field type', VALIDATION_SEVERITY.ERROR)
      }
      return validateRange(value, FIELD_LIMITS.VALIDATION_RULES.MIN_NUMBER, FIELD_LIMITS.VALIDATION_RULES.MAX_NUMBER)
    
    case 'pattern':
      if (!['text', 'textarea', 'email', 'phone'].includes(fieldType)) {
        return createResult(false, 'Not applicable for this field type', VALIDATION_SEVERITY.ERROR)
      }
      return validateRegexPattern(value)
    
    case 'maxFileSize':
      if (!['file', 'category_upload', 'download'].includes(fieldType)) {
        return createResult(false, 'Not applicable for this field type', VALIDATION_SEVERITY.ERROR)
      }
      return validateNonNegative(value)
    
    default:
      return createResult(true)
  }
}
