const VariableFeeRuleService = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/services/admin/variableFeeRule.service");

// Mock the dependencies
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/VariableFeeRule",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Lob",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/PostRequirement",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Violation",
);
jest.mock("../../../../../shared/models/Fee");
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Checklist",
);
jest.mock("../../../../../shared/models/ClaimableDocument");
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/InspectionItem",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/shared/lib/httpClient",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/shared/lib/getUserInfo",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/auditHelpers/variableFeeRuleAuditHelper",
);

const VariableFeeRule = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/VariableFeeRule");
const Lob = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Lob");
const PostRequirement = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/PostRequirement");
const Violation = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Violation");
const Fee = require("../../../../../shared/models/Fee");
const Checklist = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Checklist");
const ClaimableDocument = require("../../../../../shared/models/ClaimableDocument");
const InspectionItem = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/InspectionItem");
const {
  getUserInfo,
} = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/shared/lib/getUserInfo");
const VariableFeeRuleAuditHelper = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/auditHelpers/variableFeeRuleAuditHelper");

// Mock VariableFeeRuleAuditHelper methods
VariableFeeRuleAuditHelper.logCreated = jest.fn().mockResolvedValue();
VariableFeeRuleAuditHelper.logUpdated = jest.fn().mockResolvedValue();
VariableFeeRuleAuditHelper.logDisabled = jest.fn().mockResolvedValue();

describe("VariableFeeRuleService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("list", () => {
    it("should return all variable fee rules when no filters provided", async () => {
      const mockRules = [
        { name: "Rule 1", _id: "1" },
        { name: "Rule 2", _id: "2" },
      ];
      VariableFeeRule.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockRules),
      });

      const result = await VariableFeeRuleService.list({});

      expect(VariableFeeRule.find).toHaveBeenCalledWith({});
      expect(result).toEqual(mockRules);
    });

    it("should filter by isActive", async () => {
      const mockRules = [{ name: "Rule 1", _id: "1" }];
      VariableFeeRule.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockRules),
      });

      await VariableFeeRuleService.list({ isActive: "true" });

      expect(VariableFeeRule.find).toHaveBeenCalledWith({ isActive: true });
    });
  });

  describe("getById", () => {
    it("should throw error for non-existent variable fee rule", async () => {
      const mockQuery = {
        lean: jest.fn().mockResolvedValue(null),
      };
      VariableFeeRule.findById.mockReturnValue(mockQuery);

      await expect(
        VariableFeeRuleService.getById("507f1f77bcf86cd799439011"),
      ).rejects.toThrow("Variable fee rule not found");
      await expect(
        VariableFeeRuleService.getById("507f1f77bcf86cd799439011"),
      ).rejects.toHaveProperty("code", "NOT_FOUND");
      await expect(
        VariableFeeRuleService.getById("507f1f77bcf86cd799439011"),
      ).rejects.toHaveProperty("status", 404);
    });
  });

  describe("create", () => {
    it("should validate missing name", async () => {
      const data = {
        question: "Test question",
        calculationMethod: "floor_area",
        unit: "sqm",
      };

      await expect(
        VariableFeeRuleService.create(data, "userId", {}),
      ).rejects.toThrow(
        "name, question, calculationMethod, and unit are required",
      );
      await expect(
        VariableFeeRuleService.create(data, "userId", {}),
      ).rejects.toHaveProperty("code", "VALIDATION_ERROR");
    });

    it("should validate missing question", async () => {
      const data = {
        name: "Test Rule",
        calculationMethod: "floor_area",
        unit: "sqm",
      };

      await expect(
        VariableFeeRuleService.create(data, "userId", {}),
      ).rejects.toThrow(
        "name, question, calculationMethod, and unit are required",
      );
    });

    it("should validate missing calculationMethod", async () => {
      const data = {
        name: "Test Rule",
        question: "Test question",
        unit: "sqm",
      };

      await expect(
        VariableFeeRuleService.create(data, "userId", {}),
      ).rejects.toThrow(
        "name, question, calculationMethod, and unit are required",
      );
    });

    it("should validate missing unit", async () => {
      const data = {
        name: "Test Rule",
        question: "Test question",
        calculationMethod: "floor_area",
      };

      await expect(
        VariableFeeRuleService.create(data, "userId", {}),
      ).rejects.toThrow(
        "name, question, calculationMethod, and unit are required",
      );
    });

    it("should validate customCalculationMethod required for custom", async () => {
      const data = {
        name: "Test Rule",
        question: "Test question",
        calculationMethod: "custom",
        unit: "sqm",
      };

      await expect(
        VariableFeeRuleService.create(data, "userId", {}),
      ).rejects.toThrow(
        "customCalculationMethod is required when calculationMethod is 'custom'",
      );
    });

    it("should validate brackets required for bracketed", async () => {
      const data = {
        name: "Test Rule",
        question: "Test question",
        calculationMethod: "bracketed",
        unit: "sqm",
      };

      await expect(
        VariableFeeRuleService.create(data, "userId", {}),
      ).rejects.toThrow(
        "brackets are required when calculationMethod is 'bracketed'",
      );
    });

    it("should validate classifications required for classification", async () => {
      const data = {
        name: "Test Rule",
        question: "Test question",
        calculationMethod: "classification",
        unit: "sqm",
      };

      await expect(
        VariableFeeRuleService.create(data, "userId", {}),
      ).rejects.toThrow(
        "classifications are required when calculationMethod is 'classification'",
      );
    });

    it("should validate baseRate null for classification", async () => {
      const data = {
        name: "Test Rule",
        question: "Test question",
        calculationMethod: "classification",
        unit: "sqm",
        baseRate: 100,
        classifications: [{ label: "A", value: 50 }],
      };

      await expect(
        VariableFeeRuleService.create(data, "userId", {}),
      ).rejects.toThrow(
        "baseRate should be null when calculationMethod is 'classification'",
      );
    });

    it("should validate baseRate required for other methods", async () => {
      const data = {
        name: "Test Rule",
        question: "Test question",
        calculationMethod: "floor_area",
        unit: "sqm",
      };

      await expect(
        VariableFeeRuleService.create(data, "userId", {}),
      ).rejects.toThrow("baseRate is required for this calculationMethod");
    });

    it("should validate duplicate name across entity types", async () => {
      const data = {
        name: "Test Entity",
        question: "Test question",
        calculationMethod: "floor_area",
        unit: "sqm",
        baseRate: 100,
      };

      // Mock Fee.findOne to return existing entity
      Fee.findOne.mockResolvedValue({ name: "Test Entity" });
      PostRequirement.findOne.mockResolvedValue(null);
      Violation.findOne.mockResolvedValue(null);
      Lob.findOne.mockResolvedValue(null);
      Checklist.findOne.mockResolvedValue(null);
      ClaimableDocument.findOne.mockResolvedValue(null);
      InspectionItem.findOne.mockResolvedValue(null);

      await expect(
        VariableFeeRuleService.create(data, "userId", {}),
      ).rejects.toThrow("Name already exists in Fee");
      await expect(
        VariableFeeRuleService.create(data, "userId", {}),
      ).rejects.toHaveProperty("code", "DUPLICATE_NAME");
    });

    it("should create with valid data when name is unique", async () => {
      const data = {
        name: "Test Variable Fee",
        question: "Test question",
        calculationMethod: "floor_area",
        unit: "sqm",
        baseRate: 100,
      };

      // Mock all findOne calls to return null
      PostRequirement.findOne.mockResolvedValue(null);
      Violation.findOne.mockResolvedValue(null);
      Fee.findOne.mockResolvedValue(null);
      Lob.findOne.mockResolvedValue(null);
      Checklist.findOne.mockResolvedValue(null);
      ClaimableDocument.findOne.mockResolvedValue(null);
      InspectionItem.findOne.mockResolvedValue(null);

      VariableFeeRule.create.mockResolvedValue({
        _id: "507f1f77bcf86cd799439011",
        ...data,
      });
      getUserInfo.mockResolvedValue({ name: "Test User" });

      const result = await VariableFeeRuleService.create(data, "userId", {});

      expect(result).toBeDefined();
      expect(VariableFeeRule.create).toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("should update calculationMethod field", async () => {
      const data = {
        calculationMethod: "percentage",
      };
      const existingRule = {
        _id: "507f1f77bcf86cd799439011",
        name: "Test Rule",
        question: "Test question",
        calculationMethod: "floor_area",
        unit: "sqm",
        baseRate: 100,
        brackets: [],
        classifications: [],
        isActive: true,
        version: 1,
        save: jest.fn().mockResolvedValue(),
      };

      VariableFeeRule.findById.mockResolvedValue(existingRule);
      getUserInfo.mockResolvedValue({ name: "Test User" });

      await VariableFeeRuleService.update(
        "507f1f77bcf86cd799439011",
        data,
        "userId",
        {},
      );

      expect(existingRule.calculationMethod).toBe("percentage");
      expect(existingRule.version).toBe(2);
    });

    it("should update brackets field", async () => {
      const data = {
        brackets: [{ min: 0, max: 100, rate: 10 }],
      };
      const existingRule = {
        _id: "507f1f77bcf86cd799439011",
        name: "Test Rule",
        question: "Test question",
        calculationMethod: "bracketed",
        unit: "sqm",
        baseRate: null,
        brackets: [],
        classifications: [],
        isActive: true,
        version: 1,
        save: jest.fn().mockResolvedValue(),
      };

      VariableFeeRule.findById.mockResolvedValue(existingRule);
      getUserInfo.mockResolvedValue({ name: "Test User" });

      await VariableFeeRuleService.update(
        "507f1f77bcf86cd799439011",
        data,
        "userId",
        {},
      );

      expect(existingRule.brackets).toEqual([{ min: 0, max: 100, rate: 10 }]);
      expect(existingRule.version).toBe(2);
    });

    it("should update classifications field", async () => {
      const data = {
        classifications: [{ label: "A", value: 50 }],
      };
      const existingRule = {
        _id: "507f1f77bcf86cd799439011",
        name: "Test Rule",
        question: "Test question",
        calculationMethod: "classification",
        unit: "sqm",
        baseRate: null,
        brackets: [],
        classifications: [],
        isActive: true,
        version: 1,
        save: jest.fn().mockResolvedValue(),
      };

      VariableFeeRule.findById.mockResolvedValue(existingRule);
      getUserInfo.mockResolvedValue({ name: "Test User" });

      await VariableFeeRuleService.update(
        "507f1f77bcf86cd799439011",
        data,
        "userId",
        {},
      );

      expect(existingRule.classifications).toEqual([{ label: "A", value: 50 }]);
      expect(existingRule.version).toBe(2);
    });

    it("should increment version with changes", async () => {
      const data = {
        name: "Updated Rule",
      };
      const existingRule = {
        _id: "507f1f77bcf86cd799439011",
        name: "Test Rule",
        question: "Test question",
        calculationMethod: "floor_area",
        unit: "sqm",
        baseRate: 100,
        brackets: [],
        classifications: [],
        isActive: true,
        version: 1,
        save: jest.fn().mockResolvedValue(),
      };

      VariableFeeRule.findById.mockResolvedValue(existingRule);
      getUserInfo.mockResolvedValue({ name: "Test User" });

      await VariableFeeRuleService.update(
        "507f1f77bcf86cd799439011",
        data,
        "userId",
        {},
      );

      expect(existingRule.version).toBe(2);
    });
  });

  describe("disable", () => {
    it("should increment version on disable", async () => {
      const existingRule = {
        _id: "507f1f77bcf86cd799439011",
        name: "Test Rule",
        isActive: true,
        version: 1,
        save: jest.fn().mockResolvedValue(),
      };

      VariableFeeRule.findById.mockResolvedValue(existingRule);
      getUserInfo.mockResolvedValue({ name: "Test User" });

      await VariableFeeRuleService.disable(
        "507f1f77bcf86cd799439011",
        "userId",
        {},
      );

      expect(existingRule.isActive).toBe(false);
      expect(existingRule.version).toBe(2);
    });
  });

  describe("getLobs", () => {
    it("should return LOBs using this rule", async () => {
      const mockLobs = [
        {
          _id: "1",
          code: "RET-001",
          name: "Retail",
          category: "RET",
          lineOfBusiness: "Retail",
        },
      ];
      Lob.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockLobs),
      });

      const result = await VariableFeeRuleService.getLobs(
        "507f1f77bcf86cd799439011",
      );

      expect(Lob.find).toHaveBeenCalledWith({
        variableFeeRules: "507f1f77bcf86cd799439011",
        isActive: true,
      });
      expect(result).toEqual(mockLobs);
    });
  });
});
