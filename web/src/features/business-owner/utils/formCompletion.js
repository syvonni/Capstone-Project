/**
 * Shared field completion helpers used by both section navigation and the
 * overview infocard "Form Progress" link.
 */

export function hasValue(val) {
  if (val === undefined || val === null) return false
  if (typeof val === 'string') return val.trim() !== ''
  if (typeof val === 'boolean') return true
  if (typeof val === 'number') return true
  if (val instanceof Date) return !isNaN(val.getTime())
  if (Array.isArray(val)) {
    if (val.length === 0) return false
    return val.some(item => hasValue(item))
  }
  if (typeof val === 'object') {
    if (typeof val.isValid === 'function') return !!val.isValid()
    const values = Object.values(val)
    return values.some(v => hasValue(v))
  }
  return false
}

export function getDateRangeValue(formValues, fieldKey) {
  if (!formValues || typeof formValues !== 'object') return null

  const start = formValues[`${fieldKey}_start`]
  const end = formValues[`${fieldKey}_end`]
  if (start !== undefined || end !== undefined) {
    return { start, end }
  }

  const legacy = formValues[fieldKey]
  if (legacy == null) return null

  if (Array.isArray(legacy) && legacy.length >= 2) {
    return { start: legacy[0], end: legacy[1] }
  }

  if (typeof legacy === 'object' && !Array.isArray(legacy)) {
    const startVal = legacy.startDate || legacy.start || legacy.start_date
    const endVal = legacy.endDate || legacy.end || legacy.end_date
    if (startVal !== undefined || endVal !== undefined) {
      return { start: startVal, end: endVal }
    }
  }

  return null
}

export function isDateRangeComplete(formValues, fieldKey) {
  const range = getDateRangeValue(formValues, fieldKey)
  if (!range) return false
  return hasValue(range.start) && hasValue(range.end)
}

export function getActiveMetadataFields(field, fieldKey, formValues) {
  if (field.type !== 'category_upload') {
    return field.metadataFields || []
  }

  const categoryValue = formValues[`${fieldKey}_category`]
  if (!hasValue(categoryValue)) return []

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

  if (field.type === 'date_range') {
    return isDateRangeComplete(formValues, fieldKey)
  }

  const val = formValues[fieldKey]
  return hasValue(val)
}

export function isFieldComplete(field, fieldKey, formValues) {
  const hasFieldValue = hasMainFieldValue(field, fieldKey, formValues)
  if (!hasFieldValue) return false
  return checkMetadataFields(field, fieldKey, formValues)
}
