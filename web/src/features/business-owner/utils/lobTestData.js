import { getLobByName } from '@/shared/utils/lobApiUtils'

const APARTMENT_LOB_NAME = 'Apartment / condominium rental'
const TEST_CAPITAL = 500000

/**
 * Generate a sensible test value for a single variable.
 * The value depends on the variable's calculationMethod and unit.
 *
 * @param {Object} variable - Variable object from allVariables or lob.variables
 * @returns {string|number|boolean} Test value
 */
export function generateTestValueForVariable(variable) {
  const method = (variable?.calculationMethod || '').toLowerCase()
  const unit = (variable?.unit || '').toLowerCase()
  const unitSingular = (variable?.unitSingular || '').toLowerCase()

  switch (method) {
    case 'classification':
      if (variable.classifications?.length > 0) {
        return variable.classifications[0].name
      }
      return ''

    case 'yes_no':
      return true

    case 'percentage':
      return 0.05

    case 'per_unit':
      if (unit.includes('unit') || unitSingular.includes('unit')) {
        return 5
      }
      if (unit.includes('bed') || unitSingular.includes('bed')) {
        return 10
      }
      if (unit.includes('person') || unitSingular.includes('person')) {
        return 10
      }
      return 5

    case 'bracketed':
      if (unit.includes('sqm') || unitSingular.includes('sqm') || unit.includes('square')) {
        return 50
      }
      if (unit.includes('unit') || unitSingular.includes('unit')) {
        return 5
      }
      if (unit.includes('meter') || unitSingular.includes('meter')) {
        return 100
      }
      return 10

    case 'custom':
      return 1

    default:
      // Generic numeric fallback
      if (unit.includes('sqm') || unitSingular.includes('sqm')) return 50
      if (unit.includes('unit') || unitSingular.includes('unit')) return 5
      return 10
  }
}

/**
 * Resolve variables for a lob, falling back to allVariables if the lob only has ids.
 *
 * @param {Object} lob - LOB object
 * @param {Array} allVariables - Full list of variables from the API
 * @returns {Array} Resolved variable objects
 */
export function resolveLobVariables(lob, allVariables) {
  if (!lob?.variables || !Array.isArray(lob.variables)) return []

  return lob.variables
    .map((v) => {
      if (v && typeof v === 'object' && v.question !== undefined) return v
      const id = typeof v === 'object' ? v._id : v
      return allVariables.find((av) => av._id === id)
    })
    .filter(Boolean)
}

/**
 * Find the best test LOB.
 * Prefer "Apartment / condominium rental" if it exists and has variables.
 * Otherwise, fall back to the first LOB (in the first industry) that has variables.
 *
 * @param {Array} lobs - Array of LOB objects
 * @param {Array} allVariables - Full list of variables from the API
 * @returns {Object|null} Test LOB or null
 */
export function findTestLob(lobs, allVariables) {
  if (!Array.isArray(lobs) || lobs.length === 0) return null

  const withVariables = lobs.filter((lob) => resolveLobVariables(lob, allVariables).length > 0)
  if (withVariables.length === 0) return null

  const apartmentLob = getLobByName(lobs, APARTMENT_LOB_NAME)
  if (apartmentLob) {
    const vars = resolveLobVariables(apartmentLob, allVariables)
    if (vars.length > 0) return apartmentLob
  }

  return withVariables[0]
}

/**
 * Generate test variable inputs for a LOB.
 *
 * @param {Object} lob - LOB object
 * @param {Array} allVariables - Full list of variables from the API
 * @returns {Object} Map of variable _id -> test value
 */
export function generateTestVariableInputs(lob, allVariables) {
  const variables = resolveLobVariables(lob, allVariables)
  const inputs = {}

  variables.forEach((variable) => {
    inputs[variable._id] = generateTestValueForVariable(variable)
  })

  return inputs
}

/**
 * Build a single businessActivities entry from a selected LOB and test inputs.
 *
 * @param {Object} lob - LOB object
 * @param {Array} allVariables - Full list of variables from the API
 * @param {Object} options
 * @param {number} options.capital - Capital investment (default 500000)
 * @param {number} options.grossSales - Gross sales (default 0)
 * @returns {Object} businessActivities entry
 */
export function buildTestBusinessActivity(lob, allVariables, { capital = TEST_CAPITAL, grossSales = 0 } = {}) {
  if (!lob) return null

  const taxCode = lob.code ? lob.code.split('-')[0] : lob.category?.substring(0, 3).toUpperCase()
  const categoryName = lob.category
    ? lob.category.charAt(0).toUpperCase() + lob.category.slice(1).replace(/_/g, ' ')
    : ''
  const lineOfBusiness = lob.lineOfBusiness || lob.category || ''
  const detailedLine = lob.name || ''

  return {
    taxCode,
    lineOfBusiness,
    category: categoryName,
    detailedLine,
    detailedLineOfBusiness: detailedLine,
    psicCode: lob.psicCode || '',
    capital,
    grossSales,
    variableInputs: generateTestVariableInputs(lob, allVariables),
  }
}

/**
 * Generate a full test LOB selection for the test-data button.
 *
 * @param {Array} lobs - Array of LOB objects
 * @param {Array} allVariables - Full list of variables from the API
 * @param {Object} options
 * @returns {Object|null} businessActivities entry or null
 */
export function generateTestBusinessActivity(lobs, allVariables, options = {}) {
  const lob = findTestLob(lobs, allVariables)
  if (!lob) return null
  return buildTestBusinessActivity(lob, allVariables, options)
}

/**
 * Convert a businessActivities array into the UI state used by LOBSection.
 *
 * @param {Array} businessActivities
 * @returns {Object} UI state maps
 */
export function businessActivitiesToUiState(businessActivities) {
  const selectedIndustryTaxCodes = []
  const industryDetailedLines = {}
  const lobAllocatedCapital = {}
  const savedVariableInputs = {}

  ;(businessActivities || []).forEach((activity) => {
    const taxCode = activity.taxCode
    const detailedLine = activity.detailedLine || activity.detailedLineOfBusiness || activity.lineOfBusiness

    if (!taxCode || !detailedLine) return

    if (!selectedIndustryTaxCodes.includes(taxCode)) {
      selectedIndustryTaxCodes.push(taxCode)
    }

    if (!industryDetailedLines[taxCode]) {
      industryDetailedLines[taxCode] = []
    }
    if (!industryDetailedLines[taxCode].includes(detailedLine)) {
      industryDetailedLines[taxCode].push(detailedLine)
    }

    const capitalKey = `${taxCode}-${detailedLine}`
    lobAllocatedCapital[capitalKey] = activity.capital || TEST_CAPITAL

    if (activity.variableInputs && typeof activity.variableInputs === 'object') {
      savedVariableInputs[capitalKey] = { ...activity.variableInputs }
    }
  })

  return {
    selectedIndustryTaxCodes,
    industryDetailedLines,
    lobAllocatedCapital,
    savedVariableInputs,
  }
}

/**
 * Convert LOBSection UI state maps into a businessActivities array.
 * This needs the lobs array to resolve lineOfBusiness and category names.
 *
 * @param {Array} lobs - Array of LOB objects
 * @param {Object} uiState
 * @returns {Array} businessActivities array
 */
export function uiStateToBusinessActivities(lobs, uiState) {
  const {
    selectedIndustryTaxCodes = [],
    industryDetailedLines = {},
    lobAllocatedCapital = {},
    savedVariableInputs = {},
  } = uiState

  const businessActivities = []

  selectedIndustryTaxCodes.forEach((taxCode) => {
    const lines = industryDetailedLines[taxCode] || []
    lines.forEach((detailedLine) => {
      const lob = lobs.find((l) => {
        const lobTaxCode = l.code ? l.code.split('-')[0] : l.category?.substring(0, 3).toUpperCase()
        return lobTaxCode === taxCode && l.name === detailedLine
      })

      const categoryName = lob?.category
        ? lob.category.charAt(0).toUpperCase() + lob.category.slice(1).replace(/_/g, ' ')
        : ''
      const lineOfBusiness = lob?.lineOfBusiness || lob?.category || ''
      const capitalKey = `${taxCode}-${detailedLine}`

      businessActivities.push({
        taxCode,
        lineOfBusiness,
        category: categoryName,
        detailedLine,
        detailedLineOfBusiness: detailedLine,
        psicCode: lob?.psicCode || '',
        capital: lobAllocatedCapital[capitalKey] || TEST_CAPITAL,
        grossSales: 0,
        variableInputs: savedVariableInputs[capitalKey] || {},
      })
    })
  })

  return businessActivities
}
