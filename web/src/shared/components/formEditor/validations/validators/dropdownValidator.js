/**
 * Dropdown Validator
 * 
 * Validates dropdown option configurations in the form content editor.
 * Ensures dropdown options are properly configured and consistent.
 */

import { FIELD_LIMITS, VALIDATION_SEVERITY } from '../constants/validationConstants'
import {
  validateMinCount,
  validateMaxCount,
  validateNoDuplicates,
  createResult,
} from './commonValidators'

/**
 * Validation context for dropdown validation
 * @typedef {Object} DropdownValidationContext
 * @property {string} fieldType - The type of field (select or multiselect)
 * @property {boolean} isRequired - Whether the dropdown field is required
 */

/**
 * Validates a single dropdown option
 * @param {string|Object} option - The option to validate
 * @param {number} index - The index of the option (for error messages)
 * @returns {Object} - Validation result
 */
export function validateDropdownOption(option, index) {
  const isObject = typeof option === 'object'
  
  if (isObject) {
    // Validate label
    if (!option.label || option.label.trim() === '') {
      return createResult(
        false,
        `Option at index ${index} must have a label`,
        VALIDATION_SEVERITY.ERROR
      )
    }
    
    // Validate ID if present
    if (option.id !== undefined && option.id.trim() === '') {
      return createResult(
        false,
        `Option at index ${index} has an empty ID`,
        VALIDATION_SEVERITY.ERROR
      )
    }
  } else {
    // Validate string option
    if (!option || option.trim() === '') {
      return createResult(
        false,
        `Option at index ${index} cannot be empty`,
        VALIDATION_SEVERITY.ERROR
      )
    }
  }
  
  return createResult(true)
}

/**
 * Validates dropdown options array
 * @param {Array} options - The dropdown options to validate
 * @param {DropdownValidationContext} context - Validation context
 * @returns {Object} - Validation result with isValid, message, and severity
 */
export function validateDropdownOptions(options, context = {}) {
  const { _fieldType = 'select', isRequired = true } = context
  
  // Check if options exist
  if (!options || !Array.isArray(options)) {
    return createResult(
      false,
      'Dropdown options must be an array',
      VALIDATION_SEVERITY.ERROR
    )
  }
  
  // Check minimum count if required
  if (isRequired) {
    const minCountResult = validateMinCount(options, FIELD_LIMITS.DROPDOWN_OPTIONS.MIN_COUNT)
    if (!minCountResult.isValid) {
      return createResult(
        false,
        'At least one option is required for dropdown fields',
        VALIDATION_SEVERITY.ERROR
      )
    }
  }
  
  // Check maximum count
  const maxCountResult = validateMaxCount(options, FIELD_LIMITS.DROPDOWN_OPTIONS.MAX_COUNT)
  if (!maxCountResult.isValid) {
    return maxCountResult
  }
  
  // Validate each option
  for (let i = 0; i < options.length; i++) {
    const option = options[i]
    const optionResult = validateDropdownOption(option, i)
    if (!optionResult.isValid) {
      return optionResult
    }
  }
  
  // Check for duplicate labels
  const labels = options.map(opt => typeof opt === 'string' ? opt : opt.label)
  const duplicateResult = validateNoDuplicates(labels)
  if (!duplicateResult.isValid) {
    return duplicateResult
  }
  
  // Check for duplicate IDs (if options are objects)
  const hasObjectOptions = options.some(opt => typeof opt === 'object')
  if (hasObjectOptions) {
    const ids = options
      .filter(opt => typeof opt === 'object' && opt.id)
      .map(opt => opt.id)
    const idDuplicateResult = validateNoDuplicates(ids)
    if (!idDuplicateResult.isValid) {
      return createResult(
        false,
        'Duplicate option IDs detected',
        VALIDATION_SEVERITY.ERROR
      )
    }
  }
  
  return createResult(true)
}

/**
 * Validates dropdown source
 * @param {string} source - The dropdown source to validate
 * @returns {Object} - Validation result
 */
export function validateDropdownSource(source) {
  const validSources = ['static', 'dynamic']
  
  if (!source) {
    return createResult(true) // Default to static
  }
  
  if (!validSources.includes(source)) {
    return createResult(
      false,
      `Invalid dropdown source. Must be one of: ${validSources.join(', ')}`,
      VALIDATION_SEVERITY.ERROR
    )
  }
  
  return createResult(true)
}

/**
 * Validates dropdown configuration for a field
 * @param {Object} field - The field object to validate
 * @returns {Object} - Validation result
 */
export function validateDropdownField(field) {
  // Check if dropdown options are required for static source
  if (field.dropdownSource === 'static' || !field.dropdownSource) {
    const optionsResult = validateDropdownOptions(field.dropdownOptions, {
      fieldType: field.type,
      isRequired: field.required,
    })
    if (!optionsResult.isValid) {
      return optionsResult
    }
  }
  
  // Validate dropdown source
  const sourceResult = validateDropdownSource(field.dropdownSource)
  if (!sourceResult.isValid) {
    return sourceResult
  }
  
  return createResult(true)
}
