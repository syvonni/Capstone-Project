/**
 * Build a stable field key for field-level review decisions.
 * - Normal item: sectionIdx + '.' + (item.key || item.label)
 * - Repeatable group row: sectionIdx + '.' + itemKey + '.' + rowIndex
 * - LOB: use 'lob_description' for description; 'lob_activity_0', 'lob_activity_1', ... for each activity
 *
 * @param {number} sectionIdx - Section index
 * @param {object} item - Form definition item
 * @param {number} [rowIndex] - For repeatable_group, row index
 * @returns {string} Field key
 */
export function getFieldKey(sectionIdx, item, rowIndex = undefined) {
  const itemKey = item.key || item.label || 'field'
  if (item.type === 'repeatable_group' && rowIndex !== undefined) {
    return `${sectionIdx}.${itemKey}.${rowIndex}`
  }
  return `${sectionIdx}.${itemKey}`
}

/**
 * LOB field keys (used when section is the LOB section)
 */
export const LOB_FIELD_DESCRIPTION = 'businessDescriptionText'
export function getLobActivityFieldKey(index) {
  return `businessActivities.${index}`
}

/**
 * Build list of all reviewable field keys from form definition sections and form data.
 * Used to enforce "all fields reviewed" before submit and for progress.
 * Skips download-type items; for repeatable_group uses row count from formData; for LOB section uses lob_description + lob_activity_0, ...
 *
 * @param {Array<{ items: Array }>} sections - Form definition sections (after filterSectionsByFormValues)
 * @param {object} formData - Current form data (for repeatable row counts and businessActivities length)
 * @returns {{ keys: string[], lobSectionIndex: number | null }} All field keys and LOB section index if any
 */
export function getReviewableFieldKeys(sections, formData) {
  const keys = []
  let lobSectionIndex = null

  ;(sections || []).forEach((section, sectionIdx) => {
    if (section?.type === 'lob_section') {
      lobSectionIndex = sectionIdx
      // LOB section uses the new businessActivities array; each line is reviewable
      const activities = Array.isArray(formData?.businessActivities) ? formData.businessActivities : []
      activities.forEach((_, i) => keys.push(getLobActivityFieldKey(i)))
      return
    }

    const items = section?.items || []
    items.forEach((item) => {
      if (item.type === 'download') return
      const itemKey = item.key || item.label
      if (!itemKey) return
      if (item.type === 'repeatable_group') {
        const value = formData?.[itemKey]
        const rows = Array.isArray(value) ? value : []
        rows.forEach((_, rowIndex) => keys.push(getFieldKey(sectionIdx, item, rowIndex)))
      } else {
        keys.push(getFieldKey(sectionIdx, item))
      }
    })
  })

  return { keys, lobSectionIndex }
}

function findFieldDef(items, key) {
  if (!Array.isArray(items) || !key) return null
  return items.find(
    (item) =>
      item?.key === key || item?.name === key || item?.label === key,
  )
}

function getLobSectionName(sections) {
  const lobSection = (sections || []).find((s) => s?.type === 'lob_section')
  return (
    lobSection?.sectionName ||
    lobSection?.label ||
    lobSection?.title ||
    lobSection?.category ||
    'Lines of Business'
  )
}

function getLineName(activity) {
  return (
    activity?.detailedLine ||
    activity?.detailedLineOfBusiness ||
    activity?.lineOfBusiness ||
    null
  )
}

function getRowLabel(rowData, item) {
  if (!rowData) return null
  if (item?.lineNameField) {
    return rowData[item.lineNameField] || null
  }
  return (
    rowData.name ||
    rowData.label ||
    rowData.lineOfBusiness ||
    rowData.detailedLine ||
    rowData.detailedLineOfBusiness ||
    null
  )
}

/**
 * Build a human-readable "Section - Field" label from a field review key.
 * Handles normal fields, repeatable group rows, and LOB fields.
 *
 * @param {string} fieldKey - Field review key (e.g. "0.businessName", "1.owners.0", "businessActivities.0")
 * @param {Array} sections - Form definition sections
 * @param {object} [formData] - Current/saved form data, used for LOB and repeatable row labels
 * @returns {string} Display name like "Lines of Business - Line 1: Retail"
 */
export function getFieldDisplayName(fieldKey, sections, formData = {}) {
  if (!fieldKey) return ''

  const parts = fieldKey.split('.')
  const [first] = parts

  // LOB activity: businessActivities.{index}
  if (first === 'businessActivities' && parts.length === 2) {
    const index = parseInt(parts[1], 10)
    const activities = Array.isArray(formData?.businessActivities)
      ? formData.businessActivities
      : []
    const activity = activities[index]
    const lineName = getLineName(activity)
    const sectionName = getLobSectionName(sections)
    const fieldName = lineName
      ? `Line ${index + 1}: ${lineName}`
      : `Line of Business ${index + 1}`
    return `${sectionName} - ${fieldName}`
  }

  // LOB description
  if (fieldKey === LOB_FIELD_DESCRIPTION) {
    const lobSection = (sections || []).find((s) => s?.type === 'lob_section')
    const sectionName = getLobSectionName(sections)
    const item = findFieldDef(lobSection?.items, LOB_FIELD_DESCRIPTION)
    const fieldName = item?.label || 'Business Description'
    return `${sectionName} - ${fieldName}`
  }

  const sectionIdx = parseInt(first, 10)

  // Standard section index key
  if (!Number.isNaN(sectionIdx) && sectionIdx >= 0) {
    const section = (sections || [])[sectionIdx]
    const sectionName =
      section?.sectionName ||
      section?.label ||
      section?.title ||
      section?.category ||
      `Section ${sectionIdx + 1}`
    const rest = parts.slice(1)

    if (rest.length === 0) return sectionName

    if (rest.length === 1) {
      const fieldKeyPart = rest[0]
      const item = findFieldDef(section?.items, fieldKeyPart)
      const fieldName = item?.label || item?.name || fieldKeyPart
      return `${sectionName} - ${fieldName}`
    }

    // Repeatable group: sectionIdx.itemKey.rowIndex[.subField]
    const [itemKey, rowIndex, ...subParts] = rest
    const item = findFieldDef(section?.items, itemKey)
    const baseName = item?.label || item?.name || itemKey
    const rowNum = parseInt(rowIndex, 10)
    const rowNumber = Number.isNaN(rowNum) ? '' : rowNum + 1
    const rows = item ? formData?.[itemKey] || [] : []
    const rowData = Array.isArray(rows) ? rows[rowNum] : null
    const rowLabel = getRowLabel(rowData, item)

    if (subParts.length > 0) {
      const subFieldKey = subParts.join('.')
      const subItem = findFieldDef(
        item?.items || item?.fields,
        subFieldKey,
      )
      const subFieldName =
        subItem?.label || subItem?.name || subFieldKey
      return `${sectionName} - ${baseName} ${rowNumber} - ${subFieldName}`
    }

    const fieldName = rowLabel
      ? `${baseName} ${rowNumber} (${rowLabel})`
      : `${baseName} ${rowNumber}`
    return `${sectionName} - ${fieldName}`
  }

  // Fallback: search all sections for a matching key/label/name
  for (const section of sections || []) {
    const item = findFieldDef(section?.items, fieldKey)
    if (item) {
      const sectionName =
        section?.sectionName ||
        section?.label ||
        section?.title ||
        section?.category ||
        'Other'
      const fieldName = item?.label || item?.name || fieldKey
      return `${sectionName} - ${fieldName}`
    }
  }

  return fieldKey
}
