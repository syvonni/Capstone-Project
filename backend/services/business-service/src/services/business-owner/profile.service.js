const ownerProfileService = require("../../ownerProfile.service");
const businessOwnerService = require("../../businessOwner.service");
const fileUploadService = require("./fileUpload.service");
const logger = require("../../lib/logger");

// Socket service for realtime updates (lazy-loaded to avoid startup issues)
let socketService = null;
function getSocketService() {
  if (!socketService) {
    try {
      socketService = require("../../../../../shared/lib/socketService");
    } catch (err) {
      logger.warn("Socket service not available:", err.message);
    }
  }
  return socketService;
}

class ProfileService {
  /**
   * Get current user's business profile
   */
  async getProfile(userId) {
    return await ownerProfileService.getProfile(userId);
  }

  /**
   * Get all approved businesses for current user
   */
  async getBusinesses(userId) {
    return await businessOwnerService.getBusinesses(userId);
  }

  /**
   * Get single business for current user
   */
  async getBusiness(userId, businessId) {
    return await businessOwnerService.getBusiness(userId, businessId);
  }

  /**
   * Update business profile step
   */
  async updateStep(userId, step, data, req) {
    if (!step || !data) {
      const error = new Error("Step and data are required");
      error.code = "MISSING_DATA";
      error.status = 400;
      throw error;
    }

    const ip =
      req.ip ||
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";
    const metadata = { ip, userAgent };

    return await ownerProfileService.updateStep(userId, parseInt(step), data, metadata);
  }

  /**
   * Delete entire business profile
   */
  async deleteProfile(userId) {
    return await ownerProfileService.deleteProfile(userId);
  }

  /**
   * Upload owner ID
   */
  async uploadOwnerId(userId, file, side) {
    return await fileUploadService.uploadOwnerId(userId, file, side);
  }
}

module.exports = new ProfileService();
