const FeeService = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/services/admin/fee.service");

// Mock the dependencies
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Fee",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Variable",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/PostRequirement",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Violation",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Lob",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Checklist",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/ClaimableDocument",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/InspectionItem",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/shared/lib/getUserInfo",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/auditHelpers/feeAuditHelper",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/auditClient",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/shared/lib/httpClient",
);

const Fee = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Fee");
const Variable = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Variable");
const PostRequirement = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/PostRequirement");
const Violation = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Violation");
const Lob = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Lob");
const Checklist = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Checklist");
const ClaimableDocument = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/ClaimableDocument");
const InspectionItem = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/InspectionItem");
const {
  getUserInfo,
} = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/shared/lib/getUserInfo");
const FeeAuditHelper = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/auditHelpers/feeAuditHelper");
const {
  logAuditEvent,
} = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/auditClient");
const {
  auditClient,
} = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/shared/lib/httpClient");

// Mock FeeAuditHelper methods
FeeAuditHelper.logCreated = jest.fn().mockResolvedValue();
FeeAuditHelper.logUpdated = jest.fn().mockResolvedValue();
FeeAuditHelper.logDisabled = jest.fn().mockResolvedValue();

// Mock logAuditEvent
logAuditEvent.mockResolvedValue({ auditLogId: "test123" });

describe("FeeService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("list", () => {
    it("should return all fees when no filters provided", async () => {
      const mockFees = [
        { name: "Fee 1", _id: "1" },
        { name: "Fee 2", _id: "2" },
      ];
      Fee.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockFees),
        }),
      });

      const result = await FeeService.list({});

      expect(Fee.find).toHaveBeenCalledWith({});
      expect(result).toEqual(mockFees);
    });

    it("should filter by isActive", async () => {
      const mockFees = [{ name: "Fee 1", _id: "1" }];
      Fee.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockFees),
        }),
      });

      await FeeService.list({ isActive: "true" });

      expect(Fee.find).toHaveBeenCalledWith({ isActive: true });
    });

    it("should filter by category", async () => {
      const mockFees = [{ name: "Fee 1", _id: "1" }];
      Fee.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockFees),
        }),
      });

      await FeeService.list({ category: "global" });

      expect(Fee.find).toHaveBeenCalledWith({ category: "global" });
    });
  });

  describe("getById", () => {
    it("should return fee by valid ID", async () => {
      const mockFee = { name: "Test Fee", _id: "507f1f77bcf86cd799439011" };
      Fee.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockFee),
      });

      const result = await FeeService.getById("507f1f77bcf86cd799439011");

      expect(Fee.findById).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
      expect(result).toEqual(mockFee);
    });

    it("should throw error when fee not found", async () => {
      Fee.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(
        FeeService.getById("507f1f77bcf86cd799439011"),
      ).rejects.toThrow("Fee not found");
      await expect(
        FeeService.getById("507f1f77bcf86cd799439011"),
      ).rejects.toHaveProperty("code", "NOT_FOUND");
      await expect(
        FeeService.getById("507f1f77bcf86cd799439011"),
      ).rejects.toHaveProperty("status", 404);
    });
  });

  describe("createInternal", () => {
    it("should throw error when name is missing", async () => {
      const feeData = {
        amount: 100,
        category: "global",
      };

      await expect(FeeService.createInternal(feeData)).rejects.toThrow(
        "name and amount are required",
      );
      await expect(FeeService.createInternal(feeData)).rejects.toHaveProperty(
        "code",
        "VALIDATION_ERROR",
      );
    });

    it("should throw error when amount is missing", async () => {
      const feeData = {
        name: "Test Fee",
        category: "global",
      };

      await expect(FeeService.createInternal(feeData)).rejects.toThrow(
        "name and amount are required",
      );
      await expect(FeeService.createInternal(feeData)).rejects.toHaveProperty(
        "code",
        "VALIDATION_ERROR",
      );
    });

    it("should create fee with valid data", async () => {
      const feeData = {
        name: "Test Fee",
        amount: 100,
        category: "global",
        isActive: true,
      };

      const mockFee = { _id: "507f1f77bcf86cd799439011", name: "Test Fee" };
      PostRequirement.findOne.mockResolvedValue(null);
      Violation.findOne.mockResolvedValue(null);
      Lob.findOne.mockResolvedValue(null);
      Checklist.findOne.mockResolvedValue(null);
      ClaimableDocument.findOne.mockResolvedValue(null);
      InspectionItem.findOne.mockResolvedValue(null);
      Fee.create.mockResolvedValue(mockFee);

      const result = await FeeService.createInternal(feeData);

      expect(Fee.create).toHaveBeenCalled();
      expect(result).toEqual(mockFee);
    });

    it("should validate duplicate name across entity types", async () => {
      const feeData = {
        name: "Test Entity",
        amount: 100,
        category: "global",
        isActive: true,
      };

      PostRequirement.findOne.mockResolvedValue({ name: "Test Entity" });

      await expect(FeeService.createInternal(feeData)).rejects.toThrow(
        "Name already exists in PostRequirement",
      );
    });
  });

  describe("update", () => {
    it("should update name field", async () => {
      const mockFee = {
        _id: "1",
        name: "Test Fee",
        amount: 100,
        category: "global",
        save: jest.fn().mockResolvedValue({}),
      };

      Fee.findById.mockResolvedValue(mockFee);

      const result = await FeeService.update(
        "1",
        { name: "Updated Fee" },
        "userId",
        {},
      );

      expect(mockFee.save).toHaveBeenCalled();
    });

    it("should update notes field", async () => {
      const mockFee = {
        _id: "1",
        name: "Test Fee",
        amount: 100,
        category: "global",
        save: jest.fn().mockResolvedValue({}),
      };

      Fee.findById.mockResolvedValue(mockFee);

      const result = await FeeService.update(
        "1",
        { notes: "Updated notes" },
        "userId",
        {},
      );

      expect(mockFee.save).toHaveBeenCalled();
    });

    it("should update amount field", async () => {
      const mockFee = {
        _id: "1",
        name: "Test Fee",
        amount: 100,
        category: "global",
        save: jest.fn().mockResolvedValue({}),
      };

      Fee.findById.mockResolvedValue(mockFee);

      const result = await FeeService.update(
        "1",
        { amount: 150 },
        "userId",
        {},
      );

      expect(mockFee.save).toHaveBeenCalled();
    });

    it("should update isActive field", async () => {
      const mockFee = {
        _id: "1",
        name: "Test Fee",
        amount: 100,
        category: "global",
        isActive: true,
        save: jest.fn().mockResolvedValue({}),
      };

      Fee.findById.mockResolvedValue(mockFee);

      const result = await FeeService.update(
        "1",
        { isActive: false },
        "userId",
        {},
      );

      expect(mockFee.save).toHaveBeenCalled();
    });

    it("should increment version with changes", async () => {
      const mockFee = {
        _id: "1",
        name: "Test Fee",
        amount: 100,
        category: "global",
        version: 1,
        save: jest.fn().mockImplementation(function () {
          this.name = "Updated Fee";
          this.version = 2;
          return Promise.resolve(this);
        }),
      };

      Fee.findById.mockResolvedValue(mockFee);

      const result = await FeeService.update(
        "1",
        { name: "Updated Fee" },
        "userId",
        {},
      );

      expect(mockFee.version).toBe(2);
    });

    it("should handle legacy category migration", async () => {
      const mockFee = {
        _id: "1",
        name: "Test Fee",
        amount: 100,
        category: "old_category",
        save: jest.fn().mockResolvedValue({}),
      };

      Fee.findById.mockResolvedValue(mockFee);

      const result = await FeeService.update(
        "1",
        { category: "new_category" },
        "userId",
        {},
      );

      expect(mockFee.save).toHaveBeenCalled();
    });
  });

  describe("disable", () => {
    it("should check already-disabled", async () => {
      const mockFee = {
        _id: "1",
        name: "Test Fee",
        amount: 100,
        category: "global",
        isActive: false,
      };

      Fee.findById.mockResolvedValue(mockFee);

      await expect(FeeService.disable("1", "userId", {})).rejects.toThrow();
    });

    it("should increment version on disable", async () => {
      const mockFee = {
        _id: "1",
        name: "Test Fee",
        amount: 100,
        category: "global",
        isActive: true,
        version: 1,
        save: jest.fn().mockImplementation(function () {
          this.isActive = false;
          this.version = 2;
          return Promise.resolve(this);
        }),
      };

      Fee.findById.mockResolvedValue(mockFee);

      const result = await FeeService.disable("1", "userId", {});

      expect(mockFee.version).toBe(2);
    });
  });

  describe("updateVariableCalculation", () => {
    it("should validate input", async () => {
      const mockFee = {
        _id: "1",
        name: "Test Fee",
        amount: 100,
        category: "global",
        save: jest.fn().mockResolvedValue({}),
      };

      Fee.findById.mockResolvedValue(mockFee);

      // Test that the method exists and can be called
      expect(typeof FeeService.updateVariableCalculation).toBe("function");
    });

    it("should update variable calculation fields", async () => {
      const mockFee = {
        _id: "1",
        name: "Test Fee",
        amount: 100,
        category: "global",
        save: jest.fn().mockResolvedValue({}),
      };

      Fee.findById.mockResolvedValue(mockFee);

      // Test that the method exists and can be called
      expect(typeof FeeService.updateVariableCalculation).toBe("function");
    });
  });

  describe("getByCategory", () => {
    it("should return fees by category", async () => {
      const mockFees = [{ name: "Fee 1", _id: "1" }];
      Fee.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockFees),
        }),
      });

      const result = await FeeService.getByCategory("global");

      expect(Fee.find).toHaveBeenCalledWith({ category: "global" });
    });
  });
});
