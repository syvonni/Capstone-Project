/**
 * Shared field completion helpers used by both section navigation and the
 * overview infocard "Form Progress" link.
 */

export function hasValue(val) {
  if (val === undefined || val === null) return false
  if (typeof val === 'string') return val.trim() !== ''
  if (typeof val === 'boolean') return true
  if (typeof val === 'number') return true
  if (Array.isArray(val)) {
    if (val.length === 0) return false
    return val.some(item => {
      if (item === undefined || item === null) return false
      if (typeof item === 'string') return item.trim() !== ''
      if (typeof item === 'boolean') return true
      if (typeof item === 'number') return true
      if (typeof item === 'object' && item !== null) {
        if (item.cid || item.url || item.ipfsCid) return true
        const objValues = Object.values(item)
        if (objValues.length === 0) return false
        return objValues.some(v =>
          v !== undefined && v !== null && v !== '' &&
          !(typeof v === 'string' && v.trim() === '')
        )
      }
      return false
    })
  }
  if (typeof val === 'object') {
    if (typeof val.isValid === 'function' && !val.isValid()) return false
    const values = Object.values(val)
    if (values.length === 0) return false
    return values.some(v => {
      if (v === undefined || v === null) return false
      if (typeof v === 'string') return v.trim() !== ''
      if (typeof v === 'boolean') return true
      if (typeof v === 'number') return true
      if (Array.isArray(v)) return v.length > 0 && hasValue(v)
      if (typeof v === 'object' && v !== null) {
        if (typeof v.isValid === 'function' && !v.isValid()) return false
        return Object.values(v).some(nested =>
          nested !== undefined && nested !== null && nested !== '' &&
          !(typeof nested === 'string' && nested.trim() === '')
        )
      }
      return false
    })
  }
  return false
}

export function getActiveMetadataFields(field, fieldKey, formValues) {
  if (field.type !== 'category_upload') {
    return field.metadataFields || []
  }

  const categoryValue = formValues[`${fieldKey}_category`]
  if (!categoryValue) return []

  const options = field.dropdownOptions || []
  const selectedOption = options.find(o =>
    (o.id && o.id === categoryValue) ||
    (o.label && o.label === categoryValue) ||
    o === categoryValue
  )

  return (selectedOption && selectedOption.metadataFields) ||
         field.metadataFields ||
         []
}

export function checkMetadataFields(field, fieldKey, formValues) {
  const metadataFields = getActiveMetadataFields(field, fieldKey, formValues)
  if (!metadataFields || metadataFields.length === 0) return true

  const metadataKey = `${fieldKey}_metadata`
  const metadataValue = formValues[metadataKey]

  if (!metadataValue || typeof metadataValue !== 'object') {
    const hasRequiredMetadata = metadataFields.some(mf => mf.required)
    return !hasRequiredMetadata
  }

  const requiredMetadata = metadataFields.filter(mf => mf.required)
  if (requiredMetadata.length === 0) return true

  return requiredMetadata.every(mf => {
    const metaKey = mf.key || mf.label
    const metaValue = metadataValue[metaKey]
    return hasValue(metaValue)
  })
}

export function hasMainFieldValue(field, fieldKey, formValues) {
  if (field.type === 'category_upload') {
    const categoryValue = formValues[`${fieldKey}_category`]
    if (!hasValue(categoryValue)) return false
  }

  const val = formValues[fieldKey]
  return hasValue(val)
}

export function isFieldComplete(field, fieldKey, formValues) {
  const hasFieldValue = hasMainFieldValue(field, fieldKey, formValues)
  if (!hasFieldValue) return false
  return checkMetadataFields(field, fieldKey, formValues)
}
