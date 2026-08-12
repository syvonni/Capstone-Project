// Mock the dependencies
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Variable",
);
jest.mock("../../../../../shared/models/Fee");
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/shared/lib/getUserInfo",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/auditHelpers/variableAuditHelper",
);

const VariableService = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/services/admin/variable.service");

const Variable = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Variable");
const {
  getUserInfo,
} = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/shared/lib/getUserInfo");
const VariableAuditHelper = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/auditHelpers/variableAuditHelper");

// Mock VariableAuditHelper methods
VariableAuditHelper.logCreated = jest.fn().mockResolvedValue();
VariableAuditHelper.logUpdated = jest.fn().mockResolvedValue();
VariableAuditHelper.logDisabled = jest.fn().mockResolvedValue();

// Mock validators
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/variableValidators",
  () => ({
    validateBrackets: jest.fn().mockReturnValue({ valid: true }),
    validateClassifications: jest.fn().mockReturnValue({ valid: true }),
    validateCalculationMethod: jest.fn().mockReturnValue({ valid: true }),
    validateStringLengths: jest.fn().mockReturnValue({ valid: true }),
    validateLegalBasisUrls: jest.fn().mockReturnValue({ valid: true }),
    validateUnitConsistency: jest.fn().mockReturnValue({ valid: true }),
    validateCustomIdFormat: jest.fn().mockReturnValue({ valid: true }),
  }),
);

describe("VariableService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("list", () => {
    it("should return all variables when no filters provided", async () => {
      const mockVariables = [
        { name: "Variable 1", _id: "1" },
        { name: "Variable 2", _id: "2" },
      ];
      Variable.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockVariables),
      });

      const result = await VariableService.list({});

      expect(Variable.find).toHaveBeenCalledWith({});
      expect(result).toEqual(mockVariables);
    });

    it("should filter by calculationMethod", async () => {
      const mockVariables = [{ name: "Variable 1", _id: "1" }];
      Variable.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockVariables),
      });

      await VariableService.list({ calculationMethod: "per_unit" });

      expect(Variable.find).toHaveBeenCalledWith({
        calculationMethod: "per_unit",
      });
    });

    it("should filter by isActive", async () => {
      const mockVariables = [{ name: "Variable 1", _id: "1" }];
      Variable.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockVariables),
      });

      await VariableService.list({ isActive: "true" });

      expect(Variable.find).toHaveBeenCalledWith({ isActive: true });
    });

    it("should filter by categories", async () => {
      const mockVariables = [{ name: "Variable 1", _id: "1" }];
      Variable.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockVariables),
      });

      await VariableService.list({ categories: "cat1,cat2" });

      expect(Variable.find).toHaveBeenCalledWith({
        categories: { $in: ["cat1", "cat2"] },
      });
    });
  });

  describe("getById", () => {
    it("should return variable by valid ID", async () => {
      const mockVariable = {
        name: "Test Variable",
        _id: "507f1f77bcf86cd799439011",
      };
      Variable.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockVariable),
      });

      const result = await VariableService.getById("507f1f77bcf86cd799439011");

      expect(Variable.findById).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011",
      );
      expect(result).toEqual(mockVariable);
    });

    it("should throw error for invalid ID", async () => {
      await expect(VariableService.getById("invalid-id")).rejects.toThrow(
        "Invalid variable ID",
      );
      await expect(
        VariableService.getById("invalid-id"),
      ).rejects.toHaveProperty("code", "INVALID_ID");
      await expect(
        VariableService.getById("invalid-id"),
      ).rejects.toHaveProperty("status", 400);
    });

    it("should throw error when variable not found", async () => {
      Variable.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await expect(
        VariableService.getById("507f1f77bcf86cd799439011"),
      ).rejects.toThrow("Variable not found");
      await expect(
        VariableService.getById("507f1f77bcf86cd799439011"),
      ).rejects.toHaveProperty("code", "NOT_FOUND");
      await expect(
        VariableService.getById("507f1f77bcf86cd799439011"),
      ).rejects.toHaveProperty("status", 404);
    });
  });

  describe("getByFeeId", () => {
    it("should return variables by valid fee ID", async () => {
      const mockVariables = [{ name: "Variable 1", _id: "1" }];
      Variable.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockVariables),
      });

      const result = await VariableService.getByFeeId(
        "507f1f77bcf86cd799439011",
      );

      expect(Variable.find).toHaveBeenCalledWith({
        feeId: "507f1f77bcf86cd799439011",
      });
      expect(result).toEqual(mockVariables);
    });

    it("should throw error for invalid fee ID", async () => {
      await expect(VariableService.getByFeeId("invalid-id")).rejects.toThrow(
        "Invalid fee ID",
      );
      await expect(
        VariableService.getByFeeId("invalid-id"),
      ).rejects.toHaveProperty("code", "INVALID_ID");
      await expect(
        VariableService.getByFeeId("invalid-id"),
      ).rejects.toHaveProperty("status", 400);
    });
  });

  describe("getByVariableFeeRuleId", () => {
    it("should return variables by valid variable fee rule ID", async () => {
      const mockVariables = [{ name: "Variable 1", _id: "1" }];
      Variable.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockVariables),
      });

      const result = await VariableService.getByVariableFeeRuleId(
        "507f1f77bcf86cd799439011",
      );

      expect(Variable.find).toHaveBeenCalledWith({
        variableFeeRuleId: "507f1f77bcf86cd799439011",
      });
      expect(result).toEqual(mockVariables);
    });

    it("should throw error for invalid variable fee rule ID", async () => {
      await expect(
        VariableService.getByVariableFeeRuleId("invalid-id"),
      ).rejects.toThrow("Invalid variable fee rule ID");
      await expect(
        VariableService.getByVariableFeeRuleId("invalid-id"),
      ).rejects.toHaveProperty("code", "INVALID_ID");
      await expect(
        VariableService.getByVariableFeeRuleId("invalid-id"),
      ).rejects.toHaveProperty("status", 400);
    });
  });

  describe("create", () => {
    it("should throw error when name is missing", async () => {
      const variableData = {
        question: "Test question",
        calculationMethod: "per_unit",
        unit: "unit",
        unitSingular: "unit",
        unitPlural: "units",
        unitContextSingular: "per unit",
        unitContextPlural: "per units",
      };

      await expect(
        VariableService.create(variableData, "user123", {}),
      ).rejects.toThrow("Name is required");
      await expect(
        VariableService.create(variableData, "user123", {}),
      ).rejects.toHaveProperty("code", "VALIDATION_ERROR");
    });

    it("should throw error when question is missing", async () => {
      const variableData = {
        name: "Test Variable",
        calculationMethod: "per_unit",
        unit: "unit",
        unitSingular: "unit",
        unitPlural: "units",
        unitContextSingular: "per unit",
        unitContextPlural: "per units",
      };

      await expect(
        VariableService.create(variableData, "user123", {}),
      ).rejects.toThrow("Question is required");
    });

    it("should throw error when calculationMethod is missing", async () => {
      const variableData = {
        name: "Test Variable",
        question: "Test question",
        unit: "unit",
        unitSingular: "unit",
        unitPlural: "units",
        unitContextSingular: "per unit",
        unitContextPlural: "per units",
      };

      await expect(
        VariableService.create(variableData, "user123", {}),
      ).rejects.toThrow("Calculation method is required");
    });

    it("should throw error when unit is missing", async () => {
      const variableData = {
        name: "Test Variable",
        question: "Test question",
        calculationMethod: "per_unit",
        unitSingular: "unit",
        unitPlural: "units",
        unitContextSingular: "per unit",
        unitContextPlural: "per units",
      };

      await expect(
        VariableService.create(variableData, "user123", {}),
      ).rejects.toThrow("Unit is required");
    });

    it("should throw error when unitSingular is missing", async () => {
      const variableData = {
        name: "Test Variable",
        question: "Test question",
        calculationMethod: "per_unit",
        unit: "unit",
        unitPlural: "units",
        unitContextSingular: "per unit",
        unitContextPlural: "per units",
      };

      await expect(
        VariableService.create(variableData, "user123", {}),
      ).rejects.toThrow("Unit singular is required");
    });

    it("should throw error when unitPlural is missing", async () => {
      const variableData = {
        name: "Test Variable",
        question: "Test question",
        calculationMethod: "per_unit",
        unit: "unit",
        unitSingular: "unit",
        unitContextSingular: "per unit",
        unitContextPlural: "per units",
      };

      await expect(
        VariableService.create(variableData, "user123", {}),
      ).rejects.toThrow("Unit plural is required");
    });

    it("should throw error when unitContextSingular is missing", async () => {
      const variableData = {
        name: "Test Variable",
        question: "Test question",
        calculationMethod: "per_unit",
        unit: "unit",
        unitSingular: "unit",
        unitPlural: "units",
        unitContextPlural: "per units",
      };

      await expect(
        VariableService.create(variableData, "user123", {}),
      ).rejects.toThrow("Unit context singular is required");
    });

    it("should throw error when unitContextPlural is missing", async () => {
      const variableData = {
        name: "Test Variable",
        question: "Test question",
        calculationMethod: "per_unit",
        unit: "unit",
        unitSingular: "unit",
        unitPlural: "units",
        unitContextSingular: "per unit",
      };

      await expect(
        VariableService.create(variableData, "user123", {}),
      ).rejects.toThrow("Unit context plural is required");
    });

    it("should throw error for duplicate name", async () => {
      const variableData = {
        name: "Test Variable",
        question: "Test question",
        calculationMethod: "per_unit",
        unit: "unit",
        unitSingular: "unit",
        unitPlural: "units",
        unitContextSingular: "per unit",
        unitContextPlural: "per units",
      };

      Variable.findOne.mockResolvedValue({
        name: "Test Variable",
      });

      await expect(
        VariableService.create(variableData, "user123", {}),
      ).rejects.toThrow("Variable with this name already exists");
      await expect(
        VariableService.create(variableData, "user123", {}),
      ).rejects.toHaveProperty("code", "DUPLICATE");
    });

    it("should create variable with valid data", async () => {
      const variableData = {
        name: "Test Variable",
        question: "Test question",
        calculationMethod: "per_unit",
        unit: "unit",
        unitSingular: "unit",
        unitPlural: "units",
        unitContextSingular: "per unit",
        unitContextPlural: "per units",
      };

      Variable.findOne.mockResolvedValue(null);

      const mockVariable = {
        _id: "507f1f77bcf86cd799439011",
        name: "Test Variable",
      };
      Variable.create.mockResolvedValue(mockVariable);
      getUserInfo.mockResolvedValue({
        userId: "user123",
        officeId: "office123",
      });

      const result = await VariableService.create(variableData, "user123", {});

      expect(Variable.create).toHaveBeenCalled();
      expect(result).toEqual(mockVariable);
    });
  });
});
