export function filterItemsBySearch(items, searchTerm) {
  if (!searchTerm || !searchTerm.trim()) return items
  const q = searchTerm.trim().toLowerCase()
  return items.filter((item) => {
    const searchableFields = Object.keys(item)
    return searchableFields.some((key) => {
      const value = item[key]
      return value && String(value).toLowerCase().includes(q)
    })
  })
}

export function filterItemsByStatus(items, statusFilter) {
  if (!statusFilter) return items
  const isActive = statusFilter === 'active'
  return items.filter((item) => item.isActive === isActive)
}

export function getAddButtonLabel(selectedType) {
  return selectedType === 'documents' ? 'Add Document' : 'Add Document Group'
}
