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
