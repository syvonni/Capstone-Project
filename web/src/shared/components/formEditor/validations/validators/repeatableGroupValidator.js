/**
 * Repeatable Group Validator
 * 
 * Validates repeatable group field configurations in the form content editor.
 * Ensures repeatable groups have valid column configurations and row limits.
 */

import { FIELD_LIMITS, VALIDATION_SEVERITY } from '../constants/validationConstants'
import {
  validateMinCount,
  validateMaxCount,
  validateMinLessThanMax,
  validateNonNegative,
  validateNoDuplicates,
  createResult,
} from './commonValidators'

/**
 * Validation context for repeatable group validation
 * @typedef {Object} RepeatableGroupValidationContext
 * @property {Array} existingKeys - Array of existing keys in the form
 * @property {boolean} checkUniqueness - Whether to check for duplicate keys
 */

/**
 * Validates a single column in a repeatable group
 * @param {Object} column - The column to validate
 * @param {number} index - The index of the column
 * @param {RepeatableGroupValidationContext} context - Validation context
 * @returns {Object} - Validation result
 */
export function validateGroupColumn(column, index, context = {}) {
  const { existingKeys = [], checkUniqueness = false } = context
  
  // Validate label
  if (!column.label || column.label.trim() === '') {
    return createResult(
      false,
      `Column at index ${index} must have a label`,
      VALIDATION_SEVERITY.ERROR
    )
  }
  
  // Validate key if present
  if (column.key) {
    // Check for uniqueness if required
    if (checkUniqueness && existingKeys.length > 0) {
      const isDuplicate = existingKeys.some(
        existingKey => existingKey.toLowerCase() === column.key.toLowerCase()
      )
      if (isDuplicate) {
        return createResult(
          false,
          `Column key "${column.key}" at index ${index} already exists`,
          VALIDATION_SEVERITY.ERROR
        )
      }
    }
  }
  
  // Validate type
  const validTypes = ['text', 'number', 'date', 'select', 'multiselect']
  if (!validTypes.includes(column.type)) {
    return createResult(
      false,
      `Invalid column type at index ${index}`,
      VALIDATION_SEVERITY.ERROR
    )
  }
  
  // Validate dropdown options if type is select or multiselect
  if ((column.type === 'select' || column.type === 'multiselect') && column.dropdownOptions) {
    if (!Array.isArray(column.dropdownOptions) || column.dropdownOptions.length === 0) {
      return createResult(
        false,
        `Column at index ${index} must have dropdown options for type ${column.type}`,
        VALIDATION_SEVERITY.ERROR
      )
    }
  }
  
  return createResult(true)
}

/**
 * Validates group columns array
 * @param {Array} groupFields - The group fields to validate
 * @param {RepeatableGroupValidationContext} context - Validation context
 * @returns {Object} - Validation result
 */
export function validateGroupColumns(groupFields, context = {}) {
  const { existingKeys = [], checkUniqueness = false } = context
  
  // Check if group fields exist
  if (!groupFields || !Array.isArray(groupFields)) {
    return createResult(
      false,
      'Group fields must be an array',
      VALIDATION_SEVERITY.ERROR
    )
  }
  
  // Check minimum count
  const minCountResult = validateMinCount(groupFields, FIELD_LIMITS.REPEATABLE_GROUP.MIN_COLUMNS)
  if (!minCountResult.isValid) {
    return createResult(
      false,
      'At least one column is required',
      VALIDATION_SEVERITY.ERROR
    )
  }
  
  // Check maximum count
  const maxCountResult = validateMaxCount(groupFields, FIELD_LIMITS.REPEATABLE_GROUP.MAX_COLUMNS)
  if (!maxCountResult.isValid) {
    return maxCountResult
  }
  
  // Validate each column
  const allKeys = [...existingKeys]
  for (let i = 0; i < groupFields.length; i++) {
    const column = groupFields[i]
    const columnContext = {
      existingKeys: allKeys,
      checkUniqueness,
    }
    const columnResult = validateGroupColumn(column, i, columnContext)
    if (!columnResult.isValid) {
      return columnResult
    }
    
    // Add key to existing keys for uniqueness check
    if (column.key) {
      allKeys.push(column.key)
    }
  }
  
  // Check for duplicate keys within group fields
  const keys = groupFields
    .filter(field => field.key)
    .map(field => field.key)
  const duplicateResult = validateNoDuplicates(keys)
  if (!duplicateResult.isValid) {
    return createResult(
      false,
      'Duplicate column keys detected',
      VALIDATION_SEVERITY.ERROR
    )
  }
  
  return createResult(true)
}

/**
 * Validates row limits (minRows and maxRows)
 * @param {number} minRows - Minimum number of rows
 * @param {number} maxRows - Maximum number of rows
 * @returns {Object} - Validation result
 */
export function validateRowLimits(minRows, maxRows) {
  // Validate minRows
  if (minRows !== undefined) {
    const minResult = validateNonNegative(minRows)
    if (!minResult.isValid) {
      return createResult(
        false,
        'Minimum rows cannot be negative',
        VALIDATION_SEVERITY.ERROR
      )
    }
    
    // Check against maximum limit
    if (minRows > FIELD_LIMITS.REPEATABLE_GROUP.MAX_ROWS) {
      return createResult(
        false,
        `Minimum rows cannot exceed ${FIELD_LIMITS.REPEATABLE_GROUP.MAX_ROWS}`,
        VALIDATION_SEVERITY.ERROR
      )
    }
  }
  
  // Validate maxRows
  if (maxRows !== undefined) {
    const maxResult = validateNonNegative(maxRows)
    if (!maxResult.isValid) {
      return createResult(
        false,
        'Maximum rows cannot be negative',
        VALIDATION_SEVERITY.ERROR
      )
    }
    
    // Check against maximum limit
    if (maxRows > FIELD_LIMITS.REPEATABLE_GROUP.MAX_ROWS) {
      return createResult(
        false,
        `Maximum rows cannot exceed ${FIELD_LIMITS.REPEATABLE_GROUP.MAX_ROWS}`,
        VALIDATION_SEVERITY.ERROR
      )
    }
  }
  
  // Validate that min <= max
  const rangeResult = validateMinLessThanMax(minRows, maxRows)
  if (!rangeResult.isValid) {
    return rangeResult
  }
  
  return createResult(true)
}

/**
 * Validates repeatable group field configuration
 * @param {Object} field - The field object to validate
 * @param {Array} existingKeys - Array of existing keys in the form
 * @returns {Object} - Validation result
 */
export function validateRepeatableGroupField(field, existingKeys = []) {
  // Validate group columns
  const columnsResult = validateGroupColumns(field.groupFields, {
    existingKeys,
    checkUniqueness: true,
  })
  if (!columnsResult.isValid) {
    return columnsResult
  }
  
  // Validate row limits
  const rowLimitsResult = validateRowLimits(field.minRows, field.maxRows)
  if (!rowLimitsResult.isValid) {
    return rowLimitsResult
  }
  
  return createResult(true)
}
