/**
 * Utility functions for working with LOB data from the API
 */

/**
 * Extract unique categories from LOB list
 * @param {Array} lobs - Array of LOB objects from API
 * @returns {Array} - Array of unique category strings
 */
export function getUniqueCategories(lobs) {
  if (!Array.isArray(lobs)) return []
  const categories = new Set()
  lobs.forEach(lob => {
    if (lob.category) categories.add(lob.category)
  })
  return Array.from(categories).sort()
}

/**
 * Derive CATEGORY_OPTIONS from API data
 * @param {Array} lobs - Array of LOB objects from API
 * @returns {Array} - Array of { value, label } objects for Select dropdown
 */
export function getCategoryOptions(lobs) {
  const categories = getUniqueCategories(lobs)
  return categories.map(category => ({
    value: category,
    label: category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')
  }))
}

/**
 * Filter LOBs by category
 * @param {Array} lobs - Array of LOB objects from API
 * @param {String} category - Category to filter by
 * @returns {Array} - Filtered LOB objects
 */
export function getLobsByCategory(lobs, category) {
  if (!Array.isArray(lobs) || !category) return []
  return lobs.filter(lob => lob.category === category)
}

/**
 * Get detailed lines (LOB names and descriptions) for a category
 * @param {Array} lobs - Array of LOB objects from API
 * @param {String} category - Category to get lines for
 * @returns {Array} - Array of { value, label, description } objects
 */
export function getDetailedLinesForCategory(lobs, category) {
  const categoryLobs = getLobsByCategory(lobs, category)
  return categoryLobs.map(lob => ({
    value: lob.name,
    label: lob.name,
    description: lob.description,
    lineOfBusiness: lob.lineOfBusiness,
  }))
}

/**
 * Find specific LOB by name
 * @param {Array} lobs - Array of LOB objects from API
 * @param {String} name - LOB name to search for
 * @returns {Object|null} - LOB object or null if not found
 */
export function getLobByName(lobs, name) {
  if (!Array.isArray(lobs) || !name) return null
  return lobs.find(lob => lob.name === name) || null
}

/**
 * Get tax code options from LOB data
 * @param {Array} lobs - Array of LOB objects from API
 * @returns {Array} - Array of { value, label } objects for tax code dropdown
 */
export function getTaxCodeOptions(lobs) {
  if (!Array.isArray(lobs)) return []
  const taxCodeMap = new Map()
  
  lobs.forEach(lob => {
    if (lob.category && !taxCodeMap.has(lob.category)) {
      // Extract tax code from LOB code (e.g., RET-001 -> RET)
      const taxCode = lob.code ? lob.code.split('-')[0] : lob.category.toUpperCase().substring(0, 3)
      taxCodeMap.set(lob.category, {
        value: taxCode,
        label: `${taxCode} — ${lob.category.charAt(0).toUpperCase() + lob.category.slice(1).replace('_', ' ')}`
      })
    }
  })
  
  return Array.from(taxCodeMap.values())
}

/**
 * Map tax code to category
 * @param {Array} lobs - Array of LOB objects from API
 * @param {String} taxCode - Tax code to map
 * @returns {String|null} - Category or null if not found
 */
export function mapTaxCodeToCategory(lobs, taxCode) {
  if (!Array.isArray(lobs) || !taxCode) return null
  const lob = lobs.find(lob => lob.code && lob.code.startsWith(taxCode))
  return lob ? lob.category : null
}
