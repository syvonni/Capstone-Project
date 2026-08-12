const Business = require("../models/Business");

/**
 * BusinessOwner service
 * Read-only approved business queries for the owner.
 * Business creation from approved applications is handled by
 * lgu-officer/businessCreation.service.js.
 */
class BusinessOwnerService {
  /**
   * List approved businesses owned by the user
   */
  async getBusinesses(userId) {
    return await Business.find({ userId })
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Get a single business by its businessId or _id
   */
  async getBusiness(userId, businessId) {
    const business = await Business.findOne({
      userId,
      $or: [{ businessId }, { _id: businessId }],
    }).lean();

    if (!business) {
      const error = new Error("Business not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    return business;
  }
}

module.exports = new BusinessOwnerService();
