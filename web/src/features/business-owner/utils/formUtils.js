import { FilePdfOutlined, FileWordOutlined, FileExcelOutlined, FileOutlined } from '@ant-design/icons'

export function filterSectionsByFormValues(sections, formValues) {
  if (!sections || !formValues || typeof formValues !== 'object') return sections || []
  return sections.filter((section) => {
    const when = section.showWhen
    if (!when || !when.field) return true
    const fieldValue = formValues[when.field]
    if (when.value !== undefined) return fieldValue === when.value
    if (when.values && Array.isArray(when.values)) return when.values.includes(fieldValue)
    return true
  })
}

/**
 * Find the field marked as the business name in a form definition.
 * @param {object} formDefinition - Form definition with sections/items
 * @returns {object|null} The business name field, or null
 */
export function findBusinessNameField(formDefinition) {
  if (!formDefinition?.sections) return null
  const allFields = formDefinition.sections.flatMap(s => s.items || [])
  return allFields.find(f => f.isBusinessName) || null
}

/**
 * Extract a business name value from form data using the form definition.
 * Falls back to common hardcoded formData keys if no field is marked.
 * @param {object} formDefinition - Form definition with sections/items
 * @param {object} formData - Current form values
 * @returns {string|null} Business name value or null
 */
export function getBusinessNameFromFormDefinition(formDefinition, formData) {
  if (!formData || typeof formData !== 'object') return null

  const businessNameField = findBusinessNameField(formDefinition)
  if (businessNameField?.key) {
    const value = formData[businessNameField.key]
    if (value && typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  // Legacy fallback for forms without isBusinessName
  return formData.businessName ||
         formData.registeredBusinessName ||
         formData['Business / trade name'] ||
         formData.businessTradeName ||
         formData.activityName ||
         null
}

const FILE_ICON_MAP = {
  pdf: FilePdfOutlined,
  doc: FileWordOutlined,
  docx: FileWordOutlined,
  xls: FileExcelOutlined,
  xlsx: FileExcelOutlined,
}

export function getFileIcon(ext) {
  return FILE_ICON_MAP[ext?.toLowerCase()] || FileOutlined
}

export function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getFileUrlFromFormValue(value) {
  if (value == null) return ''
  if (typeof value === 'string' && value.trim() !== '') return value.trim()
  if (Array.isArray(value) && value.length > 0) {
    const first = value[0]
    if (first && typeof first === 'object') {
      const cid = first.cid || first.ipfsCid || first.response?.cid || first.response?.ipfsCid
      const url = first.url || first.response?.url
      if (url && typeof url === 'string') return url
      if (cid && typeof cid === 'string') return cid
    }
  }
  return ''
}

// Mapping between form field keys and legacy lguDocuments keys
export const DOCUMENT_KEY_MAPPING = {
  ownerGovernmentId: ['idPicture', 'ownerGovernmentId', 'ownerGovernmentIdIpfsCid'],
  ctcCedula: ['ctc', 'ctcCedula', 'ctcCedulaIpfsCid'],
  barangayClearance: ['barangayClearance', 'barangayClearanceIpfsCid'],
  dtiSecCdaCertificate: ['dtiSecCda', 'dtiSecCdaCertificate', 'dtiSecCdaCertificateIpfsCid'],
  leaseContractOrTitle: ['leaseOrLandTitle', 'leaseContractOrTitle', 'leaseContractOrTitleIpfsCid'],
  occupancyPermit: ['occupancyPermit', 'occupancyPermitIpfsCid'],
}

export function getPersistedDocumentUrl(documents, field, formData = {}) {
  const fieldKey = field?.key || field?.label
  
  // Helper to extract CID from various formats
  const extractCid = (value) => {
    if (!value) return ''
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (Array.isArray(value) && value.length > 0) {
      const first = value[0]
      const cid = first?.cid || first?.ipfsCid || first?.response?.cid || first?.response?.ipfsCid || first?.url
      if (cid && typeof cid === 'string') return cid
    }
    return ''
  }
  
  // Check documents object (lguDocuments or formData passed as documents)
  if (documents && typeof documents === 'object' && field) {
    // Build candidate keys including legacy mappings
    const baseKeys = [
      field.documentKey,
      field.key,
      field.label,
    ].filter(Boolean)
    
    // Add IpfsCid variants
    const ipfsCidKeys = baseKeys.map(k => `${k}IpfsCid`)
    
    // Add legacy key mappings
    const legacyKeys = []
    for (const baseKey of baseKeys) {
      const mappings = DOCUMENT_KEY_MAPPING[baseKey]
      if (mappings) {
        legacyKeys.push(...mappings)
      }
    }
    
    const candidates = [...baseKeys, ...ipfsCidKeys, ...legacyKeys]

    for (const key of candidates) {
      const value = documents[key]
      const cid = extractCid(value)
      if (cid) return cid
    }
  }
  
  // Also check formData for document values
  if (formData && typeof formData === 'object' && fieldKey) {
    const cid = extractCid(formData[fieldKey])
    if (cid) return cid
  }
  
  return ''
}

export function buildValidationRules(field) {
  const rules = []

  if (field.required) {
    // For file fields, use a custom validator
    if (field.type === 'file') {
      rules.push({
        validator: (_, value) => {
          // Check if file is uploaded (value should be an array with at least one file)
          if (!value || !Array.isArray(value) || value.length === 0) {
            return Promise.reject(new Error(`${field.label || 'This document'} is required`))
          }
          // Check if the file has a CID (was actually uploaded to IPFS)
          const hasUploadedFile = value.some(f => f?.cid || f?.ipfsCid || f?.url || f?.status === 'done')
          if (!hasUploadedFile) {
            return Promise.reject(new Error(`${field.label || 'This document'} must be uploaded`))
          }
          return Promise.resolve()
        }
      })
    } else {
      // Use custom validator instead of required: true to avoid Ant Design's automatic asterisk
      rules.push({
        validator: (_, value) => {
          if (value === undefined || value === null || value === '') {
            return Promise.reject(new Error(`${field.label || 'This field'} is required`))
          }
          return Promise.resolve()
        }
      })
    }
  }

  const validation = field.validation || {}

  if (validation.minLength) {
    rules.push({ min: validation.minLength, message: `Minimum ${validation.minLength} characters` })
  }
  if (validation.maxLength) {
    rules.push({ max: validation.maxLength, message: `Maximum ${validation.maxLength} characters` })
  }
  if (validation.pattern) {
    rules.push({ pattern: new RegExp(validation.pattern), message: 'Invalid format' })
  }

  return rules
}

export function detectFileType(url, fileName, acceptedFileTypes) {
  const lookup = `${url || ''} ${fileName || ''}`.toLowerCase()
  if (lookup.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg|heic|heif)/i)) return 'image'
  if (lookup.match(/\.(pdf)/i)) return 'pdf'
  // For IPFS URLs without extensions, check accepted file types from field config
  const acceptedTypes = (acceptedFileTypes || '').toLowerCase()
  if (acceptedTypes.includes('jpg') || acceptedTypes.includes('png') || acceptedTypes.includes('jpeg')) {
    // If field accepts images and URL is IPFS, assume image
    if (url && (url.includes('/ipfs/') || url.includes('Qm') || url.includes('bafy'))) return 'image'
  }
  return 'other'
}

/**
 * Utility functions for ApplicationForm
 */

export function calculateRevisionFieldKeys(fieldReviewDecisions) {
  if (!fieldReviewDecisions) return new Set()
  const normalized = new Set()

  // Lock fields that have been accepted by the officer. Only fields marked
  // 'request_changes' should remain editable when the applicant is revising.
  Object.entries(fieldReviewDecisions)
    .filter(([, decision]) => decision?.status === 'accepted')
    .forEach(([fieldKey]) => {
      if (!fieldKey || typeof fieldKey !== 'string') return

      // Preserve raw key as fallback
      normalized.add(fieldKey)

      // Legacy owner format: section_2_businessName -> businessName
      const legacy = fieldKey.match(/^section_\d+_(.+)$/i)
      if (legacy?.[1]) normalized.add(legacy[1])

      // Officer review format: "{sectionIdx}.{itemKey}" locks the field key.
      // Repeatable row keys like "{sectionIdx}.{groupKey}.{rowIdx}" are kept as-is
      // so per-row locking can be handled by the group renderer.
      const parts = fieldKey.split('.')
      if (parts.length === 2 && /^\d+$/.test(parts[0])) {
        normalized.add(parts[1])
      }

      // LOB virtual keys from officer panel
      if (fieldKey === 'lob_description') {
        normalized.add('businessDescriptionText')
      }
      if (/^lob_activity_\d+$/i.test(fieldKey)) {
        normalized.add('businessActivities')
      }
    })

  return normalized
}

export function buildFieldToSectionIndexMap(visibleSections) {
  const map = {}
  visibleSections.forEach((section, idx) => {
    ;(section.items || []).forEach((item) => {
      const name = item.key || item.label
      if (name) map[name] = idx
    })
  })
  return map
}
