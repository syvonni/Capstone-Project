/**
 * Variable Data Quality Helper
 *
 * PURPOSE: Provides centralized data quality validation for Variable entities using the generic data quality infrastructure.
 * This follows the SOLID principles by separating validation logic from route handlers and using
 * the generic data quality validator for consistent validation.
 *
 * USAGE EXAMPLE:
 * const { VariableDataQualityHelper } = require('../lib/dataQualityHelpers/variableDataQualityHelper');
 * const result = await VariableDataQualityHelper.validateAllVariables();
 * // Returns: { issues: [{ type: 'missing_name', count: 5, entityIds: [...] }] }
 */

const { validateEntities } = require("../../../../../shared/lib/dataQualityValidator");
const Variable = require("../../models/Variable");
const Fee = require("../../models/Fee");
const Checklist = require("../../models/Checklist");
const Lob = require("../../models/Lob");

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

    // Fetch variables with names
    const variables = await Variable.find({ _id: { $in: issue.entityIds } })
      .select("_id name")
      .lean();

    const variableMap = new Map(
      variables.map((v) => [v._id.toString(), v.name])
    );

    const enrichedEntityIds = issue.entityIds.map((id) => ({
      id,
      name: variableMap.get(id) || "Unknown",
    }));

    enrichedIssues.push({
      ...issue,
      entityIds: enrichedEntityIds,
    });
  }

  return enrichedIssues;
}

/**
 * Variable Data Quality Helper Class
 *
 * Provides static methods for validating variable data quality
 */
class VariableDataQualityHelper {
  /**
   * Validates all variables for data quality issues
   *
   * USAGE:
   * await VariableDataQualityHelper.validateAllVariables()
   *
   * @returns {Promise<object>} - Object with issues array enriched with variable names
   */
  static async validateAllVariables() {
    // Fetch all variables
    const variables = await Variable.find({}).lean();

    // Validate using the generic validator
    const result = validateEntities("variable", variables);

    // Custom check for LOB associations (requires cross-collection query)
    const allLobs = await Lob.find({}).select("variables").lean();
    const variableToLobMap = new Map();
    
    // Build a map of variable IDs to LOB count
    allLobs.forEach(lob => {
      if (lob.variables && lob.variables.length > 0) {
        lob.variables.forEach(variableId => {
          const idStr = variableId.toString();
          variableToLobMap.set(idStr, (variableToLobMap.get(idStr) || 0) + 1);
        });
      }
    });

    // Find variables without LOB associations
    const variablesWithoutLobs = variables
      .filter(v => !variableToLobMap.has(v._id.toString()))
      .map(v => v._id.toString());

    // Add LOB association issue if any variables are without LOBs
    if (variablesWithoutLobs.length > 0) {
      result.issues.push({
        type: "without_lob_associations",
        label: "Without LOB Associations",
        severity: "low",
        count: variablesWithoutLobs.length,
        entityIds: variablesWithoutLobs,
      });
    }

    // Enrich issues with variable names
    const enrichedIssues = await enrichIssuesWithNames(result.issues);

    return {
      ...result,
      issues: enrichedIssues,
    };
  }

  /**
   * Validates a single variable for data quality issues
   *
   * USAGE:
   * await VariableDataQualityHelper.validateVariable(variableId)
   *
   * @param {string} variableId - The ID of the variable to validate
   * @returns {Promise<object>} - Object with issues array
   */
  static async validateVariable(variableId) {
    const variable = await Variable.findById(variableId).lean();
    if (!variable) {
      throw new Error("Variable not found");
    }

    const { validateEntity } = require("../../../../../shared/lib/dataQualityValidator");
    const result = validateEntity("variable", variable);

    return result;
  }

  /**
   * Validates variables with enriched relationship data
   *
   * USAGE:
   * await VariableDataQualityHelper.validateVariablesWithRelations(variableIds)
   *
   * @param {Array<string>} variableIds - Array of variable IDs to validate
   * @returns {Promise<object>} - Object with issues array
   */
  static async validateVariablesWithRelations(variableIds) {
    const variables = await Variable.find({ _id: { $in: variableIds } }).lean();

    // Enrich each variable with relationship names
    const enrichedVariables = await Promise.all(
      variables.map(async (variable) => {
        const [feeWithNames, checklistWithNames] = await Promise.all([
          enrichSingleRelation(variable.feeId, Fee),
          enrichSingleRelation(variable.checklistId, Checklist),
        ]);

        return {
          ...variable,
          feeId: feeWithNames,
          checklistId: checklistWithNames,
        };
      })
    );

    const result = validateEntities("variable", enrichedVariables);
    const enrichedIssues = await enrichIssuesWithNames(result.issues);

    return {
      ...result,
      issues: enrichedIssues,
    };
  }
}

module.exports = VariableDataQualityHelper;
