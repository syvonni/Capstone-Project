/**
 * File Upload Validator
 * 
 * Validates file upload configurations in the form content editor.
 * Ensures file upload fields are properly configured with valid file types and size limits.
 */

import { FIELD_LIMITS, ALLOWED_FILE_TYPES, VALIDATION_SEVERITY } from '../constants/validationConstants'
import {
  validateFileType,
  validateFileSize,
  createResult,
} from './commonValidators'

/**
 * Validation context for file upload validation
 * @typedef {Object} FileUploadValidationContext
 * @property {string} fieldType - The type of field (file, category_upload, download)
 */

/**
 * Validates file type configuration
 * @param {string} fileTypes - Comma-separated list of file types
 * @returns {Object} - Validation result
 */
export function validateFileTypesConfig(fileTypes) {
  if (!fileTypes) {
    return createResult(true) // No file types specified is valid
  }
  
  const types = fileTypes.split(',').map(t => t.trim().toLowerCase().replace('.', ''))
  const allowedTypes = Object.values(ALLOWED_FILE_TYPES)
  
  for (const type of types) {
    if (!allowedTypes.includes(type)) {
      return createResult(
        false,
        `Invalid file type: ${type}. Valid types are: ${allowedTypes.join(', ')}`,
        VALIDATION_SEVERITY.ERROR
      )
    }
  }
  
  return createResult(true)
}

/**
 * Validates file size configuration
 * @param {number} maxSize - Maximum file size in MB
 * @returns {Object} - Validation result
 */
export function validateMaxFileSizeConfig(maxSize) {
  if (!maxSize) {
    return createResult(true) // No size limit is valid
  }
  
  const maxSizeBytes = maxSize * 1024 * 1024
  const maxSizeMB = FIELD_LIMITS.FILE_UPLOAD.MAX_SIZE_MB
  
  return validateFileSize(maxSizeBytes, FIELD_LIMITS.FILE_UPLOAD.MAX_SIZE_BYTES, maxSizeMB)
}

/**
 * Validates download file configuration
 * @param {Object} field - The field object to validate
 * @returns {Object} - Validation result
 */
export function validateDownloadField(field) {
  // Check if download file is present
  if (!field.downloadFileName) {
    return createResult(
      false,
      'Download file is required',
      VALIDATION_SEVERITY.ERROR
    )
  }
  
  // Validate file type
  if (field.downloadFileType) {
    const fileTypeResult = validateFileType(
      field.downloadFileType,
      Object.values(ALLOWED_FILE_TYPES)
    )
    if (!fileTypeResult.isValid) {
      return fileTypeResult
    }
  }
  
  // Validate file size
  if (field.downloadFileSize) {
    const fileSizeResult = validateFileSize(
      field.downloadFileSize,
      FIELD_LIMITS.FILE_UPLOAD.MAX_SIZE_BYTES,
      FIELD_LIMITS.FILE_UPLOAD.MAX_SIZE_MB
    )
    if (!fileSizeResult.isValid) {
      return fileSizeResult
    }
  }
  
  return createResult(true)
}

/**
 * Validates file upload field configuration
 * @param {Object} field - The field object to validate
 * @returns {Object} - Validation result
 */
export function validateFileUploadField(field) {
  // Validate file types if specified
  if (field.validation?.acceptedFileTypes) {
    const fileTypesResult = validateFileTypesConfig(field.validation.acceptedFileTypes)
    if (!fileTypesResult.isValid) {
      return fileTypesResult
    }
  }
  
  // Validate max file size if specified
  if (field.validation?.maxFileSize) {
    const fileSizeResult = validateMaxFileSizeConfig(field.validation.maxFileSize)
    if (!fileSizeResult.isValid) {
      return fileSizeResult
    }
  }
  
  return createResult(true)
}

/**
 * Validates category upload field configuration
 * @param {Object} field - The field object to validate
 * @returns {Object} - Validation result
 */
export function validateCategoryUploadField(field) {
  // Validate file upload settings
  const fileUploadResult = validateFileUploadField(field)
  if (!fileUploadResult.isValid) {
    return fileUploadResult
  }
  
  // Validate dropdown options
  if (!field.dropdownOptions || field.dropdownOptions.length === 0) {
    return createResult(
      false,
      'At least one category option is required',
      VALIDATION_SEVERITY.ERROR
    )
  }
  
  return createResult(true)
}
