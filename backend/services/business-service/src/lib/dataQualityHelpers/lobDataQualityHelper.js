/**
 * LOB Data Quality Helper
 *
 * PURPOSE: Provides centralized data quality validation for LOB entities using the generic data quality infrastructure.
 * This follows the SOLID principles by separating validation logic from route handlers and using
 * the generic data quality validator for consistent validation.
 *
 * USAGE EXAMPLE:
 * const { LobDataQualityHelper } = require('../lib/dataQualityHelpers/lobDataQualityHelper');
 * const result = await LobDataQualityHelper.validateAllLobs();
 * // Returns: { issues: [{ type: 'missing_name', count: 5, entityIds: [...] }] }
 */

const {
  validateEntities,
} = require("../../../../../shared/lib/dataQualityValidator");
const Lob = require("../../models/Lob");
const Variable = require("../../models/Variable");
const ClaimableDocument = require("../../models/ClaimableDocument");
const PostRequirement = require("../../models/PostRequirement");

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

    // Fetch LOBs with names
    const lobs = await Lob.find({ _id: { $in: issue.entityIds } })
      .select("_id name")
      .lean();

    const lobMap = new Map(
      lobs.map((l) => [l._id.toString(), l.name]),
    );

    const enrichedEntityIds = issue.entityIds.map((id) => ({
      id,
      name: lobMap.get(id) || "Unknown",
    }));

    enrichedIssues.push({
      ...issue,
      entityIds: enrichedEntityIds,
    });
  }

  return enrichedIssues;
}

/**
 * LOB Data Quality Helper Class
 *
 * Provides static methods for validating LOB data quality
 */
class LobDataQualityHelper {
  /**
   * Validates all LOBs for data quality issues
   *
   * USAGE:
   * await LobDataQualityHelper.validateAllLobs()
   *
   * @returns {Promise<object>} - Object with issues array enriched with LOB names
   */
  static async validateAllLobs() {
    // Fetch all LOBs
    const lobs = await Lob.find({}).lean();

    // Validate using the generic validator
    const result = validateEntities("lob", lobs);

    // Custom check for duplicate codes (requires cross-collection query)
    const codeCounts = {};
    lobs.forEach((l) => {
      const code = l.code?.toLowerCase();
      if (code) {
        codeCounts[code] = (codeCounts[code] || 0) + 1;
      }
    });

    const duplicateCodeIds = lobs
      .filter((l) => {
        const code = l.code?.toLowerCase();
        return code && codeCounts[code] > 1;
      })
      .map((l) => l._id.toString());

    // Add duplicate code issue if any LOBs have duplicate codes
    if (duplicateCodeIds.length > 0) {
      result.issues.push({
        type: "duplicate_codes",
        label: "Duplicate Codes",
        severity: "critical",
        count: duplicateCodeIds.length,
        entityIds: duplicateCodeIds,
      });
    }

    // Custom check for variables association (optional but important for proper configuration)
    const allVariables = await Variable.find({}).select("_id").lean();
    const variableIdSet = new Set(allVariables.map((v) => v._id.toString()));

    // Find LOBs with invalid variable associations
    const lobsWithInvalidVariables = lobs
      .filter((l) => l.variables && l.variables.some(v => !variableIdSet.has(v.toString())))
      .map((l) => l._id.toString());

    // Add variable association issue if any LOBs have invalid variables
    if (lobsWithInvalidVariables.length > 0) {
      result.issues.push({
        type: "with_invalid_variables",
        label: "With Invalid Variables",
        severity: "medium",
        count: lobsWithInvalidVariables.length,
        entityIds: lobsWithInvalidVariables,
      });
    }

    // Custom check for documents association
    const allDocuments = await ClaimableDocument.find({}).select("_id").lean();
    const documentIdSet = new Set(allDocuments.map((d) => d._id.toString()));

    // Find LOBs with invalid document associations
    const lobsWithInvalidDocuments = lobs
      .filter((l) => l.documents && l.documents.some(d => !documentIdSet.has(d.toString())))
      .map((l) => l._id.toString());

    // Add document association issue if any LOBs have invalid documents
    if (lobsWithInvalidDocuments.length > 0) {
      result.issues.push({
        type: "with_invalid_documents",
        label: "With Invalid Documents",
        severity: "medium",
        count: lobsWithInvalidDocuments.length,
        entityIds: lobsWithInvalidDocuments,
      });
    }

    // Custom check for post requirements association
    const allPostRequirements = await PostRequirement.find({}).select("_id").lean();
    const postRequirementIdSet = new Set(allPostRequirements.map((p) => p._id.toString()));

    // Find LOBs with invalid post requirement associations
    const lobsWithInvalidPostRequirements = lobs
      .filter((l) => {
        const allPrs = [...(l.postRequirements?.required || []), ...(l.postRequirements?.conditional || [])];
        return allPrs.some(pr => !postRequirementIdSet.has(pr.toString()));
      })
      .map((l) => l._id.toString());

    // Add post requirement association issue if any LOBs have invalid post requirements
    if (lobsWithInvalidPostRequirements.length > 0) {
      result.issues.push({
        type: "with_invalid_post_requirements",
        label: "With Invalid Post Requirements",
        severity: "medium",
        count: lobsWithInvalidPostRequirements.length,
        entityIds: lobsWithInvalidPostRequirements,
      });
    }

    // Enrich issues with LOB names
    const enrichedIssues = await enrichIssuesWithNames(result.issues);

    return {
      ...result,
      issues: enrichedIssues,
    };
  }

  /**
   * Validates a single LOB for data quality issues
   *
   * USAGE:
   * await LobDataQualityHelper.validateLob(lobId)
   *
   * @param {string} lobId - The ID of the LOB to validate
   * @returns {Promise<object>} - Object with issues array
   */
  static async validateLob(lobId) {
    const lob = await Lob.findById(lobId).lean();
    if (!lob) {
      throw new Error("LOB not found");
    }

    const {
      validateEntity,
    } = require("../../../../../shared/lib/dataQualityValidator");
    const result = validateEntity("lob", lob);

    return result;
  }

  /**
   * Validates LOBs with enriched relationship data
   *
   * USAGE:
   * await LobDataQualityHelper.validateLobsWithRelations(lobIds)
   *
   * @param {Array<string>} lobIds - Array of LOB IDs to validate
   * @returns {Promise<object>} - Object with issues array
   */
  static async validateLobsWithRelations(lobIds) {
    const lobs = await Lob.find({ _id: { $in: lobIds } }).lean();

    // Enrich each LOB with relationship names
    const enrichedLobs = await Promise.all(
      lobs.map(async (lob) => {
        const variableWithNames = await Promise.all(
          (lob.variables || []).map(async (v) => enrichSingleRelation(v, Variable))
        );

        const documentWithNames = await Promise.all(
          (lob.documents || []).map(async (d) => enrichSingleRelation(d, ClaimableDocument))
        );

        const postRequirementWithNames = await Promise.all(
          [
            ...(lob.postRequirements?.required || []),
            ...(lob.postRequirements?.conditional || []),
          ].map(async (pr) => enrichSingleRelation(pr, PostRequirement))
        );

        return {
          ...lob,
          variables: variableWithNames,
          documents: documentWithNames,
          postRequirements: {
            required: postRequirementWithNames.filter((_, i) => i < (lob.postRequirements?.required?.length || 0)),
            conditional: postRequirementWithNames.filter((_, i) => i >= (lob.postRequirements?.required?.length || 0)),
          },
        };
      }),
    );

    const result = validateEntities("lob", enrichedLobs);
    const enrichedIssues = await enrichIssuesWithNames(result.issues);

    return {
      ...result,
      issues: enrichedIssues,
    };
  }
}

module.exports = LobDataQualityHelper;
