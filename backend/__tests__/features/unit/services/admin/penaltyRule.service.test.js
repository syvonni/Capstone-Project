const PenaltyRuleService = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/services/admin/penaltyRule.service");

// Mock the dependencies
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/PenaltyRule",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/shared/lib/httpClient",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/shared/lib/getUserInfo",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/auditHelpers/penaltyRuleAuditHelper",
);

const PenaltyRule = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/PenaltyRule");
const {
  getUserInfo,
} = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/shared/lib/getUserInfo");
const PenaltyRuleAuditHelper = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/auditHelpers/penaltyRuleAuditHelper");

// Mock PenaltyRuleAuditHelper methods
PenaltyRuleAuditHelper.logCreated = jest.fn().mockResolvedValue();
PenaltyRuleAuditHelper.logUpdated = jest.fn().mockResolvedValue();

describe("PenaltyRuleService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("list", () => {
    it("should return all penalty rules when no filters provided", async () => {
      const mockPenaltyRules = [
        { name: "Rule 1", _id: "1" },
        { name: "Rule 2", _id: "2" },
      ];
      PenaltyRule.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockPenaltyRules),
      });

      const result = await PenaltyRuleService.list({});

      expect(PenaltyRule.find).toHaveBeenCalledWith({});
      expect(result).toEqual(mockPenaltyRules);
    });

    it("should filter by category", async () => {
      const mockPenaltyRules = [{ name: "Rule 1", _id: "1" }];
      PenaltyRule.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockPenaltyRules),
      });

      await PenaltyRuleService.list({ category: "late_fee" });

      expect(PenaltyRule.find).toHaveBeenCalledWith({ category: "late_fee" });
    });

    it("should filter by isActive", async () => {
      const mockPenaltyRules = [{ name: "Rule 1", _id: "1" }];
      PenaltyRule.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockPenaltyRules),
      });

      await PenaltyRuleService.list({ isActive: "true" });

      expect(PenaltyRule.find).toHaveBeenCalledWith({ isActive: true });
    });
  });

  describe("getById", () => {
    it("should throw error for invalid ID", async () => {
      const mockQuery = {
        lean: jest.fn().mockResolvedValue(null),
      };
      PenaltyRule.findById.mockReturnValue(mockQuery);

      await expect(
        PenaltyRuleService.getById("507f1f77bcf86cd799439011"),
      ).rejects.toThrow("Penalty rule not found");
      await expect(
        PenaltyRuleService.getById("507f1f77bcf86cd799439011"),
      ).rejects.toHaveProperty("code", "NOT_FOUND");
      await expect(
        PenaltyRuleService.getById("507f1f77bcf86cd799439011"),
      ).rejects.toHaveProperty("status", 404);
    });
  });
});
