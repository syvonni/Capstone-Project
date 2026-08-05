/**
 * Filter fee items by search query
 */
export function filterItemsBySearch(items, query) {
  if (!query || query.trim() === '') return items
  const q = query.trim().toLowerCase()
  return items.filter((item) => {
    const name = (item.name || '').toLowerCase()
    const notes = (item.notes || '').toLowerCase()
    return name.includes(q) || notes.includes(q)
  })
}

/**
 * Filter fee items by status (active/disabled)
 */
export function filterItemsByStatus(items, statusFilter) {
  if (!statusFilter) return items
  return items.filter((item) => {
    if (statusFilter === 'active') return item.isActive
    if (statusFilter === 'disabled') return !item.isActive
    return true
  })
}

/**
 * Get add button label by fee type
 */
export function getAddButtonLabel(feeType) {
  const labels = {
    fees: 'Add Global Application Fee',
    conditional_fees: 'Add Conditional Fee',
    classification_fees: 'Classification fees are pre-populated',
    variable_fee_rules: 'Add Variable Fees',
    claimable_documents: 'Fees auto-created with documents',
    appeal_fees: 'Add Appeal Fee',
  }
  return labels[feeType] || 'Add'
}
