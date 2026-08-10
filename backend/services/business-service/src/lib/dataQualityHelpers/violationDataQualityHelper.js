/**
 * Violation Data Quality Helper
 *
 * PURPOSE: Provides centralized data quality validation for Violation entities using the generic data quality infrastructure.
 * This follows the SOLID principles by separating validation logic from route handlers and using
 * the generic data quality validator for consistent validation.
 *
 * USAGE EXAMPLE:
 * const { ViolationDataQualityHelper } = require('../lib/dataQualityHelpers/violationDataQualityHelper');
 * const result = await ViolationDataQualityHelper.validateAllViolations();
 * // Returns: { issues: [{ type: 'missing_name', count: 5, entityIds: [...] }] }
 */

const {
  validateEntities,
} = require("../../../../../shared/lib/dataQualityValidator");
const Violation = require("../../models/Violation");
const InspectionItem = require("../../models/InspectionItem");

/**
 * Helper function to enrich single relationship with name
 */
async function enrichSingleRelation(id, Model) {
  if (!id) return null;
  const entity = await Model.findById(id).select("_id name").lean();
  return entity ? { id: entity._id.toString(), name: entity.name } : null;
}

/**
 * Helper function to enrich issues with entity names
 */
async function enrichIssuesWithNames(issues) {
  const enrichedIssues = [];

  for (const issue of issues) {
    if (issue.entityIds.length === 0) {
      enrichedIssues.push(issue);
      continue;
    }

    // Fetch violations with names
    const violations = await Violation.find({ _id: { $in: issue.entityIds } })
      .select("_id name")
      .lean();

    const violationMap = new Map(
      violations.map((v) => [v._id.toString(), v.name]),
    );

    const enrichedEntityIds = issue.entityIds.map((id) => ({
      id,
      name: violationMap.get(id) || "Unknown",
    }));

    enrichedIssues.push({
      ...issue,
      entityIds: enrichedEntityIds,
    });
  }

  return enrichedIssues;
}

/**
 * Violation Data Quality Helper Class
 *
 * Provides static methods for validating violation data quality
 */
class ViolationDataQualityHelper {
  /**
   * Validates all violations for data quality issues
   *
   * USAGE:
   * await ViolationDataQualityHelper.validateAllViolations()
   *
   * @returns {Promise<object>} - Object with issues array enriched with violation names
   */
  static async validateAllViolations() {
    // Fetch all violations
    const violations = await Violation.find({}).lean();

    // Validate using the generic validator
    const result = validateEntities("violation", violations);

    // Custom check for inspection item associations (requires cross-collection query)
    const allInspectionItems = await InspectionItem.find({}).select("violationId").lean();
    const violationToInspectionItemMap = new Map();

    // Build a map of violation IDs to inspection item count
    allInspectionItems.forEach((inspectionItem) => {
      if (inspectionItem.violationId) {
        const idStr = inspectionItem.violationId.toString();
        violationToInspectionItemMap.set(idStr, (violationToInspectionItemMap.get(idStr) || 0) + 1);
      }
    });

    // Find violations without inspection items
    const violationsWithoutInspectionItems = violations
      .filter((v) => !violationToInspectionItemMap.has(v._id.toString()))
      .map((v) => v._id.toString());

    // Add inspection item association issue if any violations are without inspection items
    if (violationsWithoutInspectionItems.length > 0) {
      result.issues.push({
        type: "without_inspection_items",
        label: "Without Inspection Items",
        severity: "low",
        count: violationsWithoutInspectionItems.length,
        entityIds: violationsWithoutInspectionItems,
      });
    }

    // Enrich issues with violation names
    const enrichedIssues = await enrichIssuesWithNames(result.issues);

    return {
      ...result,
      issues: enrichedIssues,
    };
  }

  /**
   * Validates a single violation for data quality issues
   *
   * USAGE:
   * await ViolationDataQualityHelper.validateViolation(violationId)
   *
   * @param {string} violationId - The ID of the violation to validate
   * @returns {Promise<object>} - Object with issues array
   */
  static async validateViolation(violationId) {
    const violation = await Violation.findById(violationId).lean();
    if (!violation) {
      throw new Error("Violation not found");
    }

    const {
      validateEntity,
    } = require("../../../../../shared/lib/dataQualityValidator");
    const result = validateEntity("violation", violation);

    return result;
  }

  /**
   * Validates violations with enriched relationship data
   *
   * USAGE:
   * await ViolationDataQualityHelper.validateViolationsWithRelations(violationIds)
   *
   * @param {Array<string>} violationIds - Array of violation IDs to validate
   * @returns {Promise<object>} - Object with issues array
   */
  static async validateViolationsWithRelations(violationIds) {
    const violations = await Violation.find({ _id: { $in: violationIds } }).lean();

    // Enrich each violation with relationship names (if needed in future)
    const enrichedViolations = violations;

    const result = validateEntities("violation", enrichedViolations);
    const enrichedIssues = await enrichIssuesWithNames(result.issues);

    return {
      ...result,
      issues: enrichedIssues,
    };
  }
}

module.exports = ViolationDataQualityHelper;