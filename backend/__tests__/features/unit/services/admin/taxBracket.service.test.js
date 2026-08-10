const TaxBracketService = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/services/admin/taxBracket.service");

// Mock the dependencies
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/TaxBracket",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Lob",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/shared/lib/getUserInfo",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/auditHelpers/taxBracketAuditHelper",
);

const TaxBracket = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/TaxBracket");
const Lob = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Lob");
const {
  getUserInfo,
} = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/shared/lib/getUserInfo");
const TaxBracketAuditHelper = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/auditHelpers/taxBracketAuditHelper");

// Mock TaxBracketAuditHelper methods
TaxBracketAuditHelper.logCreated = jest.fn().mockResolvedValue();
TaxBracketAuditHelper.logUpdated = jest.fn().mockResolvedValue();
TaxBracketAuditHelper.logDeleted = jest.fn().mockResolvedValue();

// Mock getUserInfo
getUserInfo.mockResolvedValue({
  _id: "507f1f77bcf86cd799439011",
  email: "admin@example.com",
  role: "admin",
});

describe("TaxBracketService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("list", () => {
    it("should return all tax brackets when no filters provided", async () => {
      const mockBrackets = [
        { name: "Bracket 1", _id: "1" },
        { name: "Bracket 2", _id: "2" },
      ];
      TaxBracket.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockBrackets),
        }),
      });

      const result = await TaxBracketService.list({});

      expect(TaxBracket.find).toHaveBeenCalledWith({});
      expect(result).toEqual(mockBrackets);
    });

    it("should filter by taxBasis", async () => {
      const mockBrackets = [{ name: "Bracket 1", _id: "1" }];
      TaxBracket.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockBrackets),
        }),
      });

      await TaxBracketService.list({ taxBasis: "gross_sales" });

      expect(TaxBracket.find).toHaveBeenCalledWith({ taxBasis: "gross_sales" });
    });

    it("should filter by isActive", async () => {
      const mockBrackets = [{ name: "Bracket 1", _id: "1" }];
      TaxBracket.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockBrackets),
        }),
      });

      await TaxBracketService.list({ isActive: "true" });

      expect(TaxBracket.find).toHaveBeenCalledWith({ isActive: true });
    });
  });

  describe("getById", () => {
    it("should return tax bracket by valid ID", async () => {
      const mockBracket = {
        name: "Test Bracket",
        _id: "507f1f77bcf86cd799439011",
      };
      TaxBracket.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockBracket),
      });

      const result = await TaxBracketService.getById(
        "507f1f77bcf86cd799439011",
      );

      expect(TaxBracket.findById).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439011",
      );
      expect(result).toEqual(mockBracket);
    });

    it("should throw error when tax bracket not found", async () => {
      TaxBracket.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(
        TaxBracketService.getById("507f1f77bcf86cd799439011"),
      ).rejects.toThrow("Tax bracket not found");
      await expect(
        TaxBracketService.getById("507f1f77bcf86cd799439011"),
      ).rejects.toHaveProperty("code", "NOT_FOUND");
      await expect(
        TaxBracketService.getById("507f1f77bcf86cd799439011"),
      ).rejects.toHaveProperty("status", 404);
    });
  });

  describe("create", () => {
    it("should validate missing lobId", async () => {
      const data = {
        taxBasis: "gross_sales",
        name: "Test Tax Bracket",
        minValue: 0,
        maxValue: 10000,
        fixedAmount: 100,
      };

      await expect(
        TaxBracketService.create(data, "userId", {}),
      ).rejects.toThrow();
    });

    it("should validate missing taxBasis", async () => {
      const data = {
        lobId: "507f1f77bcf86cd799439011",
        name: "Test Tax Bracket",
        minValue: 0,
        maxValue: 10000,
        fixedAmount: 100,
      };

      await expect(
        TaxBracketService.create(data, "userId", {}),
      ).rejects.toThrow();
    });

    it("should validate missing minValue", async () => {
      const data = {
        lobId: "507f1f77bcf86cd799439011",
        taxBasis: "gross_sales",
        name: "Test Tax Bracket",
        maxValue: 10000,
        fixedAmount: 100,
      };

      await expect(
        TaxBracketService.create(data, "userId", {}),
      ).rejects.toThrow();
    });

    it("should validate missing maxValue", async () => {
      const data = {
        lobId: "507f1f77bcf86cd799439011",
        taxBasis: "gross_sales",
        name: "Test Tax Bracket",
        minValue: 0,
        fixedAmount: 100,
      };

      await expect(
        TaxBracketService.create(data, "userId", {}),
      ).rejects.toThrow();
    });

    it("should validate missing fixedAmount", async () => {
      const data = {
        lobId: "507f1f77bcf86cd799439011",
        taxBasis: "gross_sales",
        name: "Test Tax Bracket",
        minValue: 0,
        maxValue: 10000,
      };

      await expect(
        TaxBracketService.create(data, "userId", {}),
      ).rejects.toThrow();
    });

    it("should create with valid data", async () => {
      const data = {
        lobId: "507f1f77bcf86cd799439011",
        taxBasis: "gross_sales",
        name: "Test Tax Bracket",
        minValue: 0,
        maxValue: 10000,
        fixedAmount: 100,
      };

      Lob.findById.mockResolvedValue({ _id: "507f1f77bcf86cd799439011" });
      TaxBracket.create.mockResolvedValue({ _id: "1", ...data });

      await TaxBracketService.create(data, "userId", {});

      expect(TaxBracket.create).toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("should update name field", async () => {
      const mockBracket = {
        _id: "507f1f77bcf86cd799439011",
        name: "Test Tax Bracket",
        taxBasis: "gross_sales",
        minValue: 0,
        maxValue: 10000,
        fixedAmount: 100,
        save: jest.fn().mockResolvedValue({}),
      };

      TaxBracket.findById.mockResolvedValue(mockBracket);

      await TaxBracketService.update(
        "507f1f77bcf86cd799439011",
        { name: "Updated Tax Bracket" },
        "userId",
        {},
      );

      expect(mockBracket.save).toHaveBeenCalled();
    });

    it("should update minValue field", async () => {
      const mockBracket = {
        _id: "507f1f77bcf86cd799439011",
        name: "Test Tax Bracket",
        taxBasis: "gross_sales",
        minValue: 0,
        maxValue: 10000,
        fixedAmount: 100,
        save: jest.fn().mockResolvedValue({}),
      };

      TaxBracket.findById.mockResolvedValue(mockBracket);

      await TaxBracketService.update(
        "507f1f77bcf86cd799439011",
        { minValue: 5000 },
        "userId",
        {},
      );

      expect(mockBracket.save).toHaveBeenCalled();
    });

    it("should update maxValue field", async () => {
      const mockBracket = {
        _id: "507f1f77bcf86cd799439011",
        name: "Test Tax Bracket",
        taxBasis: "gross_sales",
        minValue: 0,
        maxValue: 10000,
        fixedAmount: 100,
        save: jest.fn().mockResolvedValue({}),
      };

      TaxBracket.findById.mockResolvedValue(mockBracket);

      await TaxBracketService.update(
        "507f1f77bcf86cd799439011",
        { maxValue: 20000 },
        "userId",
        {},
      );

      expect(mockBracket.save).toHaveBeenCalled();
    });

    it("should update fixedAmount field", async () => {
      const mockBracket = {
        _id: "507f1f77bcf86cd799439011",
        name: "Test Tax Bracket",
        taxBasis: "gross_sales",
        minValue: 0,
        maxValue: 10000,
        fixedAmount: 100,
        save: jest.fn().mockResolvedValue({}),
      };

      TaxBracket.findById.mockResolvedValue(mockBracket);

      await TaxBracketService.update(
        "507f1f77bcf86cd799439011",
        { fixedAmount: 150 },
        "userId",
        {},
      );

      expect(mockBracket.save).toHaveBeenCalled();
    });

    it("should increment version with changes", async () => {
      const mockBracket = {
        _id: "507f1f77bcf86cd799439011",
        name: "Test Tax Bracket",
        taxBasis: "gross_sales",
        minValue: 0,
        maxValue: 10000,
        fixedAmount: 100,
        version: 1,
        save: jest.fn().mockImplementation(function () {
          this.name = "Updated Tax Bracket";
          this.version = 2;
          return Promise.resolve(this);
        }),
      };

      TaxBracket.findById.mockResolvedValue(mockBracket);

      await TaxBracketService.update(
        "507f1f77bcf86cd799439011",
        { name: "Updated Tax Bracket" },
        "userId",
        {},
      );

      expect(mockBracket.version).toBe(2);
    });
  });

  describe("disable", () => {
    it("should check already-disabled", async () => {
      const mockBracket = {
        _id: "507f1f77bcf86cd799439011",
        name: "Test Tax Bracket",
        taxBasis: "gross_sales",
        minValue: 0,
        maxValue: 10000,
        fixedAmount: 100,
        isActive: false,
      };

      TaxBracket.findById.mockResolvedValue(mockBracket);

      await expect(
        TaxBracketService.disable("507f1f77bcf86cd799439011", "userId", {}),
      ).rejects.toThrow();
    });

    it("should increment version on disable", async () => {
      const mockBracket = {
        _id: "507f1f77bcf86cd799439011",
        name: "Test Tax Bracket",
        taxBasis: "gross_sales",
        minValue: 0,
        maxValue: 10000,
        fixedAmount: 100,
        isActive: true,
        version: 1,
        save: jest.fn().mockImplementation(function () {
          this.isActive = false;
          this.version = 2;
          return Promise.resolve(this);
        }),
      };

      TaxBracket.findById.mockResolvedValue(mockBracket);

      await TaxBracketService.disable("507f1f77bcf86cd799439011", "userId", {});

      expect(mockBracket.version).toBe(2);
    });
  });
});
