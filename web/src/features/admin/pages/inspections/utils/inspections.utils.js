/**
 * THERE WILL BE NO DIRECT HTTP CALLS! USE SERVICES!
 */

export const filterItemsBySearch = (items, searchTerm) => {
  if (!searchTerm) return items
  const lowerSearch = searchTerm.toLowerCase()
  return items.filter(item =>
    item.name?.toLowerCase().includes(lowerSearch) ||
    item.description?.toLowerCase().includes(lowerSearch)
  )
}

export const filterItemsByStatus = (items, statusFilter) => {
  if (statusFilter === null || statusFilter === undefined) return items
  return items.filter(item => item.isActive === statusFilter)
}
