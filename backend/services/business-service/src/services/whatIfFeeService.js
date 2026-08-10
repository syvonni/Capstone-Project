/**
 * What-If Fee Calculation Service
 * Handles dynamic fee scenario calculations and impact analysis
 */

const logger = require("../lib/logger");
const TaxBracket = require("../models/TaxBracket");

class WhatIfFeeService {
  /**
   * Base fee calculation logic
   * @param {object} businessData - Business parameters
   */
  static calculateBaseFees(businessData) {
    const {
      lineOfBusiness,
      capitalInvestment,
      numberOfEmployees,
      grossAnnualSales,
      businessArea,
      location,
    } = businessData;

    let baseFee = 0;
    let sanitaryFee = 0;
    let fireSafetyFee = 0;
    let regulatoryFees = 0;

    // Line of Business base fees
    const lobFees = {
      retail: { base: 500, sanitary: 200, fire: 150 },
      restaurant: { base: 1000, sanitary: 500, fire: 300 },
      manufacturing: { base: 2000, sanitary: 300, fire: 500 },
      service: { base: 750, sanitary: 100, fire: 200 },
      wholesale: { base: 1500, sanitary: 150, fire: 250 },
      construction: { base: 2500, sanitary: 200, fire: 400 },
    };

    const lobFee = lobFees[lineOfBusiness] || lobFees["service"];
    baseFee = lobFee.base;
    sanitaryFee = lobFee.sanitary;
    fireSafetyFee = lobFee.fire;

    // Capital-based adjustments
    if (capitalInvestment) {
      if (capitalInvestment > 1000000) {
        baseFee *= 1.5;
        regulatoryFees += 500;
      } else if (capitalInvestment > 500000) {
        baseFee *= 1.2;
        regulatoryFees += 250;
      }
    }

    // Employee-based adjustments
    if (numberOfEmployees) {
      if (numberOfEmployees > 50) {
        baseFee += numberOfEmployees * 10;
        sanitaryFee += numberOfEmployees * 5;
      } else if (numberOfEmployees > 20) {
        baseFee += numberOfEmployees * 5;
        sanitaryFee += numberOfEmployees * 2;
      }
    }

    // Sales-based adjustments
    if (grossAnnualSales) {
      if (grossAnnualSales > 5000000) {
        baseFee *= 1.3;
        regulatoryFees += 1000;
      } else if (grossAnnualSales > 1000000) {
        baseFee *= 1.15;
        regulatoryFees += 500;
      }
    }

    // Area-based adjustments
    if (businessArea) {
      if (businessArea > 500) {
        fireSafetyFee += Math.floor(businessArea / 100) * 50;
      }
    }

    // Location-based adjustments
    if (location) {
      const locationMultipliers = {
        central_business_district: 1.5,
        commercial_area: 1.2,
        residential_area: 1.0,
        industrial_area: 1.1,
      };
      const multiplier = locationMultipliers[location] || 1.0;
      baseFee *= multiplier;
      sanitaryFee *= multiplier;
    }

    return {
      baseFee: Math.round(baseFee),
      sanitaryFee: Math.round(sanitaryFee),
      fireSafetyFee: Math.round(fireSafetyFee),
      regulatoryFees: Math.round(regulatoryFees),
      totalFees: Math.round(
        baseFee + sanitaryFee + fireSafetyFee + regulatoryFees,
      ),
    };
  }

  /**
   * Calculate what-if fee scenarios
   * @param {object} businessData - Business parameters for calculation
   */
  static calculateWhatIfFees(businessData) {
    try {
      const fees = this.calculateBaseFees(businessData);

      // Calculate tax brackets
      const taxBrackets = this.calculateTaxBrackets(
        fees.totalFees,
        businessData.grossAnnualSales,
      );

      // Add penalty calculations if applicable
      const penalties = this.calculatePenalties(businessData);

      return {
        current: fees,
        breakdown: {
          baseFee: {
            amount: fees.baseFee,
            description: "Base business permit fee",
            factors: this.getFeeFactors("base", businessData),
          },
          sanitaryFee: {
            amount: fees.sanitaryFee,
            description: "Sanitary permit fee",
            factors: this.getFeeFactors("sanitary", businessData),
          },
          fireSafetyFee: {
            amount: fees.fireSafetyFee,
            description: "Fire safety permit fee",
            factors: this.getFeeFactors("fire", businessData),
          },
          regulatoryFees: {
            amount: fees.regulatoryFees,
            description: "Regulatory and processing fees",
            factors: this.getFeeFactors("regulatory", businessData),
          },
        },
        taxBrackets,
        penalties,
        totalWithPenalties: fees.totalFees + penalties.total,
        recommendations: this.generateOptimizationRecommendations(
          businessData,
          fees,
        ),
      };
    } catch (error) {
      logger.error("What-if fee calculation error", {
        error: error.message,
        businessData,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Calculate fee impact analysis for parameter changes
   * @param {string} businessId - Business ID
   * @param {object} changes - Parameter changes to analyze
   */
  static async getFeeImpactAnalysis(businessId, changes) {
    try {
      // This would typically fetch current business data from database
      // For now, we'll simulate with example data
      const currentData = {
        lineOfBusiness: "retail",
        capitalInvestment: 500000,
        numberOfEmployees: 15,
        grossAnnualSales: 2000000,
        businessArea: 200,
        location: "commercial_area",
      };

      const currentFees = this.calculateBaseFees(currentData);

      // Apply changes and calculate new fees
      const modifiedData = { ...currentData, ...changes };
      const newFees = this.calculateBaseFees(modifiedData);

      // Calculate impact
      const impact = {
        totalImpact: newFees.totalFees - currentFees.totalFees,
        percentageChange: (
          ((newFees.totalFees - currentFees.totalFees) /
            currentFees.totalFees) *
          100
        ).toFixed(2),
        breakdown: {
          baseFee: newFees.baseFee - currentFees.baseFee,
          sanitaryFee: newFees.sanitaryFee - currentFees.sanitaryFee,
          fireSafetyFee: newFees.fireSafetyFee - currentFees.fireSafetyFee,
          regulatoryFees: newFees.regulatoryFees - currentFees.regulatoryFees,
        },
        changes: changes,
        scenarios: this.generateImpactScenarios(currentData, changes),
      };

      return {
        businessId,
        currentFees,
        newFees,
        impact,
        recommendations: this.generateChangeRecommendations(changes, impact),
      };
    } catch (error) {
      logger.error("Fee impact analysis error", {
        error: error.message,
        businessId,
        changes,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Compare fees between different business scenarios
   * @param {object} scenarios - Array of business scenarios to compare
   */
  static compareFeeScenarios(scenarios) {
    try {
      const results = scenarios.map((scenario, index) => {
        const fees = this.calculateBaseFees(scenario);
        return {
          scenarioId: `scenario_${index + 1}`,
          name: scenario.name || `Scenario ${index + 1}`,
          businessData: scenario,
          fees,
          taxBrackets: this.calculateTaxBrackets(
            fees.totalFees,
            scenario.grossAnnualSales,
          ),
        };
      });

      // Sort by total fees
      results.sort((a, b) => a.fees.totalFees - b.fees.totalFees);

      // Calculate comparisons
      const lowest = results[0];
      const highest = results[results.length - 1];
      const difference = highest.fees.totalFees - lowest.fees.totalFees;

      return {
        scenarios: results,
        comparison: {
          lowest: {
            scenario: lowest.name,
            totalFees: lowest.fees.totalFees,
            businessData: lowest.businessData,
          },
          highest: {
            scenario: highest.name,
            totalFees: highest.fees.totalFees,
            businessData: highest.businessData,
          },
          difference,
          percentageDifference: (
            (difference / lowest.fees.totalFees) *
            100
          ).toFixed(2),
        },
        insights: this.generateComparisonInsights(results),
      };
    } catch (error) {
      logger.error("Fee scenarios comparison error", {
        error: error.message,
        scenarios,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Calculate tax brackets
   * @param {number} totalFees - Total fees
   * @param {number} grossSales - Gross annual sales
   * @param {object} options - Additional options
   * @param {string} options.lobId - LOB ID
   * @param {string} options.taxBasis - Tax basis ('capitalization' or 'gross_sales')
   * @param {boolean} options.isRenewal - Whether this is a renewal (for gross sales basis)
   * @param {Date} options.registrationDate - Registration date for pro-ration
   */
  static async calculateTaxBrackets(totalFees, grossSales, options = {}) {
    const {
      lobId,
      taxBasis = "capitalization",
      isRenewal = false,
      registrationDate,
    } = options;
    const brackets = [];

    // If lobId and taxBasis are provided, fetch actual tax brackets from database
    if (lobId && taxBasis) {
      try {
        const taxBrackets = await TaxBracket.find({
          lobId,
          taxBasis,
          isActive: true,
        }).sort({ minValue: 1 });

        if (taxBrackets.length > 0) {
          // Find applicable bracket based on capital or gross sales
          const value = taxBasis === "gross_sales" ? grossSales : totalFees;
          const applicableBracket = taxBrackets.find(
            (bracket) =>
              value >= bracket.minValue &&
              (bracket.maxValue === null || value <= bracket.maxValue),
          );

          if (applicableBracket) {
            let tax = 0;

            // Calculate fixed amount
            if (applicableBracket.fixedAmount) {
              tax += applicableBracket.fixedAmount;
            }

            // Calculate excess rate
            if (
              applicableBracket.excessRate &&
              applicableBracket.excessRateType
            ) {
              const excess = value - applicableBracket.minValue;
              if (applicableBracket.excessRateType === "direct") {
                tax += excess * applicableBracket.excessRate;
              } else if (
                applicableBracket.excessRateType === "percentage_of_percentage"
              ) {
                tax += excess * applicableBracket.excessRate * 0.01;
              }
            }

            // Apply pro-ration for monthly tax brackets on new registrations
            if (
              applicableBracket.paymentFrequency === "monthly" &&
              !isRenewal &&
              registrationDate
            ) {
              const currentMonth = registrationDate.getMonth(); // 0-11
              const monthsRemaining = 12 - currentMonth; // Months from current month to December
              tax = tax * monthsRemaining;
            }

            brackets.push({
              range: `₱${applicableBracket.minValue?.toLocaleString() || "0"} - ₱${applicableBracket.maxValue?.toLocaleString() || "Unlimited"}`,
              rate: applicableBracket.excessRate || 0,
              tax: tax,
              bracketName: applicableBracket.name,
              paymentFrequency: applicableBracket.paymentFrequency || "annual",
            });

            const totalTax = brackets.reduce(
              (sum, bracket) => sum + bracket.tax,
              0,
            );

            return {
              brackets,
              totalTax: Math.round(totalTax),
              effectiveRate:
                value > 0 ? ((totalTax / value) * 100).toFixed(2) : 0,
            };
          }
        }
      } catch (error) {
        logger.error("Error fetching tax brackets:", error);
        // Fall back to default calculation if database query fails
      }
    }

    // Fallback to simple progressive tax calculation
    if (grossSales <= 100000) {
      brackets.push({ range: "0-100K", rate: 0.02, tax: grossSales * 0.02 });
    } else if (grossSales <= 500000) {
      brackets.push({ range: "0-100K", rate: 0.02, tax: 2000 });
      brackets.push({
        range: "100K-500K",
        rate: 0.03,
        tax: (grossSales - 100000) * 0.03,
      });
    } else if (grossSales <= 1000000) {
      brackets.push({ range: "0-100K", rate: 0.02, tax: 2000 });
      brackets.push({ range: "100K-500K", rate: 0.03, tax: 12000 });
      brackets.push({
        range: "500K-1M",
        rate: 0.05,
        tax: (grossSales - 500000) * 0.05,
      });
    } else {
      brackets.push({ range: "0-100K", rate: 0.02, tax: 2000 });
      brackets.push({ range: "100K-500K", rate: 0.03, tax: 12000 });
      brackets.push({ range: "500K-1M", rate: 0.05, tax: 25000 });
      brackets.push({
        range: "1M+",
        rate: 0.08,
        tax: (grossSales - 1000000) * 0.08,
      });
    }

    const totalTax = brackets.reduce((sum, bracket) => sum + bracket.tax, 0);

    return {
      brackets,
      totalTax: Math.round(totalTax),
      effectiveRate: ((totalTax / grossSales) * 100).toFixed(2),
    };
  }

  /**
   * Calculate penalties
   * @param {object} businessData - Business data
   */
  static calculatePenalties(businessData) {
    let penalties = 0;
    const reasons = [];

    // Late filing penalty
    if (businessData.filingDelayDays > 0) {
      const latePenalty = Math.min(businessData.filingDelayDays * 10, 500);
      penalties += latePenalty;
      reasons.push(
        `Late filing: ${latePenalty} (${businessData.filingDelayDays} days)`,
      );
    }

    // Undercapitalization penalty
    if (businessData.capitalInvestment && businessData.requiredCapital) {
      if (businessData.capitalInvestment < businessData.requiredCapital) {
        const shortfall =
          businessData.requiredCapital - businessData.capitalInvestment;
        const undercapitalPenalty = Math.min(shortfall * 0.01, 1000);
        penalties += undercapitalPenalty;
        reasons.push(`Undercapitalization: ${undercapitalPenalty}`);
      }
    }

    return {
      total: penalties,
      reasons,
      description:
        penalties > 0
          ? "Penalties assessed for compliance issues"
          : "No penalties",
    };
  }

  /**
   * Get fee factors for breakdown
   * @param {string} feeType - Type of fee
   * @param {object} businessData - Business data
   */
  static getFeeFactors(feeType, businessData) {
    const factors = [];

    switch (feeType) {
      case "base":
        if (businessData.capitalInvestment > 500000) {
          factors.push(
            `Capital adjustment: ${businessData.capitalInvestment > 1000000 ? "+50%" : "+20%"}`,
          );
        }
        if (businessData.grossAnnualSales > 1000000) {
          factors.push(
            `Sales adjustment: ${businessData.grossAnnualSales > 5000000 ? "+30%" : "+15%"}`,
          );
        }
        break;
      case "sanitary":
        if (businessData.numberOfEmployees > 20) {
          factors.push(
            `Employee adjustment: +${businessData.numberOfEmployees > 50 ? "5" : "2"} per employee`,
          );
        }
        break;
      case "fire":
        if (businessData.businessArea > 500) {
          factors.push(
            `Area adjustment: +${Math.floor(businessData.businessArea / 100) * 50}`,
          );
        }
        break;
    }

    return factors;
  }

  /**
   * Generate optimization recommendations
   * @param {object} businessData - Business data
   * @param {object} fees - Calculated fees
   */
  static generateOptimizationRecommendations(businessData, fees) {
    const recommendations = [];

    // Capital optimization
    if (businessData.capitalInvestment > 1000000) {
      recommendations.push({
        type: "capital_optimization",
        description: "Consider structuring capital to reduce fees",
        potentialSavings: "15-20%",
        action: "Consult with financial advisor about capital structuring",
      });
    }

    // Location optimization
    if (businessData.location === "central_business_district") {
      recommendations.push({
        type: "location_optimization",
        description: "Central location incurs 50% higher fees",
        potentialSavings: "33%",
        action: "Evaluate if central location is essential for operations",
      });
    }

    // Employee optimization
    if (businessData.numberOfEmployees > 50) {
      recommendations.push({
        type: "staff_optimization",
        description: "Large workforce increases regulatory fees",
        potentialSavings: "10-15%",
        action: "Review staffing efficiency and automation opportunities",
      });
    }

    return recommendations;
  }

  /**
   * Generate impact scenarios
   * @param {object} currentData - Current business data
   * @param {object} changes - Changes applied
   */
  static generateImpactScenarios(currentData, changes) {
    const scenarios = [];

    // Best case scenario
    const bestCase = { ...currentData };
    if (
      changes.capitalInvestment &&
      changes.capitalInvestment > currentData.capitalInvestment
    ) {
      bestCase.capitalInvestment = currentData.capitalInvestment * 0.8; // Optimize capital
    }
    scenarios.push({
      name: "Best Case",
      description: "Optimized parameters for minimum fees",
      data: bestCase,
      fees: this.calculateBaseFees(bestCase),
    });

    // Worst case scenario
    const worstCase = { ...currentData, ...changes };
    if (
      changes.grossAnnualSales &&
      changes.grossAnnualSales > currentData.grossAnnualSales
    ) {
      worstCase.grossAnnualSales *= 1.2; // Higher sales projection
    }
    scenarios.push({
      name: "Worst Case",
      description: "Conservative projection with higher fees",
      data: worstCase,
      fees: this.calculateBaseFees(worstCase),
    });

    return scenarios;
  }

  /**
   * Generate change recommendations
   * @param {object} changes - Changes made
   * @param {object} impact - Fee impact
   */
  static generateChangeRecommendations(changes, impact) {
    const recommendations = [];

    if (impact.totalImpact > 0) {
      recommendations.push({
        type: "cost_increase",
        priority: "high",
        message: `Changes will increase fees by ${impact.percentageChange}%`,
        action: "Review if these changes are necessary or can be optimized",
      });
    } else {
      recommendations.push({
        type: "cost_decrease",
        priority: "info",
        message: `Changes will decrease fees by ${Math.abs(impact.percentageChange)}%`,
        action: "These changes are financially beneficial",
      });
    }

    return recommendations;
  }

  /**
   * Generate comparison insights
   * @param {array} results - Comparison results
   */
  static generateComparisonInsights(results) {
    const insights = [];

    // Find most influential factors
    const factorAnalysis = this.analyzeInfluentialFactors(results);
    insights.push(...factorAnalysis);

    // Cost optimization opportunities
    if (results.length > 1) {
      const optimization =
        results[1].fees.totalFees - results[0].fees.totalFees;
      insights.push({
        type: "optimization_opportunity",
        description: `Optimizing business parameters could save ${optimization}`,
        recommendation: "Consider the lowest-cost scenario parameters",
      });
    }

    return insights;
  }

  /**
   * Analyze influential factors in fee calculations
   * @param {array} results - Comparison results
   */
  static analyzeInfluentialFactors(results) {
    // This is a simplified analysis - in production, this would be more sophisticated
    return [
      {
        factor: "Line of Business",
        impact: "High",
        description:
          "Different business types have significantly different base fees",
      },
      {
        factor: "Location",
        impact: "Medium",
        description:
          "Central business district locations incur 50% higher fees",
      },
      {
        factor: "Capital Investment",
        impact: "Medium",
        description: "Higher capital investments increase regulatory fees",
      },
    ];
  }
}

module.exports = WhatIfFeeService;
