/**
 * Application Data Quality Service
 *
 * PURPOSE: Validates application data quality using generic data quality infrastructure.
 * Follows the same pattern as variableDataQualityHelper.
 *
 * USAGE EXAMPLE:
 * const applicationDataQualityService = require('../services/lgu-officer/applicationDataQuality.service');
 * const result = await applicationDataQualityService.validateAllApplications();
 */

const {
  validateEntities,
  validateEntity,
} = require("../../../../../shared/lib/dataQualityValidator");
const Application = require("../../models/Application");
const User = require("../../models/User");
const Business = require("../../models/Business");

class ApplicationDataQualityService {
  /**
   * Validates all applications for data quality issues
   *
   * @returns {Promise<object>} - Object with issues array
   */
  async validateAllApplications() {
    const applications = await Application.find({}).lean();
    const result = validateEntities("application", applications);

    // Custom check: orphaned applications (no matching user)
    const userIds = applications.map((a) => a.userId);
    const users = await User.find({ _id: { $in: userIds } }).select("_id").lean();
    const validUserIds = new Set(users.map((u) => u._id.toString()));

    const orphanedApplications = applications
      .filter((a) => a.userId && !validUserIds.has(a.userId.toString()))
      .map((a) => a._id.toString());

    if (orphanedApplications.length > 0) {
      result.issues.push({
        type: "orphaned_application",
        label: "Orphaned Applications",
        severity: "high",
        count: orphanedApplications.length,
        entityIds: orphanedApplications,
      });
    }

    // Custom check: approved applications without businessId
    const approvedWithoutBusiness = applications
      .filter((a) => a.applicationStatus === "approved" && !a.businessId)
      .map((a) => a._id.toString());

    if (approvedWithoutBusiness.length > 0) {
      result.issues.push({
        type: "approved_without_business",
        label: "Approved Without Business",
        severity: "high",
        count: approvedWithoutBusiness.length,
        entityIds: approvedWithoutBusiness,
      });
    }

    // Custom check: stale applications (submitted > 30 days ago, still pending)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const staleApplications = applications
      .filter(
        (a) =>
          a.applicationStatus === "submitted" &&
          a.createdAt &&
          new Date(a.createdAt) < thirtyDaysAgo,
      )
      .map((a) => a._id.toString());

    if (staleApplications.length > 0) {
      result.issues.push({
        type: "stale_application",
        label: "Stale Applications",
        severity: "medium",
        count: staleApplications.length,
        entityIds: staleApplications,
      });
    }

    // Custom check: duplicate applicationReferenceNumber
    const refNumbers = {};
    const duplicateRefs = [];

    applications.forEach((a) => {
      if (a.applicationReferenceNumber) {
        const ref = a.applicationReferenceNumber;
        if (!refNumbers[ref]) {
          refNumbers[ref] = [];
        }
        refNumbers[ref].push(a._id.toString());
      }
    });

    Object.entries(refNumbers).forEach(([ref, ids]) => {
      if (ids.length > 1) {
        duplicateRefs.push(...ids);
      }
    });

    if (duplicateRefs.length > 0) {
      result.issues.push({
        type: "duplicate_reference_number",
        label: "Duplicate Reference Numbers",
        severity: "high",
        count: duplicateRefs.length,
        entityIds: duplicateRefs,
      });
    }

    // Enrich with application names
    const enrichedIssues = await this.enrichIssuesWithNames(result.issues);

    return {
      ...result,
      issues: enrichedIssues,
    };
  }

  /**
   * Validates a single application for data quality issues
   *
   * @param {string} applicationId - Application ID
   * @returns {Promise<object>} - Object with issues array
   */
  async validateApplication(applicationId) {
    const application = await Application.findById(applicationId).lean();
    if (!application) {
      const error = new Error("Application not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const result = validateEntity("application", application);

    // Custom checks
    const issues = [];

    // Check if user exists
    if (application.userId) {
      const user = await User.findById(application.userId).select("_id").lean();
      if (!user) {
        issues.push({
          type: "orphaned_application",
          label: "Orphaned Application",
          severity: "high",
        });
      }
    }

    // Check if approved without business
    if (application.applicationStatus === "approved" && !application.businessId) {
      issues.push({
        type: "approved_without_business",
        label: "Approved Without Business",
        severity: "high",
      });
    }

    // Check if stale
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (
      application.applicationStatus === "submitted" &&
      application.createdAt &&
      new Date(application.createdAt) < thirtyDaysAgo
    ) {
      issues.push({
        type: "stale_application",
        label: "Stale Application",
        severity: "medium",
      });
    }

    result.issues = [...result.issues, ...issues];

    return result;
  }

  /**
   * Get application quality report with filters
   *
   * @param {object} filters - Filter options
   * @returns {Promise<object>} - Quality report
   */
  async getApplicationQualityReport(filters = {}) {
    const applications = await Application.find(filters).lean();
    const result = validateEntities("application", applications);

    return result;
  }

  /**
   * Enrich issues with application names
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

      // Fetch applications with names
      const applications = await Application.find({ _id: { $in: issue.entityIds } })
        .select("_id businessName applicationId")
        .lean();

      const applicationMap = new Map(
        applications.map((a) => [
          a._id.toString(),
          a.businessName || a.applicationId || "Unknown",
        ]),
      );

      const enrichedEntityIds = issue.entityIds.map((id) => ({
        id,
        name: applicationMap.get(id) || "Unknown",
      }));

      enrichedIssues.push({
        ...issue,
        entityIds: enrichedEntityIds,
      });
    }

    return enrichedIssues;
  }
}

module.exports = new ApplicationDataQualityService();
