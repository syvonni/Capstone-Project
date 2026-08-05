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
  variableFeeRuleId: '_id',
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
  effectiveDate: 'effectiveDate',
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
  effectiveDate: 'effectiveDate',
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
      .withEntityIdentification('VariableFeeRule', rule._id)
      .withEntitySnapshots(null, rule) // No old snapshot for creation
      .withCustomFields({
        action: 'created',
      })
      .build();

    return await logAuditEvent(
      'variable_fee_rule_created',
      userId,
      'VariableFeeRule',
      rule._id,
      {
        ...metadata,
        role,
        fieldChanged: null,
        oldValue: null,
        newValue: JSON.stringify(rule),
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
   * @returns {Promise<Array<object>>} - Array of created audit logs (one per changed field)
   */
  static async logUpdated(req, userId, userInfo, oldRule, newRule, role) {
    // Track changes between old and new rule
    const changes = trackChanges(oldRule, newRule, VARIABLE_FEE_RULE_FIELD_MAPPING, {
      ignoreFields: ['updatedAt', 'version'], // Ignore these fields
    });

    // If no changes, don't log anything
    if (changes.length === 0) {
      return [];
    }

    // Build base metadata
    const baseMetadata = new AuditMetadataBuilder(req)
      .withUserInfo(userInfo)
      .withRequestInfo()
      .withEntityFields(newRule, VARIABLE_FEE_RULE_METADATA_MAPPING)
      .withEntityIdentification('VariableFeeRule', newRule._id)
      .withEntitySnapshots(oldRule, newRule)
      .withChangeTracking(changes)
      .withCustomFields({
        action: 'updated',
        oldVersion: oldRule.version,
        newVersion: newRule.version,
      })
      .build();

    // Log each changed field separately
    const auditLogs = [];
    for (const change of changes) {
      const fieldMetadata = {
        ...baseMetadata,
        role,
        fieldChanged: change.field,
        oldValue: change.oldValue,
        newValue: change.newValue,
      };

      const auditLog = await logAuditEvent(
        'variable_fee_rule_updated',
        userId,
        'VariableFeeRule',
        newRule._id,
        fieldMetadata
      );
      auditLogs.push(auditLog);
    }
    return auditLogs;
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
      .withEntityIdentification('VariableFeeRule', rule._id)
      .withEntitySnapshots(rule, { ...rule, isActive: false }) // Snapshot before and after
      .withCustomFields({
        action: 'disabled',
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
        fieldChanged: 'isActive',
        oldValue: String(rule.isActive),
        newValue: 'false',
      }
    );
  }
}

module.exports = VariableFeeRuleAuditHelper;
