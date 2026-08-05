/**
 * Common Validators
 * 
 * Reusable validation functions that can be used across different field types.
 * These validators follow a consistent interface and return validation results.
 */

import { VALIDATION_ERRORS, VALIDATION_SEVERITY } from '../constants/validationConstants'
import { isReservedWord } from '../constants/reservedKeywords'

/**
 * Validation result structure
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether the validation passed
 * @property {string} message - Error or warning message
 * @property {string} severity - Severity level (error, warning, info)
 */

/**
 * Creates a validation result object
 * @param {boolean} isValid - Whether the validation passed
 * @param {string} message - Error or warning message
 * @param {string} severity - Severity level
 * @returns {ValidationResult}
 */
export function createResult(isValid, message = '', severity = VALIDATION_SEVERITY.ERROR) {
  return { isValid, message, severity }
}

/**
 * Validates that a value is not empty
 * @param {string} value - The value to validate
 * @param {string} _fieldName - Name of the field for error message (unused)
 * @returns {ValidationResult}
 */
export function validateRequired(value, _fieldName = 'Field') {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return createResult(false, VALIDATION_ERRORS.REQUIRED, VALIDATION_SEVERITY.ERROR)
  }
  return createResult(true)
}

/**
 * Validates minimum length of a string
 * @param {string} value - The value to validate
 * @param {number} minLength - Minimum allowed length
 * @returns {ValidationResult}
 */
export function validateMinLength(value, minLength) {
  if (!value) return createResult(true) // Skip if empty (use required validator separately)
  if (value.length < minLength) {
    return createResult(false, VALIDATION_ERRORS.MIN_LENGTH(minLength), VALIDATION_SEVERITY.ERROR)
  }
  return createResult(true)
}

/**
 * Validates maximum length of a string
 * @param {string} value - The value to validate
 * @param {number} maxLength - Maximum allowed length
 * @returns {ValidationResult}
 */
export function validateMaxLength(value, maxLength) {
  if (!value) return createResult(true) // Skip if empty
  if (value.length > maxLength) {
    return createResult(false, VALIDATION_ERRORS.MAX_LENGTH(maxLength), VALIDATION_SEVERITY.ERROR)
  }
  return createResult(true)
}

/**
 * Validates that a value matches a regex pattern
 * @param {string} value - The value to validate
 * @param {RegExp} pattern - The regex pattern to match
 * @param {string} customMessage - Custom error message (optional)
 * @returns {ValidationResult}
 */
export function validatePattern(value, pattern, customMessage) {
  if (!value) return createResult(true) // Skip if empty
  if (!pattern.test(value)) {
    return createResult(false, customMessage || VALIDATION_ERRORS.INVALID_PATTERN, VALIDATION_SEVERITY.ERROR)
  }
  return createResult(true)
}

/**
 * Validates that a value is within a numeric range
 * @param {number} value - The value to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {ValidationResult}
 */
export function validateRange(value, min, max) {
  if (value === null || value === undefined) return createResult(true) // Skip if empty
  const numValue = Number(value)
  if (isNaN(numValue)) {
    return createResult(false, VALIDATION_ERRORS.INVALID_PATTERN, VALIDATION_SEVERITY.ERROR)
  }
  if (numValue < min || numValue > max) {
    return createResult(false, VALIDATION_ERRORS.INVALID_RANGE(min, max), VALIDATION_SEVERITY.ERROR)
  }
  return createResult(true)
}

/**
 * Validates that a value is one of the allowed enum values
 * @param {*} value - The value to validate
 * @param {Array} allowedValues - Array of allowed values
 * @returns {ValidationResult}
 */
export function validateEnum(value, allowedValues) {
  if (value === null || value === undefined) return createResult(true) // Skip if empty
  if (!allowedValues.includes(value)) {
    return createResult(false, VALIDATION_ERRORS.INVALID_ENUM, VALIDATION_SEVERITY.ERROR)
  }
  return createResult(true)
}

/**
 * Validates that a minimum value is not greater than a maximum value
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {ValidationResult}
 */
export function validateMinLessThanMax(min, max) {
  if (min !== null && max !== null && min > max) {
    return createResult(false, VALIDATION_ERRORS.MIN_GREATER_THAN_MAX, VALIDATION_SEVERITY.ERROR)
  }
  return createResult(true)
}

/**
 * Validates a regex pattern string
 * @param {string} patternString - The regex pattern string to validate
 * @returns {ValidationResult}
 */
export function validateRegexPattern(patternString) {
  if (!patternString) return createResult(true) // Skip if empty
  try {
    new RegExp(patternString)
    return createResult(true)
  } catch {
    return createResult(false, VALIDATION_ERRORS.INVALID_REGEX, VALIDATION_SEVERITY.ERROR)
  }
}

/**
 * Validates that a key is not a reserved word
 * @param {string} key - The key to validate
 * @returns {ValidationResult}
 */
export function validateNotReserved(key) {
  if (!key) return createResult(true) // Skip if empty
  if (isReservedWord(key)) {
    return createResult(false, VALIDATION_ERRORS.RESERVED_KEYWORD, VALIDATION_SEVERITY.ERROR)
  }
  return createResult(true)
}

/**
 * Validates key format (must start with letter, contain only alphanumeric and underscores)
 * @param {string} key - The key to validate
 * @returns {ValidationResult}
 */
export function validateKeyFormat(key) {
  if (!key) return createResult(true) // Skip if empty
  const keyPattern = /^[a-zA-Z][a-zA-Z0-9_]*$/
  if (!keyPattern.test(key)) {
    return createResult(false, VALIDATION_ERRORS.INVALID_KEY_FORMAT, VALIDATION_SEVERITY.ERROR)
  }
  return createResult(true)
}

/**
 * Warns if a key is numeric-only
 * @param {string} key - The key to validate
 * @returns {ValidationResult}
 */
export function validateNotNumericKey(key) {
  if (!key) return createResult(true) // Skip if empty
  if (/^\d+$/.test(key)) {
    return createResult(false, VALIDATION_ERRORS.NUMERIC_KEY_WARNING, VALIDATION_SEVERITY.WARNING)
  }
  return createResult(true)
}

/**
 * Validates that a value is non-negative
 * @param {number} value - The value to validate
 * @returns {ValidationResult}
 */
export function validateNonNegative(value) {
  if (value === null || value === undefined) return createResult(true) // Skip if empty
  const numValue = Number(value)
  if (isNaN(numValue) || numValue < 0) {
    return createResult(false, VALIDATION_ERRORS.INVALID_RANGE(0, Infinity), VALIDATION_SEVERITY.ERROR)
  }
  return createResult(true)
}

/**
 * Validates file type against allowed types
 * @param {string} fileType - The file type to validate (e.g., 'pdf')
 * @param {Array} allowedTypes - Array of allowed file types
 * @returns {ValidationResult}
 */
export function validateFileType(fileType, allowedTypes) {
  if (!fileType) return createResult(true) // Skip if empty
  const normalizedType = fileType.toLowerCase().replace('.', '')
  if (!allowedTypes.includes(normalizedType)) {
    return createResult(false, VALIDATION_ERRORS.INVALID_FILE_TYPE, VALIDATION_SEVERITY.ERROR)
  }
  return createResult(true)
}

/**
 * Validates file size against maximum allowed size
 * @param {number} fileSize - The file size in bytes
 * @param {number} maxSizeBytes - Maximum allowed size in bytes
 * @param {number} maxSizeMB - Maximum allowed size in MB (for error message)
 * @returns {ValidationResult}
 */
export function validateFileSize(fileSize, maxSizeBytes, maxSizeMB) {
  if (!fileSize) return createResult(true) // Skip if empty
  if (fileSize > maxSizeBytes) {
    return createResult(false, VALIDATION_ERRORS.FILE_TOO_LARGE(maxSizeMB), VALIDATION_SEVERITY.ERROR)
  }
  return createResult(true)
}

/**
 * Validates that an array has at least a minimum number of items
 * @param {Array} array - The array to validate
 * @param {number} minCount - Minimum required count
 * @returns {ValidationResult}
 */
export function validateMinCount(array, minCount) {
  if (!array || array.length < minCount) {
    return createResult(false, VALIDATION_ERRORS.REQUIRED, VALIDATION_SEVERITY.ERROR)
  }
  return createResult(true)
}

/**
 * Validates that an array does not exceed a maximum number of items
 * @param {Array} array - The array to validate
 * @param {number} maxCount - Maximum allowed count
 * @returns {ValidationResult}
 */
export function validateMaxCount(array, maxCount) {
  if (!array) return createResult(true) // Skip if empty
  if (array.length > maxCount) {
    return createResult(false, VALIDATION_ERRORS.TOO_MANY_OPTIONS(maxCount), VALIDATION_SEVERITY.ERROR)
  }
  return createResult(true)
}

/**
 * Validates that an array has no duplicate values
 * @param {Array} array - The array to validate
 * @param {string} keyProperty - Property to check for duplicates (optional)
 * @returns {ValidationResult}
 */
export function validateNoDuplicates(array, keyProperty) {
  if (!array || array.length <= 1) return createResult(true) // Skip if empty or single item
  
  const values = keyProperty ? array.map(item => item[keyProperty]) : array
  const uniqueValues = new Set(values)
  
  if (uniqueValues.size !== values.length) {
    return createResult(false, VALIDATION_ERRORS.DUPLICATE_OPTION, VALIDATION_SEVERITY.ERROR)
  }
  return createResult(true)
}

/**
 * Trims whitespace from a string value
 * @param {string} value - The value to trim
 * @returns {string} - Trimmed value
 */
export function trimValue(value) {
  if (typeof value === 'string') {
    return value.trim()
  }
  return value
}

/**
 * Runs multiple validators and returns the first failure
 * @param {Array<Function>} validators - Array of validator functions
 * @param {*} value - The value to validate
 * @returns {ValidationResult} - First failure or success if all pass
 */
export function validateWithMultiple(validators, value) {
  for (const validator of validators) {
    const result = validator(value)
    if (!result.isValid) {
      return result
    }
  }
  return createResult(true)
}
