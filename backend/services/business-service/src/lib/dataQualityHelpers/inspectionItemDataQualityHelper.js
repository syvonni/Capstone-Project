/**
 * Inspection Item Data Quality Helper
 *
 * PURPOSE: Provides centralized data quality validation for InspectionItem entities using the generic data quality infrastructure.
 * This follows the SOLID principles by separating validation logic from route handlers and using
 * the generic data quality validator for consistent validation.
 *
 * USAGE EXAMPLE:
 * const { InspectionItemDataQualityHelper } = require('../lib/dataQualityHelpers/inspectionItemDataQualityHelper');
 * const result = await InspectionItemDataQualityHelper.validateAllInspectionItems();
 * // Returns: { issues: [{ type: 'missing_name', count: 5, entityIds: [...] }] }
 */

const {
  validateEntities,
} = require("../../../../../shared/lib/dataQualityValidator");
const InspectionItem = require("../../models/InspectionItem");
const Violation = require("../../models/Violation");

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

    // Fetch inspection items with names
    const inspectionItems = await InspectionItem.find({ _id: { $in: issue.entityIds } })
      .select("_id name")
      .lean();

    const inspectionItemMap = new Map(
      inspectionItems.map((i) => [i._id.toString(), i.name]),
    );

    const enrichedEntityIds = issue.entityIds.map((id) => ({
      id,
      name: inspectionItemMap.get(id) || "Unknown",
    }));

    enrichedIssues.push({
      ...issue,
      entityIds: enrichedEntityIds,
    });
  }

  return enrichedIssues;
}

/**
 * Inspection Item Data Quality Helper Class
 *
 * Provides static methods for validating inspection item data quality
 */
class InspectionItemDataQualityHelper {
  /**
   * Validates all inspection items for data quality issues
   *
   * USAGE:
   * await InspectionItemDataQualityHelper.validateAllInspectionItems()
   *
   * @returns {Promise<object>} - Object with issues array enriched with inspection item names
   */
  static async validateAllInspectionItems() {
    // Fetch all inspection items
    const inspectionItems = await InspectionItem.find({}).lean();

    // Validate using the generic validator
    const result = validateEntities("inspectionItem", inspectionItems);

    // Custom check for violation associations (requires cross-collection query)
    // Since violationId is required at schema level, this would only catch orphaned records
    const allViolations = await Violation.find({}).select("_id").lean();
    const violationIdSet = new Set(allViolations.map((v) => v._id.toString()));

    // Find inspection items with invalid violation associations
    const inspectionItemsWithInvalidViolations = inspectionItems
      .filter((i) => i.violationId && !violationIdSet.has(i.violationId.toString()))
      .map((i) => i._id.toString());

    // Add violation association issue if any inspection items have invalid violations
    if (inspectionItemsWithInvalidViolations.length > 0) {
      result.issues.push({
        type: "without_violation",
        label: "Without Valid Violation",
        severity: "critical",
        count: inspectionItemsWithInvalidViolations.length,
        entityIds: inspectionItemsWithInvalidViolations,
      });
    }

    // Enrich issues with inspection item names
    const enrichedIssues = await enrichIssuesWithNames(result.issues);

    return {
      ...result,
      issues: enrichedIssues,
    };
  }

  /**
   * Validates a single inspection item for data quality issues
   *
   * USAGE:
   * await InspectionItemDataQualityHelper.validateInspectionItem(inspectionItemId)
   *
   * @param {string} inspectionItemId - The ID of the inspection item to validate
   * @returns {Promise<object>} - Object with issues array
   */
  static async validateInspectionItem(inspectionItemId) {
    const inspectionItem = await InspectionItem.findById(inspectionItemId).lean();
    if (!inspectionItem) {
      throw new Error("Inspection item not found");
    }

    const {
      validateEntity,
    } = require("../../../../../shared/lib/dataQualityValidator");
    const result = validateEntity("inspectionItem", inspectionItem);

    return result;
  }

  /**
   * Validates inspection items with enriched relationship data
   *
   * USAGE:
   * await InspectionItemDataQualityHelper.validateInspectionItemsWithRelations(inspectionItemIds)
   *
   * @param {Array<string>} inspectionItemIds - Array of inspection item IDs to validate
   * @returns {Promise<object>} - Object with issues array
   */
  static async validateInspectionItemsWithRelations(inspectionItemIds) {
    const inspectionItems = await InspectionItem.find({ _id: { $in: inspectionItemIds } }).lean();

    // Enrich each inspection item with relationship names
    const enrichedInspectionItems = await Promise.all(
      inspectionItems.map(async (inspectionItem) => {
        const violationWithNames = await enrichSingleRelation(inspectionItem.violationId, Violation);

        return {
          ...inspectionItem,
          violationId: violationWithNames,
        };
      }),
    );

    const result = validateEntities("inspectionItem", enrichedInspectionItems);
    const enrichedIssues = await enrichIssuesWithNames(result.issues);

    return {
      ...result,
      issues: enrichedIssues,
    };
  }
}

module.exports = InspectionItemDataQualityHelper;
