/**
 * THERE WILL BE NO DIRECT HTTP CALLS! USE SERVICES!
 */

/**
 * Filter post-requirement items by search query
 */
export function filterItemsBySearch(items, query) {
  if (!query || query.trim() === '') return items
  const q = query.trim().toLowerCase()
  return items.filter((item) => {
    const code = (item.code || '').toLowerCase()
    const name = (item.name || '').toLowerCase()
    const description = (item.description || '').toLowerCase()
    return code.includes(q) || name.includes(q) || description.includes(q)
  })
}

/**
 * Filter post-requirement items by status
 */
export function filterItemsByStatus(items, statusFilter) {
  if (!statusFilter) return items
  return items.filter((item) => {
    if (statusFilter === 'active') return item.isActive === true
    if (statusFilter === 'disabled') return item.isActive === false
    return true
  })
}
