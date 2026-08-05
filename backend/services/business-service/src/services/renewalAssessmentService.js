/**
 * Renewal Assessment Calculation Service
 * Implements real LGU fee calculations based on Philippine LGU fee structures
 */

/**
 * Calculate Local Business Tax (LBT) based on gross receipts
 * Typical Philippine LGU structure: 1-2% of gross receipts, with brackets
 * @param {number} grossReceipts - Gross receipts for the preceding year
 * @param {string} businessType - Type of business
 * @param {string} location - Business location (city/municipality)
 * @returns {number} Local Business Tax amount
 */
function calculateLocalBusinessTax(grossReceipts, businessType, location) {
  if (!grossReceipts || grossReceipts <= 0) return 0;

  // Base rate: 1.5% of gross receipts (typical for most LGUs)
  // Can be adjusted per LGU or business type
  let taxRate = 0.015; // 1.5%

  // Adjust rate based on business type (PSIC sections)
  if (businessType === "g") {
    taxRate = 0.01; // 1% for wholesale/retail
  } else if (businessType === "c") {
    taxRate = 0.02; // 2% for manufacturing
  } else if (businessType === "k") {
    taxRate = 0.025; // 2.5% for financial services
  }

  // Calculate tax
  const tax = grossReceipts * taxRate;

  // Minimum tax (typically ₱500)
  const minimumTax = 500;

  return Math.max(tax, minimumTax);
}

/**
 * Calculate Mayor's Permit Fee
 * Tiered structure based on business type and size
 * @param {string} businessType - Type of business
 * @param {number} businessSize - Business size (number of employees or capital)
 * @returns {number} Mayor's Permit Fee
 */
function calculateMayorsPermitFee(businessType, businessSize = 0) {
  // Base fee structure
  let baseFee = 1000; // Base fee: ₱1,000

  // Adjust based on business type (PSIC sections)
  const typeMultipliers = {
    g: 1.0, // Wholesale and retail trade
    i: 1.5, // Accommodation and food service
    s: 1.2, // Other service activities
    c: 2.0, // Manufacturing
    f: 1.8, // Construction
    k: 2.5, // Financial and insurance
    h: 1.5, // Transport and storage
    a: 0.8, // Agriculture, forestry and fishing
  };

  const multiplier = typeMultipliers[businessType] || 1.0;
  baseFee = baseFee * multiplier;

  // Adjust based on business size (employees)
  if (businessSize > 50) {
    baseFee *= 1.5; // Large business
  } else if (businessSize > 10) {
    baseFee *= 1.2; // Medium business
  }

  // Round to nearest 100
  return Math.round(baseFee / 100) * 100;
}


/**
 * Calculate Community Tax (Cedula)
 * Based on gross receipts brackets
 * @param {number} grossReceipts - Gross receipts
 * @returns {number} Community Tax amount
 */
function calculateCommunityTax(grossReceipts) {
  if (!grossReceipts || grossReceipts <= 0) {
    return 30; // Minimum cedula for individuals
  }

  // Community Tax brackets (typical structure)
  if (grossReceipts <= 5000) {
    return 30;
  } else if (grossReceipts <= 10000) {
    return 50;
  } else if (grossReceipts <= 15000) {
    return 100;
  } else if (grossReceipts <= 20000) {
    return 150;
  } else if (grossReceipts <= 30000) {
    return 200;
  } else if (grossReceipts <= 40000) {
    return 250;
  } else if (grossReceipts <= 50000) {
    return 300;
  } else if (grossReceipts <= 75000) {
    return 400;
  } else if (grossReceipts <= 100000) {
    return 500;
  } else if (grossReceipts <= 150000) {
    return 750;
  } else if (grossReceipts <= 200000) {
    return 1000;
  } else if (grossReceipts <= 300000) {
    return 1500;
  } else if (grossReceipts <= 500000) {
    return 2000;
  } else if (grossReceipts <= 750000) {
    return 3000;
  } else if (grossReceipts <= 1000000) {
    return 4000;
  } else {
    // For receipts over 1M, add ₱1,000 for every ₱100,000
    const excess = grossReceipts - 1000000;
    const additional = Math.floor(excess / 100000) * 1000;
    return 4000 + additional;
  }
}

/**
 * Calculate Fire Safety Inspection Fee
 * Based on business type
 * @param {string} businessType - Type of business
 * @returns {number} Fire Safety Inspection Fee
 */
function calculateFireSafetyInspectionFee(businessType) {
  // Base fee: ₱500
  let fee = 500;

  // Higher risk businesses pay more (PSIC sections)
  const highRiskTypes = ["c", "i", "f"]; // Manufacturing, Food service, Construction
  if (highRiskTypes.includes(businessType)) {
    fee = 1000;
  }

  return fee;
}

/**
 * Calculate Sanitary Permit / Health Certificate Fee
 * Conditional based on business type and food handlers
 * @param {string} businessType - Type of business
 * @param {boolean} hasFoodHandlers - Whether business has food handlers
 * @returns {number} Sanitary Permit Fee
 */
function calculateSanitaryPermitFee(businessType, hasFoodHandlers = false) {
  // Only applicable for food-related businesses (PSIC i = Accommodation and food service)
  if (businessType !== "i" && !hasFoodHandlers) {
    return 0;
  }

  // Base fee: ₱500
  let fee = 500;

  // Additional fee per food handler (if applicable)
  // This would need to be passed as a parameter if we track handler count
  // For now, just base fee

  return fee;
}

/**
 * Calculate Garbage / Environmental Fees
 * Based on business size and location
 * @param {number} businessSize - Business size (employees or square meters)
 * @param {string} location - Business location
 * @returns {number} Garbage Fee
 */
function calculateGarbageFee(businessSize = 0, location) {
  // Base fee: ₱300 per month (annual: ₱3,600)
  let annualFee = 3600;

  // Adjust based on business size
  if (businessSize > 50) {
    annualFee = 6000; // Large business
  } else if (businessSize > 10) {
    annualFee = 4800; // Medium business
  }

  return annualFee;
}

/**
 * Calculate Environmental Fee
 * Based on business type and location
 * @param {string} businessType - Type of business
 * @param {string} location - Business location
 * @returns {number} Environmental Fee
 */
function calculateEnvironmentalFee(businessType, location) {
  // Only applicable to certain business types (PSIC: c=Manufacturing, f=Construction)
  const applicableTypes = ["c", "f"];

  if (!applicableTypes.includes(businessType)) {
    return 0;
  }

  // Base environmental fee: ₱1,000
  return 1000;
}

/**
 * Calculate Other Applicable LGU Fees
 * Miscellaneous fees that may apply
 * @param {string} businessType - Type of business
 * @param {object} businessData - Additional business data
 * @returns {number} Other fees total
 */
function calculateOtherFees(businessType, businessData = {}) {
  let otherFees = 0;

  // Signage permit (if applicable)
  if (businessData.hasSignage) {
    otherFees += 500;
  }

  // Zoning clearance (if applicable)
  if (businessData.requiresZoningClearance) {
    otherFees += 300;
  }

  // Business plate (if applicable)
  otherFees += 200;

  return otherFees;
}

/**
 * Calculate total renewal assessment
 * Main method that calculates all fees
 * @param {number} grossReceipts - Gross receipts for CY 2025
 * @param {object} businessData - Business data object
 * @returns {object} Complete assessment breakdown
 */
function calculateTotalAssessment(grossReceipts, businessData) {
  const {
    businessType = "",
    location = {},
    numberOfEmployees = 0,
    withFoodHandlers = false,
    barangay = "",
    hasSignage = false,
    requiresZoningClearance = false,
  } = businessData;

  // Calculate all fees
  const localBusinessTax = calculateLocalBusinessTax(
    grossReceipts,
    businessType,
    location.city || location.cityMunicipality,
  );
  const mayorsPermitFee = calculateMayorsPermitFee(
    businessType,
    numberOfEmployees,
  );
  const communityTax = calculateCommunityTax(grossReceipts);
  const fireSafetyInspectionFee =
    calculateFireSafetyInspectionFee(businessType);
  const sanitaryPermitFee = calculateSanitaryPermitFee(
    businessType,
    withFoodHandlers === "yes" || withFoodHandlers === true,
  );
  const garbageFee = calculateGarbageFee(
    numberOfEmployees,
    location.city || location.cityMunicipality,
  );
  const environmentalFee = calculateEnvironmentalFee(
    businessType,
    location.city || location.cityMunicipality,
  );
  const otherFees = calculateOtherFees(businessType, {
    hasSignage,
    requiresZoningClearance,
  });

  // Calculate total
  const total =
    localBusinessTax +
    mayorsPermitFee +
    communityTax +
    fireSafetyInspectionFee +
    sanitaryPermitFee +
    garbageFee +
    environmentalFee +
    otherFees;

  return {
    localBusinessTax: Math.round(localBusinessTax * 100) / 100,
    mayorsPermitFee: Math.round(mayorsPermitFee * 100) / 100,
    communityTax: Math.round(communityTax * 100) / 100,
    fireSafetyInspectionFee: Math.round(fireSafetyInspectionFee * 100) / 100,
    sanitaryPermitFee: Math.round(sanitaryPermitFee * 100) / 100,
    garbageFee: Math.round(garbageFee * 100) / 100,
    environmentalFee: Math.round(environmentalFee * 100) / 100,
    otherFees: Math.round(otherFees * 100) / 100,
    total: Math.round(total * 100) / 100,
    calculatedAt: new Date(),
  };
}

module.exports = {
  calculateLocalBusinessTax,
  calculateMayorsPermitFee,
  calculateCommunityTax,
  calculateFireSafetyInspectionFee,
  calculateSanitaryPermitFee,
  calculateGarbageFee,
  calculateEnvironmentalFee,
  calculateOtherFees,
  calculateTotalAssessment,
};
