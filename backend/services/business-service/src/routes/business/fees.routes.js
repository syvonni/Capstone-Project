const express = require("express");
const whatIfFeeService = require("../../services/whatIfFeeService");
const { requireJwt } = require("../../middleware/auth");
const respond = require("../../middleware/respond");
const Fee = require("../../models/Fee");
const router = express.Router();

// POST /api/business/fees/assessment - Compatibility endpoint for payment generation
router.post("/assessment", requireJwt, async (req, res) => {
  try {
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
    } = req.body || {};

    const resolvedLob = lineOfBusiness || lob || "service";
    const calculated = whatIfFeeService.calculateBaseFees({
      lineOfBusiness: resolvedLob,
      capitalInvestment,
      grossAnnualSales: grossReceipts,
      numberOfEmployees,
      businessArea,
      location,
    });

    const dueDate = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString();
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

    return res.json({ success: true, fees });
  } catch (err) {
    console.error("POST /api/business/fees/assessment error:", err);
    return respond.error(
      res,
      500,
      "assessment_error",
      err.message || "Failed to compute fee assessment",
    );
  }
});

// POST /api/business/fees/what-if - Calculate what-if fee scenarios
router.post("/what-if", requireJwt, async (req, res) => {
  try {
    const businessData = req.body;

    if (!businessData.lineOfBusiness) {
      return respond.error(
        res,
        400,
        "missing_lob",
        "Line of business is required",
      );
    }

    const result = whatIfFeeService.calculateWhatIfFees(businessData);
    res.json(result);
  } catch (err) {
    console.error("POST /api/business/fees/what-if error:", err);
    return respond.error(
      res,
      500,
      "calculation_error",
      err.message || "Fee calculation failed",
    );
  }
});

// POST /api/business/fees/impact/:businessId - Get fee impact analysis
router.post("/impact/:businessId", requireJwt, async (req, res) => {
  try {
    const { businessId } = req.params;
    const changes = req.body;

    if (!changes || Object.keys(changes).length === 0) {
      return respond.error(
        res,
        400,
        "missing_changes",
        "Changes are required for impact analysis",
      );
    }

    const result = await whatIfFeeService.getFeeImpactAnalysis(
      businessId,
      changes,
    );
    res.json(result);
  } catch (err) {
    console.error("POST /api/business/fees/impact error:", err);
    return respond.error(
      res,
      500,
      "impact_error",
      err.message || "Impact analysis failed",
    );
  }
});

// POST /api/business/fees/compare - Compare fee scenarios
router.post("/compare", requireJwt, async (req, res) => {
  try {
    const { scenarios } = req.body;

    if (!scenarios || !Array.isArray(scenarios) || scenarios.length < 2) {
      return respond.error(
        res,
        400,
        "invalid_scenarios",
        "At least 2 scenarios are required for comparison",
      );
    }

    const result = whatIfFeeService.compareFeeScenarios(scenarios);
    res.json(result);
  } catch (err) {
    console.error("POST /api/business/fees/compare error:", err);
    return respond.error(
      res,
      500,
      "comparison_error",
      err.message || "Scenario comparison failed",
    );
  }
});

// POST /api/business/fees/breakdown - Get detailed fee breakdown
router.post("/breakdown", requireJwt, async (req, res) => {
  try {
    const businessData = req.body;

    if (!businessData.lineOfBusiness) {
      return respond.error(
        res,
        400,
        "missing_lob",
        "Line of business is required",
      );
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

    res.json(breakdown);
  } catch (err) {
    console.error("POST /api/business/fees/breakdown error:", err);
    return respond.error(
      res,
      500,
      "breakdown_error",
      err.message || "Fee breakdown failed",
    );
  }
});

// GET /api/business/fees/history/:businessId? - Get fee history
router.get("/history/:businessId?", requireJwt, async (req, res) => {
  try {
    const { businessId } = req.params;

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
            impact: "+10% for manufacturing and food service",
          },
        ];

    res.json({ history });
  } catch (err) {
    console.error("GET /api/business/fees/history error:", err);
    return respond.error(
      res,
      500,
      "history_error",
      err.message || "Failed to get fee history",
    );
  }
});

// GET /api/business/fees/optimization/:businessId - Get optimization suggestions
router.get("/optimization/:businessId", requireJwt, async (req, res) => {
  try {
    const { businessId } = req.params;

    // Mock current business data - in production, fetch from database
    const currentData = {
      lineOfBusiness: "retail",
      capitalInvestment: 500000,
      numberOfEmployees: 15,
      grossAnnualSales: 2000000,
      businessArea: 200,
      location: "commercial_area",
    };

    const fees = whatIfFeeService.calculateBaseFees(currentData);
    const recommendations =
      whatIfFeeService.generateOptimizationRecommendations(currentData, fees);

    res.json({
      businessId,
      currentFees: fees,
      recommendations,
      potentialSavings: recommendations.reduce((total, rec) => {
        const savings = parseFloat(rec.potentialSavings) || 0;
        return total + (fees.totalFees * savings) / 100;
      }, 0),
    });
  } catch (err) {
    console.error("GET /api/business/fees/optimization error:", err);
    return respond.error(
      res,
      500,
      "optimization_error",
      err.message || "Failed to get optimization suggestions",
    );
  }
});

// POST /api/business/fees/project - Project future fees
router.post("/project", requireJwt, async (req, res) => {
  try {
    const projectionData = req.body;
    const { currentData, growthParameters, years = 3 } = projectionData;

    if (!currentData || !growthParameters) {
      return respond.error(
        res,
        400,
        "missing_data",
        "Current data and growth parameters are required",
      );
    }

    const projections = [];
    let projectedData = { ...currentData };

    for (let year = 1; year <= years; year++) {
      // Apply growth parameters
      projectedData.grossAnnualSales *=
        1 + (growthParameters.salesGrowth || 0.05);
      projectedData.numberOfEmployees = Math.floor(
        projectedData.numberOfEmployees *
          (1 + (growthParameters.employeeGrowth || 0.03)),
      );
      projectedData.capitalInvestment *=
        1 + (growthParameters.capitalGrowth || 0.04);

      // Calculate fees for projected year
      const fees = whatIfFeeService.calculateBaseFees(projectedData);

      projections.push({
        year: new Date().getFullYear() + year,
        projectedData: { ...projectedData },
        fees,
        assumptions: {
          salesGrowth: `${(growthParameters.salesGrowth || 0.05) * 100}%`,
          employeeGrowth: `${(growthParameters.employeeGrowth || 0.03) * 100}%`,
          capitalGrowth: `${(growthParameters.capitalGrowth || 0.04) * 100}%`,
          inflationRate: `${(growthParameters.inflation || 0.03) * 100}%`,
        },
      });
    }

    res.json({ projections });
  } catch (err) {
    console.error("POST /api/business/fees/project error:", err);
    return respond.error(
      res,
      500,
      "projection_error",
      err.message || "Fee projection failed",
    );
  }
});

// Helper function to generate payment schedule
function generatePaymentSchedule(fees) {
  return {
    fullPayment: {
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      amount: fees.totalFees,
      description: "Full payment due 30 days from permit issuance",
    },
    installment: {
      available: fees.totalFees > 1000,
      schedule:
        fees.totalFees > 1000
          ? [
              {
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                  .toISOString()
                  .split("T")[0],
                amount: fees.totalFees * 0.5,
              },
              {
                dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
                  .toISOString()
                  .split("T")[0],
                amount: fees.totalFees * 0.5,
              },
            ]
          : [],
      description: "Available for fees over ₱1,000",
    },
  };
}

module.exports = router;
