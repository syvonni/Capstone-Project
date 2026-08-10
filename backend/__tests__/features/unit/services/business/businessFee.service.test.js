const BusinessFeeService = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/services/business/businessFee.service");

// Mock the whatIfFeeService dependency
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/services/whatIfFeeService",
);

const whatIfFeeService = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/services/whatIfFeeService");

describe("BusinessFeeService", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    whatIfFeeService.calculateBaseFees.mockReturnValue({
      baseFee: 500,
      sanitaryFee: 200,
      fireSafetyFee: 150,
      regulatoryFees: 100,
      totalFees: 950,
    });

    whatIfFeeService.calculateWhatIfFees.mockReturnValue({
      scenarios: [
        { name: "Current", fees: { totalFees: 950 } },
        { name: "Projected", fees: { totalFees: 1200 } },
      ],
    });

    whatIfFeeService.getFeeImpactAnalysis.mockResolvedValue({
      currentFees: { totalFees: 950 },
      projectedFees: { totalFees: 1200 },
      impact: 250,
    });

    whatIfFeeService.compareFeeScenarios.mockReturnValue({
      comparison: [
        { scenario: "A", totalFees: 950 },
        { scenario: "B", totalFees: 1200 },
      ],
      difference: 250,
    });

    whatIfFeeService.getFeeFactors.mockReturnValue({
      capital: 0.5,
      sales: 0.3,
      employees: 0.2,
    });
  });

  describe("calculateAssessment", () => {
    it("should validate input and return calculated fees", async () => {
      const result = await BusinessFeeService.calculateAssessment({
        businessId: "507f1f77bcf86cd799439011",
        lineOfBusiness: "retail",
        capitalInvestment: 500000,
        grossReceipts: 1000000,
        numberOfEmployees: 10,
        businessArea: 100,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.fees).toBeDefined();
      expect(Array.isArray(result.fees)).toBe(true);
      expect(whatIfFeeService.calculateBaseFees).toHaveBeenCalled();
    });

    it("should handle minimal data gracefully", async () => {
      const result = await BusinessFeeService.calculateAssessment({
        businessId: "507f1f77bcf86cd799439011",
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("should filter out zero-amount fees", async () => {
      whatIfFeeService.calculateBaseFees.mockReturnValue({
        baseFee: 0,
        sanitaryFee: 200,
        fireSafetyFee: 0,
        regulatoryFees: 100,
        totalFees: 300,
      });

      const result = await BusinessFeeService.calculateAssessment({
        businessId: "507f1f77bcf86cd799439011",
        lineOfBusiness: "retail",
      });

      expect(result.fees).toBeDefined();
      expect(result.fees.every((fee) => Number(fee.amount) > 0)).toBe(true);
    });
  });

  describe("calculateWhatIf", () => {
    it("should validate lineOfBusiness is required", async () => {
      await expect(
        BusinessFeeService.calculateWhatIf({
          capitalInvestment: 500000,
        }),
      ).rejects.toThrow("Line of business is required");
    });

    it("should return what-if calculations with valid data", async () => {
      const result = await BusinessFeeService.calculateWhatIf({
        lineOfBusiness: "service",
        capitalInvestment: 300000,
        grossAnnualSales: 500000,
        numberOfEmployees: 5,
        businessArea: 50,
      });

      expect(result).toBeDefined();
      expect(whatIfFeeService.calculateWhatIfFees).toHaveBeenCalled();
    });
  });

  describe("getFeeImpact", () => {
    it("should validate changes are required", async () => {
      await expect(
        BusinessFeeService.getFeeImpact("507f1f77bcf86cd799439011", {}),
      ).rejects.toThrow("Changes are required for impact analysis");
    });

    it("should return fee impact analysis with valid data", async () => {
      const result = await BusinessFeeService.getFeeImpact(
        "507f1f77bcf86cd799439011",
        {
          capitalInvestment: 600000,
          grossReceipts: 1200000,
        },
      );

      expect(result).toBeDefined();
      expect(whatIfFeeService.getFeeImpactAnalysis).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011",
        {
          capitalInvestment: 600000,
          grossReceipts: 1200000,
        },
      );
    });
  });

  describe("compareScenarios", () => {
    it("should validate at least 2 scenarios are required", async () => {
      await expect(
        BusinessFeeService.compareScenarios([{ lineOfBusiness: "retail" }]),
      ).rejects.toThrow("At least 2 scenarios are required for comparison");
    });

    it("should return scenario comparison with valid data", async () => {
      const result = await BusinessFeeService.compareScenarios([
        {
          lineOfBusiness: "retail",
          capitalInvestment: 500000,
          grossAnnualSales: 1000000,
        },
        {
          lineOfBusiness: "service",
          capitalInvestment: 300000,
          grossAnnualSales: 500000,
        },
      ]);

      expect(result).toBeDefined();
      expect(whatIfFeeService.compareFeeScenarios).toHaveBeenCalled();
    });
  });

  describe("getBreakdown", () => {
    it("should validate lineOfBusiness is required", async () => {
      await expect(
        BusinessFeeService.getBreakdown({
          capitalInvestment: 500000,
        }),
      ).rejects.toThrow("Line of business is required");
    });

    it("should return detailed breakdown with explanations", async () => {
      const result = await BusinessFeeService.getBreakdown({
        lineOfBusiness: "manufacturing",
        capitalInvestment: 1000000,
        grossAnnualSales: 2000000,
        numberOfEmployees: 20,
        businessArea: 200,
      });

      expect(result).toBeDefined();
      expect(result.fees).toBeDefined();
      expect(result.explanations).toBeDefined();
      expect(result.totalWithTax).toBeDefined();
      expect(result.paymentSchedule).toBeDefined();
      expect(Array.isArray(result.paymentSchedule)).toBe(true);
    });
  });

  describe("getHistory", () => {
    it("should return business-specific history when businessId provided", async () => {
      const result = await BusinessFeeService.getHistory(
        "507f1f77bcf86cd799439011",
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].businessId).toBe("507f1f77bcf86cd799439011");
    });

    it("should return global history when no businessId provided", async () => {
      const result = await BusinessFeeService.getHistory();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].change).toBeDefined();
    });
  });

  describe("getProjections", () => {
    it("should return fee projections for specified periods", async () => {
      const result = await BusinessFeeService.getProjections({
        businessId: "507f1f77bcf86cd799439011",
        periods: 12,
      });

      expect(result).toBeDefined();
      expect(result.businessId).toBe("507f1f77bcf86cd799439011");
      expect(result.projections).toBeDefined();
      expect(Array.isArray(result.projections)).toBe(true);
      expect(result.projections.length).toBe(12);
    });

    it("should use default periods when not specified", async () => {
      const result = await BusinessFeeService.getProjections({
        businessId: "507f1f77bcf86cd799439011",
      });

      expect(result.projections).toBeDefined();
      expect(result.projections.length).toBe(12); // default
    });
  });

  describe("getEstimates", () => {
    it("should return fee estimates for business types and ranges", async () => {
      const result = await BusinessFeeService.getEstimates({
        businessTypes: ["retail", "service"],
        capitalRanges: ["0-100k", "100k-500k"],
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
      expect(result.retail).toBeDefined();
      expect(result.service).toBeDefined();
      expect(result.retail["0-100k"]).toBeDefined();
    });

    it("should use default business types when not specified", async () => {
      const result = await BusinessFeeService.getEstimates({});

      expect(result).toBeDefined();
      expect(result.retail).toBeDefined();
      expect(result.service).toBeDefined();
      expect(result.manufacturing).toBeDefined();
    });
  });
});
