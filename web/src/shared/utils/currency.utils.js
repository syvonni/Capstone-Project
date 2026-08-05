/**
 * Currency formatting utilities for InputNumber components
 */

/**
 * Formats a numeric value as Philippine Peso with comma separators
 * @param {number|string} value - The value to format
 * @returns {string} Formatted currency string (e.g., "₱1,500,000")
 */
export const currencyFormatter = (value) => {
  if (value === '' || value === null || value === undefined) {
    return ''
  }
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(numValue)) {
    return ''
  }
  return `₱${numValue.toLocaleString()}`
}

/**
 * Parses a formatted currency string back to a numeric value
 * @param {string} value - The formatted currency string (e.g., "₱1,500,000")
 * @returns {string} Parsed numeric string (e.g., "1500000")
 */
export const currencyParser = (value) => {
  if (!value) {
    return ''
  }
  // Remove ₱ symbol and commas
  return value.replace(/₱/g, '').replace(/,/g, '')
}
