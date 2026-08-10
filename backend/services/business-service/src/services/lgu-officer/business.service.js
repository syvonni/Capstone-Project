/**
 * Business Service (LGU Officer)
 *
 * PURPOSE: Handles business listing and retrieval for LGU Officer operations.
 * Extracts business logic from routes/lgu-officer/businesses.routes.js
 *
 * METHODS:
 * - listBusinesses: List all approved businesses across the LGU
 * - getBusinessById: Get business details by ID
 *
 * USAGE EXAMPLE:
 * const businessService = require('../services/lgu-officer/business.service');
 * const result = await businessService.listBusinesses({ page: 1, limit: 50, search: 'test' });
 */

const Business = require("../../models/Business");

class BusinessService {
  /**
   * List all approved businesses across the LGU
   *
   * @param {object} filters - Query filters
   * @param {number} filters.page - Page number (default 1)
   * @param {number} filters.limit - Items per page (default 50)
   * @param {string} filters.search - Search term for business name
   * @returns {Promise<object>} - Businesses with metadata
   */
  async listBusinesses(filters = {}) {
    const { page = 1, limit = 50, search = "" } = filters;

    // Build filter - only show active businesses
    const filter = { businessStatus: "active" };

    // Add search filter if provided
    if (search) {
      const searchRegex = new RegExp(search, "i");
      filter.$or = [
        { businessName: searchRegex },
        { registeredBusinessName: searchRegex },
      ];
    }

    const businesses = await Business.find(filter)
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Business.countDocuments(filter);

    return {
      businesses,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    };
  }

  /**
   * Get business details by ID
   *
   * @param {string} id - Business ID (supports both businessId and _id)
   * @returns {Promise<object>} - Business document
   * @throws {Error} - If business not found (code: NOT_FOUND)
   */
  async getBusinessById(id) {
    const business = await Business.findOne({
      $or: [{ businessId: id }, { _id: id }],
    });

    if (!business) {
      const error = new Error("Business not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    return { business };
  }
}

module.exports = new BusinessService();
