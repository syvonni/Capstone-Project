/**
 * Frontend Fee Calculator
 * 
 * Temporary frontend calculation logic for LOB fee preview.
 * This will be replaced with backend calculation logic in the future.
 */

export function calculateFee(lobConfig, businessData) {
  const { taxRate, calculationMethod, taxBrackets } = lobConfig
  const { grossSales = 0, floorArea: _floorArea = 0, employees: _employees = 0 } = businessData

  const baseFee = 0

  let businessTax = 0

  if (calculationMethod === 'percentage') {
    // Percentage of gross sales
    businessTax = grossSales * (taxRate / 100)
  } else if (calculationMethod === 'graduated') {
    // Find applicable tax bracket based on gross sales
    if (taxBrackets && taxBrackets.length > 0) {
      const bracket = taxBrackets.find(b => 
        grossSales >= b.minGrossSales && 
        (!b.maxGrossSales || grossSales <= b.maxGrossSales)
      )
      businessTax = bracket?.amount || 0
    }
  }
  // Fixed calculation: no additional business tax, just base fee

  const total = baseFee + businessTax

  return {
    baseFee,
    businessTax,
    total,
    breakdown: {
      calculationMethod,
      taxRate: calculationMethod === 'percentage' ? `${taxRate}%` : 'N/A',
      applicableBracket: calculationMethod === 'graduated' ? 
        taxBrackets?.find(b => grossSales >= b.minGrossSales && (!b.maxGrossSales || grossSales <= b.maxGrossSales)) : 
        null,
    }
  }
}
