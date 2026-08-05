/**
 * Validation helper functions for Variables
 */

/**
 * Validates bracket ranges
 * @param {Array} brackets - Array of bracket objects
 * @returns {Object} { valid: boolean, error: string }
 */
function validateBrackets(brackets) {
  if (!brackets || brackets.length === 0) {
    return { valid: true };
  }

  // Check each bracket has minValue < maxValue
  for (let i = 0; i < brackets.length; i++) {
    const bracket = brackets[i];
    if (bracket.minValue === undefined || bracket.minValue === null) {
      return { valid: false, error: `Bracket at index ${i} is missing minValue` };
    }
    if (bracket.minValue < 0) {
      return { valid: false, error: `Bracket at index ${i} has negative minValue` };
    }
    if (bracket.maxValue !== undefined && bracket.maxValue !== null) {
      if (bracket.maxValue < 0) {
        return { valid: false, error: `Bracket at index ${i} has negative maxValue` };
      }
      if (bracket.minValue >= bracket.maxValue) {
        return { valid: false, error: `Bracket at index ${i}: minValue (${bracket.minValue}) must be less than maxValue (${bracket.maxValue})` };
      }
    }
  }

  // Check for overlapping brackets
  const sortedBrackets = [...brackets].sort((a, b) => a.minValue - b.minValue);
  for (let i = 0; i < sortedBrackets.length - 1; i++) {
    const current = sortedBrackets[i];
    const next = sortedBrackets[i + 1];
    
    const currentMax = current.maxValue !== undefined && current.maxValue !== null ? current.maxValue : Infinity;
    const nextMin = next.minValue;
    
    if (currentMax > nextMin) {
      return { valid: false, error: `Brackets overlap: [${current.minValue}-${current.maxValue}] and [${next.minValue}-${next.maxValue}]` };
    }
  }

  return { valid: true };
}

/**
 * Validates classifications
 * @param {Array} classifications - Array of classification objects
 * @returns {Object} { valid: boolean, error: string }
 */
function validateClassifications(classifications) {
  if (!classifications || classifications.length === 0) {
    return { valid: true };
  }

  const names = new Set();
  
  for (let i = 0; i < classifications.length; i++) {
    const classification = classifications[i];
    
    if (!classification.name) {
      return { valid: false, error: `Classification at index ${i} is missing name` };
    }
    
    if (names.has(classification.name)) {
      return { valid: false, error: `Duplicate classification name: "${classification.name}"` };
    }
    names.add(classification.name);
    
    if (classification.fee === undefined || classification.fee === null) {
      return { valid: false, error: `Classification "${classification.name}" is missing fee` };
    }
    
    if (classification.fee < 0) {
      return { valid: false, error: `Classification "${classification.name}" has negative fee` };
    }
  }

  return { valid: true };
}

/**
 * Validates calculation method specific requirements
 * @param {string} calculationMethod - The calculation method
 * @param {Object} data - The variable data
 * @returns {Object} { valid: boolean, error: string }
 */
function validateCalculationMethod(calculationMethod, data) {
  const methods = {
    bracketed: {
      required: ['brackets'],
      check: () => data.brackets && data.brackets.length > 0,
      error: 'Bracketed calculation method requires at least one bracket'
    },
    classification: {
      required: ['classifications'],
      check: () => data.classifications && data.classifications.length > 0,
      error: 'Classification calculation method requires at least one classification'
    },
    yes_no: {
      required: ['fixedAmount'],
      check: () => data.fixedAmount !== undefined && data.fixedAmount !== null,
      error: 'Yes/No calculation method requires fixedAmount'
    },
    per_unit: {
      required: ['baseRate'],
      check: () => data.baseRate !== undefined && data.baseRate !== null,
      error: 'Per unit calculation method requires baseRate'
    },
    percentage: {
      required: ['baseRate'],
      check: () => {
        if (data.baseRate === undefined || data.baseRate === null) return false;
        if (data.baseRate < 0 || data.baseRate > 100) return false;
        return true;
      },
      error: 'Percentage calculation method requires baseRate between 0 and 100'
    },
    custom: {
      required: ['customCalculationMethod'],
      check: () => data.customCalculationMethod,
      error: 'Custom calculation method requires customCalculationMethod'
    }
  };

  const validation = methods[calculationMethod];
  if (validation) {
    if (!validation.check()) {
      return { valid: false, error: validation.error };
    }
  }

  return { valid: true };
}

/**
 * Validates string field lengths
 * @param {Object} data - The variable data
 * @returns {Object} { valid: boolean, error: string }
 */
function validateStringLengths(data) {
  const limits = {
    name: 200,
    description: 1000,
    notes: 1000,
    question: 500,
    unit: 50,
    unitSingular: 50,
    unitPlural: 50,
    customCalculationMethod: 500
  };

  for (const [field, limit] of Object.entries(limits)) {
    if (data[field] && data[field].length > limit) {
      return { valid: false, error: `Field '${field}' exceeds maximum length of ${limit} characters` };
    }
  }

  return { valid: true };
}

/**
 * Validates URLs in legalBasis
 * @param {Array} legalBasis - Array of legal basis objects
 * @returns {Object} { valid: boolean, error: string }
 */
function validateLegalBasisUrls(legalBasis) {
  if (!legalBasis || legalBasis.length === 0) {
    return { valid: true };
  }

  for (let i = 0; i < legalBasis.length; i++) {
    const item = legalBasis[i];
    if (item.url) {
      try {
        new URL(item.url);
      } catch (e) {
        return { valid: false, error: `Legal basis at index ${i} has invalid URL: ${item.url}` };
      }
    }
  }

  return { valid: true };
}

/**
 * Validates unit consistency
 * @param {Object} data - The variable data
 * @returns {Object} { valid: boolean, error: string }
 */
function validateUnitConsistency(data) {
  if (data.unitSingular && data.unitPlural && data.unitSingular === data.unitPlural) {
    return { valid: false, error: 'unitSingular and unitPlural must be different' };
  }
  return { valid: true };
}

/**
 * Validates customId format
 * @param {string} customId - The custom ID
 * @returns {Object} { valid: boolean, error: string }
 */
function validateCustomIdFormat(customId) {
  if (!customId) {
    return { valid: true };
  }
  
  // Expected format: VAR-XXX-XXX (e.g., VAR-001-001)
  const regex = /^VAR-[A-Z0-9]{3}-[A-Z0-9]{3}$/;
  if (!regex.test(customId)) {
    return { valid: false, error: 'customId must match format VAR-XXX-XXX (e.g., VAR-001-001)' };
  }
  
  return { valid: true };
}

module.exports = {
  validateBrackets,
  validateClassifications,
  validateCalculationMethod,
  validateStringLengths,
  validateLegalBasisUrls,
  validateUnitConsistency,
  validateCustomIdFormat
};
