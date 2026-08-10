const {
  validateBrackets,
  validateClassifications,
  validateCalculationMethod,
  validateStringLengths,
  validateLegalBasisUrls,
  validateUnitConsistency,
  validateCustomIdFormat,
} = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/variableValidators");

describe("Variable Validators", () => {
  describe("validateBrackets", () => {
    it("should return valid for empty brackets", () => {
      const result = validateBrackets([]);
      expect(result.valid).toBe(true);
    });

    it("should return valid for null brackets", () => {
      const result = validateBrackets(null);
      expect(result.valid).toBe(true);
    });

    it("should return valid for valid brackets", () => {
      const brackets = [
        { minValue: 0, maxValue: 100, fixedAmount: 10 },
        { minValue: 100, maxValue: 200, fixedAmount: 20 },
      ];
      const result = validateBrackets(brackets);
      expect(result.valid).toBe(true);
    });

    it("should return error for missing minValue", () => {
      const brackets = [{ maxValue: 100, fixedAmount: 10 }];
      const result = validateBrackets(brackets);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("missing minValue");
    });

    it("should return error for negative minValue", () => {
      const brackets = [{ minValue: -10, maxValue: 100, fixedAmount: 10 }];
      const result = validateBrackets(brackets);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("negative minValue");
    });

    it("should return error for negative maxValue", () => {
      const brackets = [{ minValue: 0, maxValue: -10, fixedAmount: 10 }];
      const result = validateBrackets(brackets);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("negative maxValue");
    });

    it("should return error for minValue >= maxValue", () => {
      const brackets = [{ minValue: 100, maxValue: 100, fixedAmount: 10 }];
      const result = validateBrackets(brackets);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("must be less than");
    });

    it("should return error for overlapping brackets", () => {
      const brackets = [
        { minValue: 0, maxValue: 100, fixedAmount: 10 },
        { minValue: 50, maxValue: 150, fixedAmount: 20 },
      ];
      const result = validateBrackets(brackets);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("overlap");
    });

    it("should allow brackets without maxValue (infinite) when placed last", () => {
      const brackets = [
        { minValue: 0, maxValue: 100, fixedAmount: 10 },
        { minValue: 100, fixedAmount: 20 }, // Infinite bracket at end
      ];
      const result = validateBrackets(brackets);
      expect(result.valid).toBe(true);
    });
  });

  describe("validateClassifications", () => {
    it("should return valid for empty classifications", () => {
      const result = validateClassifications([]);
      expect(result.valid).toBe(true);
    });

    it("should return valid for null classifications", () => {
      const result = validateClassifications(null);
      expect(result.valid).toBe(true);
    });

    it("should return valid for valid classifications", () => {
      const classifications = [
        { name: "Small", fee: 100 },
        { name: "Large", fee: 200 },
      ];
      const result = validateClassifications(classifications);
      expect(result.valid).toBe(true);
    });

    it("should return error for missing name", () => {
      const classifications = [{ fee: 100 }];
      const result = validateClassifications(classifications);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("missing name");
    });

    it("should return error for duplicate names", () => {
      const classifications = [
        { name: "Small", fee: 100 },
        { name: "Small", fee: 200 },
      ];
      const result = validateClassifications(classifications);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Duplicate");
    });

    it("should return error for missing fee", () => {
      const classifications = [{ name: "Small" }];
      const result = validateClassifications(classifications);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("missing fee");
    });

    it("should return error for negative fee", () => {
      const classifications = [{ name: "Small", fee: -100 }];
      const result = validateClassifications(classifications);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("negative fee");
    });
  });

  describe("validateCalculationMethod", () => {
    it("should return valid for unknown calculation method", () => {
      const result = validateCalculationMethod("unknown_method", {});
      expect(result.valid).toBe(true);
    });

    it("should return valid for bracketed with brackets", () => {
      const result = validateCalculationMethod("bracketed", {
        brackets: [{ minValue: 0, maxValue: 100 }],
      });
      expect(result.valid).toBe(true);
    });

    it("should return error for bracketed without brackets", () => {
      const result = validateCalculationMethod("bracketed", {});
      expect(result.valid).toBe(false);
      expect(result.error).toContain("requires at least one bracket");
    });

    it("should return valid for classification with classifications", () => {
      const result = validateCalculationMethod("classification", {
        classifications: [{ name: "Small", fee: 100 }],
      });
      expect(result.valid).toBe(true);
    });

    it("should return error for classification without classifications", () => {
      const result = validateCalculationMethod("classification", {});
      expect(result.valid).toBe(false);
      expect(result.error).toContain("requires at least one classification");
    });

    it("should return valid for yes_no with fixedAmount", () => {
      const result = validateCalculationMethod("yes_no", {
        fixedAmount: 100,
      });
      expect(result.valid).toBe(true);
    });

    it("should return error for yes_no without fixedAmount", () => {
      const result = validateCalculationMethod("yes_no", {});
      expect(result.valid).toBe(false);
      expect(result.error).toContain("requires fixedAmount");
    });

    it("should return valid for per_unit with baseRate", () => {
      const result = validateCalculationMethod("per_unit", {
        baseRate: 100,
      });
      expect(result.valid).toBe(true);
    });

    it("should return error for per_unit without baseRate", () => {
      const result = validateCalculationMethod("per_unit", {});
      expect(result.valid).toBe(false);
      expect(result.error).toContain("requires baseRate");
    });

    it("should return valid for percentage with valid baseRate", () => {
      const result = validateCalculationMethod("percentage", {
        baseRate: 50,
      });
      expect(result.valid).toBe(true);
    });

    it("should return error for percentage with baseRate > 100", () => {
      const result = validateCalculationMethod("percentage", {
        baseRate: 150,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("between 0 and 100");
    });

    it("should return error for percentage with negative baseRate", () => {
      const result = validateCalculationMethod("percentage", {
        baseRate: -10,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("between 0 and 100");
    });

    it("should return valid for custom with customCalculationMethod", () => {
      const result = validateCalculationMethod("custom", {
        customCalculationMethod: "x * 2",
      });
      expect(result.valid).toBe(true);
    });

    it("should return error for custom without customCalculationMethod", () => {
      const result = validateCalculationMethod("custom", {});
      expect(result.valid).toBe(false);
      expect(result.error).toContain("requires customCalculationMethod");
    });
  });

  describe("validateStringLengths", () => {
    it("should return valid for all fields within limits", () => {
      const data = {
        name: "Test",
        description: "Test description",
        notes: "Test notes",
        question: "Test question",
        unit: "unit",
        unitSingular: "unit",
        unitPlural: "units",
        customCalculationMethod: "x * 2",
      };
      const result = validateStringLengths(data);
      expect(result.valid).toBe(true);
    });

    it("should return error for name exceeding limit", () => {
      const data = {
        name: "a".repeat(201),
      };
      const result = validateStringLengths(data);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("name");
      expect(result.error).toContain("200");
    });

    it("should return error for description exceeding limit", () => {
      const data = {
        description: "a".repeat(1001),
      };
      const result = validateStringLengths(data);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("description");
      expect(result.error).toContain("1000");
    });

    it("should return error for question exceeding limit", () => {
      const data = {
        question: "a".repeat(501),
      };
      const result = validateStringLengths(data);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("question");
      expect(result.error).toContain("500");
    });

    it("should return error for unit exceeding limit", () => {
      const data = {
        unit: "a".repeat(51),
      };
      const result = validateStringLengths(data);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("unit");
      expect(result.error).toContain("50");
    });

    it("should return valid for missing optional fields", () => {
      const data = {
        name: "Test",
      };
      const result = validateStringLengths(data);
      expect(result.valid).toBe(true);
    });
  });

  describe("validateLegalBasisUrls", () => {
    it("should return valid for empty legalBasis", () => {
      const result = validateLegalBasisUrls([]);
      expect(result.valid).toBe(true);
    });

    it("should return valid for null legalBasis", () => {
      const result = validateLegalBasisUrls(null);
      expect(result.valid).toBe(true);
    });

    it("should return valid for valid URLs", () => {
      const legalBasis = [
        { url: "https://example.com/law1", title: "Law 1" },
        { url: "https://example.com/law2", title: "Law 2" },
      ];
      const result = validateLegalBasisUrls(legalBasis);
      expect(result.valid).toBe(true);
    });

    it("should return valid for legalBasis without URLs", () => {
      const legalBasis = [
        { title: "Law 1", description: "Description" },
        { title: "Law 2", description: "Description" },
      ];
      const result = validateLegalBasisUrls(legalBasis);
      expect(result.valid).toBe(true);
    });

    it("should return error for invalid URL", () => {
      const legalBasis = [{ url: "not-a-url", title: "Law 1" }];
      const result = validateLegalBasisUrls(legalBasis);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("invalid URL");
    });

    it("should return error for malformed URL", () => {
      const legalBasis = [{ url: "not-a-url-at-all", title: "Law 1" }];
      const result = validateLegalBasisUrls(legalBasis);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("invalid URL");
    });
  });

  describe("validateUnitConsistency", () => {
    it("should return valid for different singular and plural", () => {
      const data = {
        unitSingular: "unit",
        unitPlural: "units",
      };
      const result = validateUnitConsistency(data);
      expect(result.valid).toBe(true);
    });

    it("should return error for same singular and plural", () => {
      const data = {
        unitSingular: "unit",
        unitPlural: "unit",
      };
      const result = validateUnitConsistency(data);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("must be different");
    });

    it("should return valid for missing unit fields", () => {
      const data = {};
      const result = validateUnitConsistency(data);
      expect(result.valid).toBe(true);
    });

    it("should return valid for only singular", () => {
      const data = {
        unitSingular: "unit",
      };
      const result = validateUnitConsistency(data);
      expect(result.valid).toBe(true);
    });

    it("should return valid for only plural", () => {
      const data = {
        unitPlural: "units",
      };
      const result = validateUnitConsistency(data);
      expect(result.valid).toBe(true);
    });
  });

  describe("validateCustomIdFormat", () => {
    it("should return valid for null customId", () => {
      const result = validateCustomIdFormat(null);
      expect(result.valid).toBe(true);
    });

    it("should return valid for empty customId", () => {
      const result = validateCustomIdFormat("");
      expect(result.valid).toBe(true);
    });

    it("should return valid for correct format", () => {
      const result = validateCustomIdFormat("VAR-001-001");
      expect(result.valid).toBe(true);
    });

    it("should return valid for format with letters", () => {
      const result = validateCustomIdFormat("VAR-ABC-XYZ");
      expect(result.valid).toBe(true);
    });

    it("should return error for missing prefix", () => {
      const result = validateCustomIdFormat("001-001");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("VAR-XXX-XXX");
    });

    it("should return error for missing first separator", () => {
      const result = validateCustomIdFormat("VAR001-001");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("VAR-XXX-XXX");
    });

    it("should return error for missing second separator", () => {
      const result = validateCustomIdFormat("VAR-001001");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("VAR-XXX-XXX");
    });

    it("should return error for lowercase letters", () => {
      const result = validateCustomIdFormat("var-001-001");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("VAR-XXX-XXX");
    });

    it("should return error for special characters", () => {
      const result = validateCustomIdFormat("VAR-001-001!");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("VAR-XXX-XXX");
    });

    it("should return error for too short segments", () => {
      const result = validateCustomIdFormat("VAR-12-34");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("VAR-XXX-XXX");
    });

    it("should return error for too long segments", () => {
      const result = validateCustomIdFormat("VAR-1234-5678");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("VAR-XXX-XXX");
    });
  });
});
