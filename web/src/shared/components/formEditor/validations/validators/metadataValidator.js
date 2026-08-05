/**
 * Metadata Validator
 * 
 * Validates metadata field configurations in the form content editor.
 * Ensures metadata fields are properly configured with valid types and no duplicate keys.
 */

import { FIELD_LIMITS, METADATA_FIELD_TYPES, VALIDATION_SEVERITY } from '../constants/validationConstants'
import {
  validateMaxCount,
  validateNoDuplicates,
  validateEnum,
  createResult,
} from './commonValidators'

/**
 * Validation context for metadata validation
 * @typedef {Object} MetadataValidationContext
 * @property {Array} existingKeys - Array of existing keys in the form
 * @property {boolean} checkUniqueness - Whether to check for duplicate keys
 */

/**
 * Validates a single metadata field
 * @param {Object} metadataField - The metadata field to validate
 * @param {number} index - The index of the metadata field
 * @param {MetadataValidationContext} context - Validation context
 * @returns {Object} - Validation result
 */
export function validateMetadataField(metadataField, index, context = {}) {
  const { existingKeys = [], checkUniqueness = false } = context
  
  // Validate label
  if (!metadataField.label || metadataField.label.trim() === '') {
    return createResult(
      false,
      `Metadata field at index ${index} must have a label`,
      VALIDATION_SEVERITY.ERROR
    )
  }
  
  // Validate type
  const typeResult = validateEnum(
    metadataField.type,
    Object.values(METADATA_FIELD_TYPES)
  )
  if (!typeResult.isValid) {
    return createResult(
      false,
      `Invalid metadata field type at index ${index}`,
      VALIDATION_SEVERITY.ERROR
    )
  }
  
  // Validate key if present
  if (metadataField.key) {
    // Check for uniqueness if required
    if (checkUniqueness && existingKeys.length > 0) {
      const isDuplicate = existingKeys.some(
        existingKey => existingKey.toLowerCase() === metadataField.key.toLowerCase()
      )
      if (isDuplicate) {
        return createResult(
          false,
          `Metadata field key "${metadataField.key}" at index ${index} already exists`,
          VALIDATION_SEVERITY.ERROR
        )
      }
    }
  }
  
  return createResult(true)
}

/**
 * Validates metadata fields array
 * @param {Array} metadataFields - The metadata fields to validate
 * @param {MetadataValidationContext} context - Validation context
 * @returns {Object} - Validation result
 */
export function validateMetadataFields(metadataFields, context = {}) {
  const { existingKeys = [], checkUniqueness = false } = context
  
  // Check if metadata fields exist
  if (!metadataFields || !Array.isArray(metadataFields)) {
    return createResult(
      false,
      'Metadata fields must be an array',
      VALIDATION_SEVERITY.ERROR
    )
  }
  
  // Check maximum count
  const maxCountResult = validateMaxCount(metadataFields, FIELD_LIMITS.METADATA_FIELDS.MAX_COUNT)
  if (!maxCountResult.isValid) {
    return maxCountResult
  }
  
  // Validate each metadata field
  const allKeys = [...existingKeys]
  for (let i = 0; i < metadataFields.length; i++) {
    const field = metadataFields[i]
    const fieldContext = {
      existingKeys: allKeys,
      checkUniqueness,
    }
    const fieldResult = validateMetadataField(field, i, fieldContext)
    if (!fieldResult.isValid) {
      return fieldResult
    }
    
    // Add key to existing keys for uniqueness check
    if (field.key) {
      allKeys.push(field.key)
    }
  }
  
  // Check for duplicate keys within metadata fields
  const keys = metadataFields
    .filter(field => field.key)
    .map(field => field.key)
  const duplicateResult = validateNoDuplicates(keys)
  if (!duplicateResult.isValid) {
    return createResult(
      false,
      'Duplicate metadata field keys detected',
      VALIDATION_SEVERITY.ERROR
    )
  }
  
  return createResult(true)
}

/**
 * Validates metadata fields for a file upload field
 * @param {Object} field - The field object to validate
 * @param {Array} existingKeys - Array of existing keys in the form
 * @returns {Object} - Validation result
 */
export function validateFileMetadataFields(field, existingKeys = []) {
  return validateMetadataFields(field.metadataFields, {
    existingKeys,
    checkUniqueness: true,
  })
}

/**
 * Validates metadata fields for a dropdown option
 * @param {Object} option - The dropdown option to validate
 * @param {Array} existingKeys - Array of existing keys in the form
 * @returns {Object} - Validation result
 */
export function validateOptionMetadataFields(option, existingKeys = []) {
  return validateMetadataFields(option.metadataFields, {
    existingKeys,
    checkUniqueness: true,
  })
}
