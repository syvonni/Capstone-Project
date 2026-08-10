const whatIfFeeService = require("../whatIfFeeService");

class BusinessFeeService {
  /**
   * Calculate fee assessment for payment generation
   */
  async calculateAssessment(assessmentData) {
    const {
      businessId,
      applicationId,
      lob,
      lineOfBusiness,
      capitalInvestment,
      grossReceipts,
      numberOfEmployees,
      businessArea,
      location,
    } = assessmentData || {};

    const resolvedLob = lineOfBusiness || lob || "service";
    const calculated = whatIfFeeService.calculateBaseFees({
      lineOfBusiness: resolvedLob,
      capitalInvestment,
      grossAnnualSales: grossReceipts,
      numberOfEmployees,
      businessArea,
      location,
    });

    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const relId = applicationId || businessId || "";
    const fees = [
      {
        paymentType: "general_permit_fee",
        description: "Mayor's Permit – Business Registration Fee",
        amount: calculated.baseFee || 0,
        dueDate,
        relatedEntityType: "registration",
        relatedEntityId: relId,
      },
      {
        paymentType: "other",
        description: "Sanitary Permit Fee",
        amount: calculated.sanitaryFee || 0,
        dueDate,
        relatedEntityType: "registration",
        relatedEntityId: relId,
      },
      {
        paymentType: "other",
        description: "Fire Safety Inspection Fee (BFP)",
        amount: calculated.fireSafetyFee || 0,
        dueDate,
        relatedEntityType: "registration",
        relatedEntityId: relId,
      },
      {
        paymentType: "other",
        description: "Regulatory / Processing Fee",
        amount: calculated.regulatoryFees || 0,
        dueDate,
        relatedEntityType: "registration",
        relatedEntityId: relId,
      },
    ].filter((item) => Number(item.amount) > 0);

    return { success: true, fees };
  }

  /**
   * Calculate what-if fee scenarios
   */
  async calculateWhatIf(businessData) {
    if (!businessData.lineOfBusiness) {
      const error = new Error("Line of business is required");
      error.code = "MISSING_LOB";
      error.status = 400;
      throw error;
    }

    return whatIfFeeService.calculateWhatIfFees(businessData);
  }

  /**
   * Get fee impact analysis for a business
   */
  async getFeeImpact(businessId, changes) {
    if (!changes || Object.keys(changes).length === 0) {
      const error = new Error("Changes are required for impact analysis");
      error.code = "MISSING_CHANGES";
      error.status = 400;
      throw error;
    }

    return await whatIfFeeService.getFeeImpactAnalysis(businessId, changes);
  }

  /**
   * Compare fee scenarios
   */
  async compareScenarios(scenarios) {
    if (!scenarios || !Array.isArray(scenarios) || scenarios.length < 2) {
      const error = new Error("At least 2 scenarios are required for comparison");
      error.code = "INVALID_SCENARIOS";
      error.status = 400;
      throw error;
    }

    return whatIfFeeService.compareFeeScenarios(scenarios);
  }

  /**
   * Get detailed fee breakdown
   */
  async getBreakdown(businessData) {
    if (!businessData.lineOfBusiness) {
      const error = new Error("Line of business is required");
      error.code = "MISSING_LOB";
      error.status = 400;
      throw error;
    }

    const fees = whatIfFeeService.calculateBaseFees(businessData);

    // Enhanced breakdown with explanations
    const breakdown = {
      fees,
      explanations: {
        baseFee: {
          description: "Base permit fee based on business type and size",
          calculation: `Base rate for ${businessData.lineOfBusiness} with adjustments for capital and sales`,
          factors: whatIfFeeService.getFeeFactors("base", businessData),
        },
        sanitaryFee: {
          description: "Sanitary permit fee for health compliance",
          calculation: "Based on business type and number of employees",
          factors: whatIfFeeService.getFeeFactors("sanitary", businessData),
        },
        fireSafetyFee: {
          description: "Fire safety permit fee for safety compliance",
          calculation: "Based on business type and area size",
          factors: whatIfFeeService.getFeeFactors("fire", businessData),
        },
        regulatoryFees: {
          description: "Processing and regulatory compliance fees",
          calculation: "Based on business complexity and capital investment",
          factors: whatIfFeeService.getFeeFactors("regulatory", businessData),
        },
      },
      totalWithTax: fees.totalFees + fees.totalFees * 0.12, // Assuming 12% tax
      paymentSchedule: this.generatePaymentSchedule(fees),
    };

    return breakdown;
  }

  /**
   * Get fee history for a business or global fee history
   */
  async getHistory(businessId) {
    // Mock historical data - in production, this would come from database
    const history = businessId
      ? [
          {
            date: "2024-01-15",
            businessId,
            fees: {
              baseFee: 500,
              sanitaryFee: 200,
              fireSafetyFee: 150,
              regulatoryFees: 100,
              totalFees: 950,
            },
            changes: "Initial registration",
          },
          {
            date: "2024-07-15",
            businessId,
            fees: {
              baseFee: 750,
              sanitaryFee: 300,
              fireSafetyFee: 200,
              regulatoryFees: 150,
              totalFees: 1400,
            },
            changes: "Business expansion - increased capital and employees",
          },
        ]
      : [
          {
            date: "2024-01-01",
            change: "Fee schedule update",
            description: "Annual fee adjustment for inflation",
            impact: "+5% across all business types",
          },
          {
            date: "2023-06-01",
            change: "New regulatory requirements",
            description: "Additional compliance fees for high-risk businesses",
            impact: "+10% for manufacturing and industrial businesses",
          },
          {
            date: "2023-01-01",
            change: "Tax bracket adjustment",
            description: "Updated tax brackets for progressive taxation",
            impact: "New brackets for capital ranges 1M-5M and 5M+",
          },
        ];

    return history;
  }

  /**
   * Get fee projections for future periods
   */
  async getProjections(projectionData) {
    const { businessId, periods = 12 } = projectionData;

    // Mock projection data - in production, this would use historical data and growth models
    const projections = [];
    const baseFees = {
      baseFee: 500,
      sanitaryFee: 200,
      fireSafetyFee: 150,
      regulatoryFees: 100,
      totalFees: 950,
    };

    for (let i = 1; i <= periods; i++) {
      const projectedDate = new Date();
      projectedDate.setMonth(projectedDate.getMonth() + i);

      // Apply 2% annual growth rate
      const growthFactor = Math.pow(1.02, i / 12);

      projections.push({
        period: i,
        date: projectedDate.toISOString().split("T")[0],
        fees: {
          baseFee: Math.round(baseFees.baseFee * growthFactor),
          sanitaryFee: Math.round(baseFees.sanitaryFee * growthFactor),
          fireSafetyFee: Math.round(baseFees.fireSafetyFee * growthFactor),
          regulatoryFees: Math.round(baseFees.regulatoryFees * growthFactor),
          totalFees: Math.round(baseFees.totalFees * growthFactor),
        },
        assumptions: "2% annual growth rate",
      });
    }

    return { businessId, projections };
  }

  /**
   * Get fee estimates for different business types
   */
  async getEstimates(estimateData) {
    const { businessTypes, capitalRanges } = estimateData;

    // Mock estimate data - in production, this would use actual fee schedules
    const estimates = {};

    const types = businessTypes || ["retail", "service", "manufacturing"];
    const ranges = capitalRanges || ["0-100k", "100k-500k", "500k-1M", "1M+"];

    types.forEach((type) => {
      estimates[type] = {};
      ranges.forEach((range) => {
        const baseAmount = type === "manufacturing" ? 1000 : type === "retail" ? 500 : 300;
        const multiplier = range === "1M+" ? 2 : range === "500k-1M" ? 1.5 : range === "100k-500k" ? 1.2 : 1;
        
        estimates[type][range] = {
          baseFee: Math.round(baseAmount * multiplier),
          sanitaryFee: Math.round(200 * multiplier),
          fireSafetyFee: Math.round(150 * multiplier),
          regulatoryFees: Math.round(100 * multiplier),
          totalFees: Math.round((baseAmount + 200 + 150 + 100) * multiplier),
        };
      });
    });

    return estimates;
  }

  /**
   * Generate payment schedule for fees
   */
  generatePaymentSchedule(fees) {
    const schedule = [];
    const totalFees = fees.totalFees || 0;
    
    if (totalFees === 0) return schedule;

    // Generate quarterly payment schedule
    const quarterlyAmount = Math.round(totalFees / 4);
    const startDate = new Date();

    for (let i = 0; i < 4; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + (i + 1) * 3);
      
      schedule.push({
        installment: i + 1,
        dueDate: dueDate.toISOString().split("T")[0],
        amount: i === 3 ? totalFees - (quarterlyAmount * 3) : quarterlyAmount, // Adjust last payment
        status: "pending",
      });
    }

    return schedule;
  }
}

module.exports = new BusinessFeeService();
