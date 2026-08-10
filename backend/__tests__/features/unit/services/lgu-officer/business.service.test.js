const BusinessService = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/services/lgu-officer/business.service");

// Mock the dependencies
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Business",
);

const Business = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Business");

describe("BusinessService (LGU Officer)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("listBusinesses", () => {
    it("should call Business.find with correct filter", async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
      };
      Business.find.mockReturnValue(mockQuery);
      Business.countDocuments.mockResolvedValue(0);

      await BusinessService.listBusinesses({});

      expect(Business.find).toHaveBeenCalled();
      expect(Business.find).toHaveBeenCalledWith({ businessStatus: "active" });
    });

    it("should filter by search term", async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
      };
      Business.find.mockReturnValue(mockQuery);
      Business.countDocuments.mockResolvedValue(0);

      await BusinessService.listBusinesses({ search: "test" });

      expect(Business.find).toHaveBeenCalled();
    });

    it("should handle pagination", async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
      };
      Business.find.mockReturnValue(mockQuery);
      Business.countDocuments.mockResolvedValue(100);

      const result = await BusinessService.listBusinesses({
        page: 2,
        limit: 25,
      });

      expect(Business.find).toHaveBeenCalled();
      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(25);
    });
  });

  describe("getBusinessById", () => {
    it("should return business by businessId", async () => {
      const mockBusiness = {
        _id: "123",
        businessId: "BIZ-001",
        businessName: "Test Business",
      };
      Business.findOne.mockResolvedValue(mockBusiness);

      const result = await BusinessService.getBusinessById("BIZ-001");

      expect(Business.findOne).toHaveBeenCalledWith({
        $or: [{ businessId: "BIZ-001" }, { _id: "BIZ-001" }],
      });
      expect(result.business).toEqual(mockBusiness);
    });

    it("should return business by _id", async () => {
      const mockBusiness = {
        _id: "123",
        businessId: "BIZ-001",
        businessName: "Test Business",
      };
      Business.findOne.mockResolvedValue(mockBusiness);

      const result = await BusinessService.getBusinessById("123");

      expect(Business.findOne).toHaveBeenCalledWith({
        $or: [{ businessId: "123" }, { _id: "123" }],
      });
      expect(result.business).toEqual(mockBusiness);
    });

    it("should throw error when not found", async () => {
      Business.findOne.mockResolvedValue(null);

      await expect(
        BusinessService.getBusinessById("507f1f77bcf86cd799439011"),
      ).rejects.toThrow("Business not found");
    });
  });
});
