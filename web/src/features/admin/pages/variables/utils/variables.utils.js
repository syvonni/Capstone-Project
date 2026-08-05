export function filterItemsBySearch(items, searchTerm) {
  if (!searchTerm) return items
  const lowerSearch = searchTerm.toLowerCase()
  return items.filter((item) => {
    return (
      item.name?.toLowerCase().includes(lowerSearch) ||
      item.description?.toLowerCase().includes(lowerSearch) ||
      item.customId?.toLowerCase().includes(lowerSearch)
    )
  })
}

export function filterItemsByStatus(items, statusFilter) {
  if (!statusFilter) return items
  return items.filter((item) => {
    if (statusFilter === 'active') return item.isActive === true
    if (statusFilter === 'disabled') return item.isActive === false
    return true
  })
}
