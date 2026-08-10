/**
 * Post Requirement Data Quality Helper
 *
 * PURPOSE: Provides centralized data quality validation for PostRequirement entities using the generic data quality infrastructure.
 * This follows the SOLID principles by separating validation logic from route handlers and using
 * the generic data quality validator for consistent validation.
 *
 * USAGE EXAMPLE:
 * const { PostRequirementDataQualityHelper } = require('../lib/dataQualityHelpers/postRequirementDataQualityHelper');
 * const result = await PostRequirementDataQualityHelper.validateAllPostRequirements();
 * // Returns: { issues: [{ type: 'missing_name', count: 5, entityIds: [...] }] }
 */

const {
  validateEntities,
} = require("../../../../../shared/lib/dataQualityValidator");
const PostRequirement = require("../../models/PostRequirement");
const Checklist = require("../../models/Checklist");

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

    // Fetch post requirements with names
    const postRequirements = await PostRequirement.find({ _id: { $in: issue.entityIds } })
      .select("_id name")
      .lean();

    const postRequirementMap = new Map(
      postRequirements.map((p) => [p._id.toString(), p.name]),
    );

    const enrichedEntityIds = issue.entityIds.map((id) => ({
      id,
      name: postRequirementMap.get(id) || "Unknown",
    }));

    enrichedIssues.push({
      ...issue,
      entityIds: enrichedEntityIds,
    });
  }

  return enrichedIssues;
}

/**
 * Post Requirement Data Quality Helper Class
 *
 * Provides static methods for validating post requirement data quality
 */
class PostRequirementDataQualityHelper {
  /**
   * Validates all post requirements for data quality issues
   *
   * USAGE:
   * await PostRequirementDataQualityHelper.validateAllPostRequirements()
   *
   * @returns {Promise<object>} - Object with issues array enriched with post requirement names
   */
  static async validateAllPostRequirements() {
    // Fetch all post requirements
    const postRequirements = await PostRequirement.find({}).lean();

    // Validate using the generic validator
    const result = validateEntities("postRequirement", postRequirements);

    // Custom check for duplicate codes (requires cross-collection query)
    const codeCounts = {};
    postRequirements.forEach((p) => {
      const code = p.code?.toLowerCase();
      if (code) {
        codeCounts[code] = (codeCounts[code] || 0) + 1;
      }
    });

    const duplicateCodeIds = postRequirements
      .filter((p) => {
        const code = p.code?.toLowerCase();
        return code && codeCounts[code] > 1;
      })
      .map((p) => p._id.toString());

    // Add duplicate code issue if any post requirements have duplicate codes
    if (duplicateCodeIds.length > 0) {
      result.issues.push({
        type: "duplicate_codes",
        label: "Duplicate Codes",
        severity: "critical",
        count: duplicateCodeIds.length,
        entityIds: duplicateCodeIds,
      });
    }

    // Custom check for checklist associations (optional but important for proper configuration)
    const allChecklists = await Checklist.find({}).select("_id").lean();
    const checklistIdSet = new Set(allChecklists.map((c) => c._id.toString()));

    // Find post requirements with invalid checklist associations
    const postRequirementsWithInvalidChecklists = postRequirements
      .filter((p) => p.checklistId && !checklistIdSet.has(p.checklistId.toString()))
      .map((p) => p._id.toString());

    // Add checklist association issue if any post requirements have invalid checklists
    if (postRequirementsWithInvalidChecklists.length > 0) {
      result.issues.push({
        type: "without_valid_checklist",
        label: "Without Valid Checklist",
        severity: "medium",
        count: postRequirementsWithInvalidChecklists.length,
        entityIds: postRequirementsWithInvalidChecklists,
      });
    }

    // Enrich issues with post requirement names
    const enrichedIssues = await enrichIssuesWithNames(result.issues);

    return {
      ...result,
      issues: enrichedIssues,
    };
  }

  /**
   * Validates a single post requirement for data quality issues
   *
   * USAGE:
   * await PostRequirementDataQualityHelper.validatePostRequirement(postRequirementId)
   *
   * @param {string} postRequirementId - The ID of the post requirement to validate
   * @returns {Promise<object>} - Object with issues array
   */
  static async validatePostRequirement(postRequirementId) {
    const postRequirement = await PostRequirement.findById(postRequirementId).lean();
    if (!postRequirement) {
      throw new Error("Post requirement not found");
    }

    const {
      validateEntity,
    } = require("../../../../../shared/lib/dataQualityValidator");
    const result = validateEntity("postRequirement", postRequirement);

    return result;
  }

  /**
   * Validates post requirements with enriched relationship data
   *
   * USAGE:
   * await PostRequirementDataQualityHelper.validatePostRequirementsWithRelations(postRequirementIds)
   *
   * @param {Array<string>} postRequirementIds - Array of post requirement IDs to validate
   * @returns {Promise<object>} - Object with issues array
   */
  static async validatePostRequirementsWithRelations(postRequirementIds) {
    const postRequirements = await PostRequirement.find({ _id: { $in: postRequirementIds } }).lean();

    // Enrich each post requirement with relationship names
    const enrichedPostRequirements = await Promise.all(
      postRequirements.map(async (postRequirement) => {
        const checklistWithNames = await enrichSingleRelation(postRequirement.checklistId, Checklist);

        return {
          ...postRequirement,
          checklistId: checklistWithNames,
        };
      }),
    );

    const result = validateEntities("postRequirement", enrichedPostRequirements);
    const enrichedIssues = await enrichIssuesWithNames(result.issues);

    return {
      ...result,
      issues: enrichedIssues,
    };
  }
}

module.exports = PostRequirementDataQualityHelper;
