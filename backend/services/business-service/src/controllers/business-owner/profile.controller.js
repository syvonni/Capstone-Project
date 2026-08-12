const BaseController = require("../base.controller");
const profileService = require("../../services/business-owner/profile.service");

class ProfileController extends BaseController {
  constructor() {
    super();
    this.service = profileService;
  }

  /**
   * Get current user's business profile
   */
  async getProfile(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getProfile(req._userId);
    });
  }

  /**
   * Get all businesses for current user
   */
  async getBusinesses(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      const businesses = await this.service.getBusinesses(req._userId);

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || "";
      const status = req.query.status || "";
      const sort = req.query.sort || "updatedAt";
      const order = req.query.order || "desc";

      let filteredBusinesses = businesses;

      if (search) {
        const searchLower = search.toLowerCase();
        filteredBusinesses = filteredBusinesses.filter((b) =>
          b.businessName?.toLowerCase().includes(searchLower) ||
          b.businessId?.toLowerCase().includes(searchLower)
        );
      }

      if (status) {
        filteredBusinesses = filteredBusinesses.filter((b) =>
          b.applicationStatus === status || b.businessStatus === status
        );
      }

      filteredBusinesses.sort((a, b) => {
        const aVal = a[sort] || a.updatedAt;
        const bVal = b[sort] || b.updatedAt;
        const comparison = aVal > bVal ? 1 : -1;
        return order === "desc" ? -comparison : comparison;
      });

      const totalItems = filteredBusinesses.length;
      const totalPages = Math.ceil(totalItems / limit);
      const startIndex = (page - 1) * limit;
      const paginatedBusinesses = filteredBusinesses.slice(
        startIndex,
        startIndex + limit,
      );

      return {
        businesses: paginatedBusinesses,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    });
  }

  /**
   * Get primary business
   */
  async getPrimaryBusiness(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      const businesses = await this.service.getBusinesses(req._userId);
      const primaryBusiness =
        businesses.find((b) => b.isPrimary) || businesses[0] || null;
      return { business: primaryBusiness };
    });
  }

  /**
   * Upload owner ID image
   */
  async uploadOwnerId(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      if (!req.file) {
        const error = new Error("No file uploaded");
        error.code = "FILE_REQUIRED";
        error.status = 400;
        throw error;
      }

      const side =
        (req.body?.side || "front").toString().replace(/[^a-zA-Z0-9_-]/g, "") ||
        "front";

      return await this.service.uploadOwnerId(req._userId, req.file, side);
    });
  }

  /**
   * Update business profile step
   */
  async updateStep(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      const { step, data } = req.body;
      return await this.service.updateStep(req._userId, step, data, req);
    });
  }

  /**
   * Delete entire business profile
   */
  async deleteProfile(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.deleteProfile(req._userId);
    });
  }
}

module.exports = new ProfileController();
