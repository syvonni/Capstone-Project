/**
 * Utility functions for LOB-related calculations and logic
 */

/**
 * Get variables for a specific LOB
 * @param {Array} lobs - Array of LOB objects from API
 * @param {string} lobName - Name of the LOB to get variables for
 * @param {Array} allVariables - All variables from API
 * @returns {Array} - Variables for the specific LOB
 */
export function getVariablesForLOB(lobs, lobName, allVariables = []) {
  const lob = lobs.find(l => l.name === lobName)
  if (!lob || !lob.variables) return []
  return lob.variables
    .map(v => {
      // The public LOB endpoint populates variables, so they are full objects.
      if (v && typeof v === 'object' && v.question !== undefined) return v
      // Fallback: if only an ID is present, resolve it from allVariables.
      const id = typeof v === 'object' ? v._id : v
      return allVariables.find(av => av._id === id)
    })
    .filter(Boolean)
}
