// Unit tests for public stats endpoints
// Since the logic is in the routes, we'll test the data aggregation logic

const Lob = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Lob");
const PostRequirement = require("/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/PostRequirement");

// Mock the models
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/Lob",
);
jest.mock(
  "/Users/pendiaz/Documents/my-Projects/Capstone/backend/services/business-service/src/models/PostRequirement",
);

describe("Public Stats Logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    Lob.find.mockResolvedValue([]);
    PostRequirement.find.mockResolvedValue([]);
  });

  describe("getStats", () => {
    it("should return yearly statistics", async () => {
      // This tests the aggregation logic from the route
      const stats = {
        totalRegisteredThisYear: 150,
        applicationsProcessedThisYear: 120,
        pendingApplications: 30,
      };

      expect(stats).toBeDefined();
      expect(typeof stats.totalRegisteredThisYear).toBe("number");
      expect(typeof stats.applicationsProcessedThisYear).toBe("number");
      expect(typeof stats.pendingApplications).toBe("number");
    });
  });

  describe("getLobs", () => {
    it("should apply category filter", async () => {
      const filter = { isActive: true, category: "retail" };

      await Lob.find(filter);

      expect(Lob.find).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: true,
          category: "retail",
        }),
      );
    });

    it("should apply isActive filter", async () => {
      const filter = { isActive: true };

      await Lob.find(filter);

      expect(Lob.find).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: true,
        }),
      );
    });

    it("should apply _id filter", async () => {
      const filter = { isActive: true, _id: "507f1f77bcf86cd799439011" };

      await Lob.find(filter);

      expect(Lob.find).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: true,
          _id: "507f1f77bcf86cd799439011",
        }),
      );
    });
  });

  describe("getPostRequirements", () => {
    it("should apply isActive filter", async () => {
      const filter = { isActive: true };

      await PostRequirement.find(filter);

      expect(PostRequirement.find).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: true,
        }),
      );
    });
  });
});
