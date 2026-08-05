/**
 * Validation Constants
 * 
 * Contains validation limits, error messages, and configuration
 * for the form content editor validation system.
 */

// Field limits
export const FIELD_LIMITS = {
  LABEL: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 200,
  },
  KEY: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
  },
  HELP_TEXT: {
    MAX_LENGTH: 500,
  },
  PLACEHOLDER: {
    MAX_LENGTH: 200,
  },
  VALIDATION_RULES: {
    MIN_NUMBER: 0,
    MAX_NUMBER: 999999,
  },
  DROPDOWN_OPTIONS: {
    MIN_COUNT: 1,
    MAX_COUNT: 50,
  },
  CATEGORY_OPTIONS: {
    MIN_COUNT: 1,
    MAX_COUNT: 20,
  },
  METADATA_FIELDS: {
    MIN_COUNT: 0,
    MAX_COUNT: 10,
  },
  REPEATABLE_GROUP: {
    MIN_COLUMNS: 1,
    MAX_COLUMNS: 10,
    MIN_ROWS: 0,
    MAX_ROWS: 100,
  },
  FILE_UPLOAD: {
    MAX_SIZE_MB: 10,
    MAX_SIZE_BYTES: 10 * 1024 * 1024,
  },
}

// Error messages
export const VALIDATION_ERRORS = {
  REQUIRED: 'This field is required',
  MIN_LENGTH: (min) => `Minimum length is ${min} characters`,
  MAX_LENGTH: (max) => `Maximum length is ${max} characters`,
  INVALID_PATTERN: 'Invalid format',
  INVALID_ENUM: 'Invalid value',
  INVALID_RANGE: (min, max) => `Value must be between ${min} and ${max}`,
  MIN_GREATER_THAN_MAX: 'Minimum value cannot be greater than maximum value',
  INVALID_REGEX: 'Invalid regular expression pattern',
  RESERVED_KEYWORD: 'This is a reserved keyword and cannot be used',
  KEY_COLLISION: 'This key already exists in the form',
  DUPLICATE_OPTION: 'Duplicate option detected',
  EMPTY_LABEL: 'Label cannot be empty',
  INVALID_FILE_TYPE: 'Invalid file type',
  FILE_TOO_LARGE: (max) => `File size cannot exceed ${max}MB`,
  TOO_MANY_OPTIONS: (max) => `Cannot have more than ${max} options`,
  TOO_MANY_FIELDS: (max) => `Cannot have more than ${max} fields`,
  INVALID_KEY_FORMAT: 'Key must start with a letter and contain only letters, numbers, and underscores',
  NUMERIC_KEY_WARNING: 'Numeric-only keys may cause issues with form handling',
}

// Warning messages
export const VALIDATION_WARNINGS = {
  KEY_COLLISION: 'This key may conflict with another field in the form',
  NUMERIC_KEY: 'Numeric-only keys are not recommended',
  LONG_LABEL: 'Label is very long and may affect display',
  MANY_OPTIONS: 'Having many options may affect performance',
}

// Validation severity levels
export const VALIDATION_SEVERITY = {
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
}

// Field types
export const FIELD_TYPES = {
  TEXT: 'text',
  TEXTAREA: 'textarea',
  NUMBER: 'number',
  DATE: 'date',
  DATE_RANGE: 'date_range',
  CHECKBOX: 'checkbox',
  SELECT: 'select',
  MULTISELECT: 'multiselect',
  FILE: 'file',
  CATEGORY_UPLOAD: 'category_upload',
  DOWNLOAD: 'download',
  ADDRESS: 'address',
  ADDRESS_ALAMINOS: 'address_alaminos',
  REPEATABLE_GROUP: 'repeatable_group',
}

// Metadata field types
export const METADATA_FIELD_TYPES = {
  TEXT: 'text',
  NUMBER: 'number',
  DATE: 'date',
  ADDRESS: 'address',
  ADDRESS_ALAMINOS: 'address_alaminos',
}

// File types for download/upload
export const ALLOWED_FILE_TYPES = {
  PDF: 'pdf',
  DOC: 'doc',
  DOCX: 'docx',
  XLS: 'xls',
  XLSX: 'xlsx',
  JPG: 'jpg',
  JPEG: 'jpeg',
  PNG: 'png',
}

// Field span options
export const FIELD_SPAN_OPTIONS = [24, 12, 8]

// Dropdown sources
export const DROPDOWN_SOURCES = {
  STATIC: 'static',
  DYNAMIC: 'dynamic',
}
