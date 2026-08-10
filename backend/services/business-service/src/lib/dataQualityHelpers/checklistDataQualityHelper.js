/**
 * Checklist Data Quality Helper
 *
 * PURPOSE: Provides centralized data quality validation for Checklist entities using the generic data quality infrastructure.
 * This follows the SOLID principles by separating validation logic from route handlers and using
 * the generic data quality validator for consistent validation.
 *
 * USAGE EXAMPLE:
 * const { ChecklistDataQualityHelper } = require('../lib/dataQualityHelpers/checklistDataQualityHelper');
 * const result = await ChecklistDataQualityHelper.validateAllChecklists();
 * // Returns: { issues: [{ type: 'missing_name', count: 5, entityIds: [...] }] }
 */

const {
  validateEntities,
} = require("../../../../../shared/lib/dataQualityValidator");
const Checklist = require("../../models/Checklist");
const InspectionItem = require("../../models/InspectionItem");
const PostRequirement = require("../../models/PostRequirement");
const Variable = require("../../models/Variable");
const ClaimableDocument = require("../../models/ClaimableDocument");

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

    // Fetch checklists with names
    const checklists = await Checklist.find({ _id: { $in: issue.entityIds } })
      .select("_id name")
      .lean();

    const checklistMap = new Map(
      checklists.map((c) => [c._id.toString(), c.name]),
    );

    const enrichedEntityIds = issue.entityIds.map((id) => ({
      id,
      name: checklistMap.get(id) || "Unknown",
    }));

    enrichedIssues.push({
      ...issue,
      entityIds: enrichedEntityIds,
    });
  }

  return enrichedIssues;
}

/**
 * Checklist Data Quality Helper Class
 *
 * Provides static methods for validating checklist data quality
 */
class ChecklistDataQualityHelper {
  /**
   * Validates all checklists for data quality issues
   *
   * USAGE:
   * await ChecklistDataQualityHelper.validateAllChecklists()
   *
   * @returns {Promise<object>} - Object with issues array enriched with checklist names
   */
  static async validateAllChecklists() {
    // Fetch all checklists
    const checklists = await Checklist.find({}).lean();

    // Validate using the generic validator
    const result = validateEntities("checklist", checklists);

    // Custom check for inspection item associations (requires cross-collection query)
    const allInspectionItems = await InspectionItem.find({}).select("_id").lean();
    const inspectionItemIdSet = new Set(allInspectionItems.map((i) => i._id.toString()));

    // Find checklists with invalid inspection item associations
    const checklistsWithInvalidItems = [];
    for (const checklist of checklists) {
      if (checklist.items && checklist.items.length > 0) {
        const hasInvalidItems = checklist.items.some(
          (item) => item.inspectionItemId && !inspectionItemIdSet.has(item.inspectionItemId.toString())
        );
        if (hasInvalidItems) {
          checklistsWithInvalidItems.push(checklist._id.toString());
        }
      }
    }

    // Add inspection item association issue if any checklists have invalid items
    if (checklistsWithInvalidItems.length > 0) {
      result.issues.push({
        type: "without_inspection_items",
        label: "With Invalid Inspection Items",
        severity: "high",
        count: checklistsWithInvalidItems.length,
        entityIds: checklistsWithInvalidItems,
      });
    }

    // Enrich issues with checklist names
    const enrichedIssues = await enrichIssuesWithNames(result.issues);

    return {
      ...result,
      issues: enrichedIssues,
    };
  }

  /**
   * Validates a single checklist for data quality issues
   *
   * USAGE:
   * await ChecklistDataQualityHelper.validateChecklist(checklistId)
   *
   * @param {string} checklistId - The ID of the checklist to validate
   * @returns {Promise<object>} - Object with issues array
   */
  static async validateChecklist(checklistId) {
    const checklist = await Checklist.findById(checklistId).lean();
    if (!checklist) {
      throw new Error("Checklist not found");
    }

    const {
      validateEntity,
    } = require("../../../../../shared/lib/dataQualityValidator");
    const result = validateEntity("checklist", checklist);

    return result;
  }

  /**
   * Validates checklists with enriched relationship data
   *
   * USAGE:
   * await ChecklistDataQualityHelper.validateChecklistsWithRelations(checklistIds)
   *
   * @param {Array<string>} checklistIds - Array of checklist IDs to validate
   * @returns {Promise<object>} - Object with issues array
   */
  static async validateChecklistsWithRelations(checklistIds) {
    const checklists = await Checklist.find({ _id: { $in: checklistIds } }).lean();

    // Enrich each checklist with relationship names
    const enrichedChecklists = await Promise.all(
      checklists.map(async (checklist) => {
        const [postRequirementWithNames, variableWithNames, documentWithNames] = await Promise.all([
          enrichSingleRelation(checklist.postRequirementId, PostRequirement),
          enrichSingleRelation(checklist.variableId, Variable),
          enrichSingleRelation(checklist.documentId, ClaimableDocument),
        ]);

        return {
          ...checklist,
          postRequirementId: postRequirementWithNames,
          variableId: variableWithNames,
          documentId: documentWithNames,
        };
      }),
    );

    const result = validateEntities("checklist", enrichedChecklists);
    const enrichedIssues = await enrichIssuesWithNames(result.issues);

    return {
      ...result,
      issues: enrichedIssues,
    };
  }
}

module.exports = ChecklistDataQualityHelper;
