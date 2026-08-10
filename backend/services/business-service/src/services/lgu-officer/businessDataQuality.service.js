/**
 * Business Data Quality Service
 *
 * PURPOSE: Validates business data quality using generic data quality infrastructure.
 * Follows the same pattern as variableDataQualityHelper.
 *
 * USAGE EXAMPLE:
 * const businessDataQualityService = require('../services/lgu-officer/businessDataQuality.service');
 * const result = await businessDataQualityService.validateAllBusinesses();
 */

const {
  validateEntities,
  validateEntity,
} = require("../../../../../shared/lib/dataQualityValidator");
const Business = require("../../models/Business");
const User = require("../../models/User");

class BusinessDataQualityService {
  /**
   * Validates all businesses for data quality issues
   *
   * @returns {Promise<object>} - Object with issues array
   */
  async validateAllBusinesses() {
    const businesses = await Business.find({}).lean();
    const result = validateEntities("business", businesses);

    // Custom check: orphaned businesses (no matching user)
    const userIds = businesses.map((b) => b.userId);
    const users = await User.find({ _id: { $in: userIds } }).select("_id").lean();
    const validUserIds = new Set(users.map((u) => u._id.toString()));

    const orphanedBusinesses = businesses
      .filter((b) => b.userId && !validUserIds.has(b.userId.toString()))
      .map((b) => b._id.toString());

    if (orphanedBusinesses.length > 0) {
      result.issues.push({
        type: "orphaned_business",
        label: "Orphaned Businesses",
        severity: "high",
        count: orphanedBusinesses.length,
        entityIds: orphanedBusinesses,
      });
    }

    // Custom check: active businesses without approvedApplicationId
    const activeWithoutApplication = businesses
      .filter((b) => b.businessStatus === "active" && !b.approvedApplicationId)
      .map((b) => b._id.toString());

    if (activeWithoutApplication.length > 0) {
      result.issues.push({
        type: "active_without_application",
        label: "Active Without Application",
        severity: "medium",
        count: activeWithoutApplication.length,
        entityIds: activeWithoutApplication,
      });
    }

    // Custom check: duplicate businessId
    const businessIds = {};
    const duplicateIds = [];

    businesses.forEach((b) => {
      if (b.businessId) {
        const id = b.businessId;
        if (!businessIds[id]) {
          businessIds[id] = [];
        }
        businessIds[id].push(b._id.toString());
      }
    });

    Object.entries(businessIds).forEach(([id, ids]) => {
      if (ids.length > 1) {
        duplicateIds.push(...ids);
      }
    });

    if (duplicateIds.length > 0) {
      result.issues.push({
        type: "duplicate_business_id",
        label: "Duplicate Business IDs",
        severity: "high",
        count: duplicateIds.length,
        entityIds: duplicateIds,
      });
    }

    // Enrich with business names
    const enrichedIssues = await this.enrichIssuesWithNames(result.issues);

    return {
      ...result,
      issues: enrichedIssues,
    };
  }

  /**
   * Validates a single business for data quality issues
   *
   * @param {string} businessId - Business ID
   * @returns {Promise<object>} - Object with issues array
   */
  async validateBusiness(businessId) {
    const business = await Business.findById(businessId).lean();
    if (!business) {
      const error = new Error("Business not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const result = validateEntity("business", business);

    // Custom checks
    const issues = [];

    // Check if user exists
    if (business.userId) {
      const user = await User.findById(business.userId).select("_id").lean();
      if (!user) {
        issues.push({
          type: "orphaned_business",
          label: "Orphaned Business",
          severity: "high",
        });
      }
    }

    // Check if active without application
    if (business.businessStatus === "active" && !business.approvedApplicationId) {
      issues.push({
        type: "active_without_application",
        label: "Active Without Application",
        severity: "medium",
      });
    }

    result.issues = [...result.issues, ...issues];

    return result;
  }

  /**
   * Get business quality report with filters
   *
   * @param {object} filters - Filter options
   * @returns {Promise<object>} - Quality report
   */
  async getBusinessQualityReport(filters = {}) {
    const businesses = await Business.find(filters).lean();
    const result = validateEntities("business", businesses);

    return result;
  }

  /**
   * Enrich issues with business names
   *
   * @param {Array} issues - Issues array
   * @returns {Promise<Array>} - Enriched issues
   */
  async enrichIssuesWithNames(issues) {
    const enrichedIssues = [];

    for (const issue of issues) {
      if (issue.entityIds.length === 0) {
        enrichedIssues.push(issue);
        continue;
      }

      // Fetch businesses with names
      const businesses = await Business.find({ _id: { $in: issue.entityIds } })
        .select("_id businessName businessId")
        .lean();

      const businessMap = new Map(
        businesses.map((b) => [
          b._id.toString(),
          b.businessName || b.businessId || "Unknown",
        ]),
      );

      const enrichedEntityIds = issue.entityIds.map((id) => ({
        id,
        name: businessMap.get(id) || "Unknown",
      }));

      enrichedIssues.push({
        ...issue,
        entityIds: enrichedEntityIds,
      });
    }

    return enrichedIssues;
  }
}

module.exports = new BusinessDataQualityService();
