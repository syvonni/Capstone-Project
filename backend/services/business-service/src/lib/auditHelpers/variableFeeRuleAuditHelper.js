/**
 * Variable Fee Rule Audit Helper
 *
 * PURPOSE: Provides centralized audit logging for VariableFeeRule entities using the generic audit infrastructure.
 * This follows the SOLID principles by separating audit logic from route handlers and using
 * the generic AuditMetadataBuilder for consistent metadata construction.
 *
 * USAGE EXAMPLE:
 * const { VariableFeeRuleAuditHelper } = require('../lib/auditHelpers/variableFeeRuleAuditHelper');
 * const userInfo = await getUserInfo(req._userId);
 * VariableFeeRuleAuditHelper.logCreated(req, req._userId, userInfo, rule, "admin")
 *   .catch((err) => console.error("Failed to log audit event for variable fee rule create", err));
 */

const { AuditMetadataBuilder } = require('../auditMetadataBuilder');
const { trackChanges } = require('../changeTracker');
const { logAuditEvent } = require('../auditClient');

const VARIABLE_FEE_RULE_METADATA_MAPPING = {
  customId: 'customId',
  name: 'name',
  notes: 'notes',
  question: 'question',
  calculationMethod: 'calculationMethod',
  customCalculationMethod: 'customCalculationMethod',
  baseRate: 'baseRate',
  unit: 'unit',
  brackets: 'brackets',
  classifications: 'classifications',
  isActive: 'isActive',
  version: 'version',
};

const VARIABLE_FEE_RULE_FIELD_MAPPING = {
  customId: 'customId',
  name: 'name',
  notes: 'notes',
  question: 'question',
  calculationMethod: 'calculationMethod',
  customCalculationMethod: 'customCalculationMethod',
  baseRate: 'baseRate',
  unit: 'unit',
  brackets: 'brackets',
  classifications: 'classifications',
  isActive: 'isActive',
  version: 'version',
};

/**
 * Variable Fee Rule Audit Helper Class
 *
 * Provides static methods for logging variable fee rule-related audit events
 */
class VariableFeeRuleAuditHelper {
  /**
   * Logs when a variable fee rule is created
   *
   * USAGE:
   * await VariableFeeRuleAuditHelper.logCreated(req, userId, userInfo, rule, role)
   *
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} rule - VariableFeeRule object that was created
   * @param {string} role - User role
   * @returns {Promise<object>} - Created audit log
   */
  static async logCreated(req, userId, userInfo, rule, role) {
    const metadata = new AuditMetadataBuilder(req)
      .withUserInfo(userInfo)
      .withRequestInfo()
      .withEntityFields(rule, VARIABLE_FEE_RULE_METADATA_MAPPING)
      .withEntitySnapshots(null, rule) // No old snapshot for creation
      .build();

    return await logAuditEvent(
      'variable_fee_rule_created',
      userId,
      'VariableFeeRule',
      rule._id,
      {
        ...metadata,
        role,
      }
    );
  }

  /**
   * Logs when a variable fee rule is updated
   *
   * USAGE:
   * await VariableFeeRuleAuditHelper.logUpdated(req, userId, userInfo, oldRule, newRule, role)
   *
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} oldRule - VariableFeeRule object before changes
   * @param {object} newRule - VariableFeeRule object after changes
   * @param {string} role - User role
   * @returns {Promise<object>} - Created audit log (single log for all field changes)
   */
  static async logUpdated(req, userId, userInfo, oldRule, newRule, role) {
    // Track changes between old and new rule
    const changes = trackChanges(oldRule, newRule, VARIABLE_FEE_RULE_FIELD_MAPPING, {
      ignoreFields: ['updatedAt', 'version'], // Ignore these fields
    });

    // If no changes, don't log anything
    if (changes.length === 0) {
      return null;
    }

    // Build base metadata
    const metadata = new AuditMetadataBuilder(req)
      .withUserInfo(userInfo)
      .withRequestInfo()
      .withEntityFields(newRule, VARIABLE_FEE_RULE_METADATA_MAPPING)
      .withEntitySnapshots(oldRule, newRule)
      .withChangeTracking(changes)
      .withCustomFields({
        oldVersion: oldRule.version,
        newVersion: newRule.version,
      })
      .build();

    // Log a single audit event for all field changes
    const auditLog = await logAuditEvent(
      'variable_fee_rule_updated',
      userId,
      'VariableFeeRule',
      newRule._id,
      {
        ...metadata,
        role,
      }
    );

    return auditLog;
  }

  /**
   * Logs when a variable fee rule is disabled
   *
   * USAGE:
   * await VariableFeeRuleAuditHelper.logDisabled(req, userId, userInfo, rule, role)
   *
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} rule - VariableFeeRule object being disabled
   * @param {string} role - User role
   * @returns {Promise<object>} - Created audit log
   */
  static async logDisabled(req, userId, userInfo, rule, role) {
    const metadata = new AuditMetadataBuilder(req)
      .withUserInfo(userInfo)
      .withRequestInfo()
      .withEntityFields(rule, VARIABLE_FEE_RULE_METADATA_MAPPING)
      .withEntitySnapshots(rule, { ...rule, isActive: false }) // Snapshot before and after
      .withCustomFields({
        previousStatus: rule.isActive ? 'active' : 'inactive',
      })
      .build();

    return await logAuditEvent(
      'variable_fee_rule_disabled',
      userId,
      'VariableFeeRule',
      rule._id,
      {
        ...metadata,
        role,
      }
    );
  }
}

module.exports = VariableFeeRuleAuditHelper;
