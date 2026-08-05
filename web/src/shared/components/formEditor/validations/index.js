/**
 * Validation Orchestrator
 * 
 * Main entry point for the form content editor validation system.
 * Coordinates all validators and provides a unified interface for validation.
 */

import { validateLabel, validateLabelOnChange } from './validators/labelValidator'
import { validateKey, validateKeyOnChange, checkKeyCollision } from './validators/keyValidator'
import { validateValidationRules, validateValidationRuleValue } from './validators/validationRulesValidator'
import { validateDropdownOptions, validateDropdownSource, validateDropdownField } from './validators/dropdownValidator'
import { validateFileUploadField, validateDownloadField, validateCategoryUploadField } from './validators/fileUploadValidator'
import { validateMetadataFields, validateFileMetadataFields, validateOptionMetadataFields } from './validators/metadataValidator'
import { validateRepeatableGroupField, validateGroupColumns, validateRowLimits } from './validators/repeatableGroupValidator'

/**
 * Validation context for field validation
 * @typedef {Object} FieldValidationContext
 * @property {Array} allFields - All fields in the form for collision detection
 * @property {string} fieldType - The type of field being validated
 * @property {boolean} isRequired - Whether the field is required
 */

/**
 * Validates field based on its type
 * @param {Object} field - The field object to validate
 * @param {Array} existingKeys - Array of existing keys
 * @returns {Object} - Validation result with errors and warnings
 */
function validateFieldByType(field, existingKeys) {
  const errors = []
  const warnings = []
  
  switch (field.type) {
    case 'select':
    case 'multiselect': {
      const dropdownResult = validateDropdownField(field)
      if (!dropdownResult.isValid) {
        errors.push({ field: 'dropdownOptions', ...dropdownResult })
      }
      break
    }
    
    case 'file': {
      const fileResult = validateFileUploadField(field)
      if (!fileResult.isValid) {
        errors.push({ field: 'fileUpload', ...fileResult })
      }
      
      // Validate metadata fields
      const metadataResult = validateFileMetadataFields(field, existingKeys)
      if (!metadataResult.isValid) {
        errors.push({ field: 'metadataFields', ...metadataResult })
      }
      break
    }
    
    case 'category_upload': {
      const categoryResult = validateCategoryUploadField(field)
      if (!categoryResult.isValid) {
        errors.push({ field: 'categoryUpload', ...categoryResult })
      }
      
      // Validate metadata fields for each option
      if (field.dropdownOptions) {
        field.dropdownOptions.forEach((option, index) => {
          const optionMetadataResult = validateOptionMetadataFields(option, existingKeys)
          if (!optionMetadataResult.isValid) {
            errors.push({
              field: `dropdownOptions[${index}].metadataFields`,
              ...optionMetadataResult,
            })
          }
        })
      }
      break
    }
    
    case 'download': {
      const downloadResult = validateDownloadField(field)
      if (!downloadResult.isValid) {
        errors.push({ field: 'download', ...downloadResult })
      }
      break
    }
    
    case 'repeatable_group': {
      const groupResult = validateRepeatableGroupField(field, existingKeys)
      if (!groupResult.isValid) {
        errors.push({ field: 'repeatableGroup', ...groupResult })
      }
      break
    }
    
    default:
      // No type-specific validation needed
      break
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validates a complete field configuration
 * @param {Object} field - The field object to validate
 * @param {FieldValidationContext} context - Validation context
 * @returns {Object} - Validation result with isValid, errors, and warnings
 */
export function validateField(field, context = {}) {
  const { allFields = [] } = context
  const errors = []
  const warnings = []
  
  // Collect existing keys and labels for collision detection
  const existingKeys = allFields
    .filter(f => f.id !== field.id && f.key)
    .map(f => f.key)
  const existingLabels = allFields
    .filter(f => f.id !== field.id && f.label)
    .map(f => f.label)
  
  // Validate label
  const labelResult = validateLabel(field.label, {
    existingLabels,
    checkUniqueness: true,
  })
  if (!labelResult.isValid) {
    errors.push({ field: 'label', ...labelResult })
  }
  
  // Validate key
  const keyResult = validateKey(field.key, {
    existingKeys,
    checkUniqueness: true,
    allowEmpty: false,
  })
  if (!keyResult.isValid) {
    errors.push({ field: 'key', ...keyResult })
  } else if (keyResult.severity === 'warning') {
    warnings.push({ field: 'key', ...keyResult })
  }
  
  // Validate help text length
  if (field.helpText && field.helpText.length > 500) {
    errors.push({
      field: 'helpText',
      isValid: false,
      message: 'Help text cannot exceed 500 characters',
      severity: 'error',
    })
  }
  
  // Validate placeholder length
  if (field.placeholder && field.placeholder.length > 200) {
    errors.push({
      field: 'placeholder',
      isValid: false,
      message: 'Placeholder cannot exceed 200 characters',
      severity: 'error',
    })
  }
  
  // Validate validation rules
  const validationRulesResult = validateValidationRules(field.validation, {
    fieldType: field.type,
  })
  if (!validationRulesResult.isValid) {
    errors.push({ field: 'validation', ...validationRulesResult })
  }
  
  // Validate field type-specific configurations
  const typeSpecificResult = validateFieldByType(field, existingKeys)
  if (!typeSpecificResult.isValid) {
    errors.push(...typeSpecificResult.errors)
  }
  if (typeSpecificResult.warnings) {
    warnings.push(...typeSpecificResult.warnings)
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validates a form section (array of fields)
 * @param {Array} fields - The fields to validate
 * @returns {Object} - Validation result with isValid and errors
 */
export function validateFormSection(fields) {
  const errors = []
  
  if (!fields || !Array.isArray(fields)) {
    return {
      isValid: false,
      errors: [{ message: 'Fields must be an array' }],
    }
  }
  
  // Validate each field
  fields.forEach((field, index) => {
    const fieldResult = validateField(field, { allFields: fields })
    if (!fieldResult.isValid) {
      errors.push({
        fieldIndex: index,
        fieldId: field.id,
        errors: fieldResult.errors,
        warnings: fieldResult.warnings,
      })
    }
  })
  
  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Real-time validation for field changes
 * @param {string} field - The field being changed (label, key, etc.)
 * @param {*} value - The new value
 * @param {Object} context - Validation context
 * @returns {Object} - Validation result
 */
export function validateFieldOnChange(field, value, context = {}) {
  switch (field) {
    case 'label':
      return validateLabelOnChange(value, context)
    case 'key':
      return validateKeyOnChange(value, context)
    default:
      return { isValid: true }
  }
}

/**
 * Checks for key collisions without blocking
 * @param {string} key - The key to check
 * @param {Array} existingKeys - Array of existing keys
 * @returns {Object} - Validation result with warning if collision detected
 */
export function validateKeyCollision(key, existingKeys) {
  return checkKeyCollision(key, existingKeys)
}

// Export all validators for direct use if needed
export {
  validateLabel,
  validateLabelOnChange,
  validateKey,
  validateKeyOnChange,
  checkKeyCollision,
  validateValidationRules,
  validateValidationRuleValue,
  validateDropdownOptions,
  validateDropdownSource,
  validateDropdownField,
  validateFileUploadField,
  validateDownloadField,
  validateCategoryUploadField,
  validateMetadataFields,
  validateFileMetadataFields,
  validateOptionMetadataFields,
  validateRepeatableGroupField,
  validateGroupColumns,
  validateRowLimits,
}
