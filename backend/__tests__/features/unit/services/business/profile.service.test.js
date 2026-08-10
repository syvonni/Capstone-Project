const ProfileService = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/services/business/profile.service");

// Mock the dependencies
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/services/businessProfileService",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/services/statusTransitionService",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/services/business/fileUpload.service",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/services/business/pdfGeneration.service",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/pdfService",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/lib/logger",
);

const businessProfileService = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/services/businessProfileService");
const statusTransitionService = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/services/statusTransitionService");
businessProfileService.getProfile = jest.fn();
businessProfileService.updateStep = jest.fn();
businessProfileService.deleteProfile = jest.fn();
statusTransitionService.getStatusTransitionMatrix = jest.fn();
statusTransitionService.getValidTransitions = jest.fn();
statusTransitionService.validateStatusTransition = jest.fn();
statusTransitionService.executeStatusTransition = jest.fn();

describe("ProfileService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getProfile", () => {
    it("should call businessProfileService.getProfile with userId", async () => {
      const mockProfile = { name: "Test Business", _id: "123" };
      businessProfileService.getProfile.mockResolvedValue(mockProfile);

      const result = await ProfileService.getProfile("user123");

      expect(businessProfileService.getProfile).toHaveBeenCalledWith("user123");
      expect(result).toEqual(mockProfile);
    });
  });

  describe("getStatusTransitionMatrix", () => {
    it("should call statusTransitionService.getStatusTransitionMatrix", async () => {
      const mockMatrix = { draft: ["submitted"], submitted: ["approved"] };
      statusTransitionService.getStatusTransitionMatrix.mockResolvedValue(
        mockMatrix,
      );

      const result = await ProfileService.getStatusTransitionMatrix();

      expect(
        statusTransitionService.getStatusTransitionMatrix,
      ).toHaveBeenCalled();
      expect(result).toEqual(mockMatrix);
    });
  });

  describe("updateStep", () => {
    it("should validate step data", async () => {
      const mockReq = { ip: "127.0.0.1", headers: { "user-agent": "test" } };
      businessProfileService.updateStep.mockResolvedValue({ success: true });

      const result = await ProfileService.updateStep(
        "user123",
        2,
        { test: "data" },
        mockReq,
      );

      expect(businessProfileService.updateStep).toHaveBeenCalledWith(
        "user123",
        2,
        { test: "data" },
        { ip: "127.0.0.1", userAgent: "test" },
      );
      expect(result).toEqual({ success: true });
    });

    it("should throw error when step is missing", async () => {
      await expect(
        ProfileService.updateStep("user123", null, { test: "data" }, {}),
      ).rejects.toThrow("Step and data are required");
    });
  });

  describe("deleteProfile", () => {
    it("should call businessProfileService.deleteProfile", async () => {
      businessProfileService.deleteProfile.mockResolvedValue({ success: true });

      const result = await ProfileService.deleteProfile("user123");

      expect(businessProfileService.deleteProfile).toHaveBeenCalledWith(
        "user123",
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe("getValidTransitions", () => {
    it("should return valid transitions for business", async () => {
      const mockTransitions = ["submitted", "cancelled"];
      statusTransitionService.getValidTransitions.mockResolvedValue(
        mockTransitions,
      );

      const result = await ProfileService.getValidTransitions(
        "user123",
        "businessId123",
      );

      expect(statusTransitionService.getValidTransitions).toHaveBeenCalledWith(
        "user123",
        "businessId123",
      );
      expect(result).toEqual(mockTransitions);
    });
  });

  describe("validateStatusTransition", () => {
    it("should validate transition is allowed", async () => {
      const mockValidation = { valid: true, message: "" };
      statusTransitionService.validateStatusTransition.mockResolvedValue(
        mockValidation,
      );

      const result = await ProfileService.validateStatusTransition(
        "user123",
        "businessId123",
        "submitted",
        "reason",
        "actorId",
      );

      expect(
        statusTransitionService.validateStatusTransition,
      ).toHaveBeenCalledWith(
        "user123",
        "businessId123",
        "submitted",
        "reason",
        "actorId",
      );
      expect(result.valid).toBe(true);
    });

    it("should throw error when newStatus is missing", async () => {
      await expect(
        ProfileService.validateStatusTransition(
          "user123",
          "businessId123",
          null,
          "reason",
          "actorId",
        ),
      ).rejects.toThrow("New status is required");
    });
  });

  describe("executeStatusTransition", () => {
    it("should execute status transition", async () => {
      const mockResult = { success: true, newStatus: "submitted" };
      statusTransitionService.executeStatusTransition.mockResolvedValue(
        mockResult,
      );

      const result = await ProfileService.executeStatusTransition(
        "user123",
        "businessId123",
        "submitted",
        {},
      );

      expect(
        statusTransitionService.executeStatusTransition,
      ).toHaveBeenCalledWith("user123", "businessId123", "submitted", {});
      expect(result.newStatus).toBe("submitted");
    });

    it("should throw error when newStatus is missing", async () => {
      await expect(
        ProfileService.executeStatusTransition(
          "user123",
          "businessId123",
          null,
          {},
        ),
      ).rejects.toThrow("New status is required");
    });
  });
});
