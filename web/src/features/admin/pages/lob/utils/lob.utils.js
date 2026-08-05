/**
 * THERE WILL BE NO DIRECT HTTP CALLS! USE SERVICES!
 */

/**
 * Filter LOB items by search query
 */
export function filterItemsBySearch(items, query) {
  if (!query || query.trim() === '') return items
  const q = query.trim().toLowerCase()
  return items.filter((item) => {
    const code = (item.code || '').toLowerCase()
    const name = (item.name || '').toLowerCase()
    const description = (item.description || '').toLowerCase()
    const category = (item.category || '').toLowerCase()
    return code.includes(q) || name.includes(q) || description.includes(q) || category.includes(q)
  })
}

/**
 * Filter LOB items by category
 */
export function filterItemsByCategory(items, categoryFilter) {
  if (!categoryFilter) return items
  return items.filter((item) => item.category === categoryFilter)
}

/**
 * Get add button label
 */
export function getAddButtonLabel() {
  return 'Add Line of Business'
}
