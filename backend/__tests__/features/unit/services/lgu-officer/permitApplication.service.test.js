const PermitApplicationService = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/services/lgu-officer/permitApplication.service");

// Mock the dependencies
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Application",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/GeneralPermit",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Business",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/User",
);

const Application = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Application");
const GeneralPermit = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/GeneralPermit");
const Business = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Business");
const User = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/User");

describe("PermitApplicationService (LGU Officer)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("listApplications", () => {
    it("should call Application.find with correct filter", async () => {
      const mockApp = {
        toObject: jest.fn().mockReturnValue({}),
      };
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
      };
      Application.find.mockReturnValue(mockQuery);
      Application.countDocuments.mockResolvedValue(1);

      const mockPermitQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
      };
      GeneralPermit.find.mockReturnValue(mockPermitQuery);
      GeneralPermit.countDocuments.mockResolvedValue(0);

      // Need to make the query chain return the array
      mockQuery.skip.mockResolvedValue([mockApp]);
      mockPermitQuery.skip.mockResolvedValue([]);

      await PermitApplicationService.listApplications({});

      expect(Application.find).toHaveBeenCalled();
    });

    it("should filter by status", async () => {
      const mockApp = {
        toObject: jest.fn().mockReturnValue({}),
      };
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
      };
      Application.find.mockReturnValue(mockQuery);
      Application.countDocuments.mockResolvedValue(1);

      const mockPermitQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
      };
      GeneralPermit.find.mockReturnValue(mockPermitQuery);
      GeneralPermit.countDocuments.mockResolvedValue(0);

      mockQuery.skip.mockResolvedValue([mockApp]);
      mockPermitQuery.skip.mockResolvedValue([]);

      await PermitApplicationService.listApplications({ status: "submitted" });

      expect(Application.find).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationStatus: "submitted",
        }),
      );
    });

    it("should handle pagination parameters", async () => {
      const mockApp = {
        toObject: jest.fn().mockReturnValue({}),
      };
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
      };
      Application.find.mockReturnValue(mockQuery);
      Application.countDocuments.mockResolvedValue(1);

      const mockPermitQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
      };
      GeneralPermit.find.mockReturnValue(mockPermitQuery);
      GeneralPermit.countDocuments.mockResolvedValue(0);

      mockQuery.skip.mockResolvedValue([mockApp]);
      mockPermitQuery.skip.mockResolvedValue([]);

      await PermitApplicationService.listApplications({ page: 2, limit: 25 });

      expect(mockQuery.limit).toHaveBeenCalledWith(25);
      expect(mockQuery.skip).toHaveBeenCalledWith(25); // (2-1) * 25
    });
  });

  describe("getApplicationById", () => {
    it("should return application details when found", async () => {
      const mockApp = {
        _id: "507f1f77bcf86cd799439011",
        applicationId: "TEST-001",
        applicationStatus: "submitted",
        toObject: jest.fn().mockReturnValue({
          _id: "507f1f77bcf86cd799439011",
          applicationId: "TEST-001",
          applicationStatus: "submitted",
        }),
      };

      Application.findOne.mockResolvedValue(mockApp);
      User.findById.mockResolvedValue({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      });

      const result = await PermitApplicationService.getApplicationById(
        "507f1f77bcf86cd799439011",
      );

      expect(result).toBeDefined();
      expect(result.applicationId).toBe("TEST-001");
    });

    it("should throw error when application not found", async () => {
      Application.findOne.mockResolvedValue(null);
      Business.findOne.mockResolvedValue(null);
      GeneralPermit.findOne.mockResolvedValue(null);

      await expect(
        PermitApplicationService.getApplicationById("507f1f77bcf86cd799439011"),
      ).rejects.toThrow();
    });
  });
});
