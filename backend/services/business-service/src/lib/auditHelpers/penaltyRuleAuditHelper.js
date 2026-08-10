/**
 * Penalty Rule Audit Helper
 *
 * PURPOSE: Provides centralized audit logging for PenaltyRule entities using the generic audit infrastructure.
 * This follows the SOLID principles by separating audit logic from route handlers and using
 * the generic AuditMetadataBuilder for consistent metadata construction.
 *
 * USAGE EXAMPLE:
 * const { PenaltyRuleAuditHelper } = require('../lib/auditHelpers/penaltyRuleAuditHelper');
 * const userInfo = await getUserInfo(req._userId);
 * PenaltyRuleAuditHelper.logCreated(req, req._userId, userInfo, penaltyRule, "admin")
 *   .catch((err) => console.error("Failed to log audit event for penalty rule create", err));
 */

const { AuditMetadataBuilder } = require("../auditMetadataBuilder");
const { trackChanges } = require("../changeTracker");
const { logAuditEvent } = require("../auditClient");

const PENALTY_RULE_METADATA_MAPPING = {
  name: "name",
  description: "description",
  amount: "amount",
  category: "category",
  isActive: "isActive",
  isDraft: "isDraft",
  draftOf: "draftOf",
  version: "version",
};

const PENALTY_RULE_FIELD_MAPPING = {
  name: "name",
  description: "description",
  amount: "amount",
  category: "category",
  isActive: "isActive",
  isDraft: "isDraft",
  draftOf: "draftOf",
  version: "version",
};

/**
 * Penalty Rule Audit Helper Class
 *
 * Provides static methods for logging penalty rule-related audit events
 */
class PenaltyRuleAuditHelper {
  /**
   * Logs when a penalty rule is created
   *
   * USAGE:
   * await PenaltyRuleAuditHelper.logCreated(req, userId, userInfo, penaltyRule, role)
   *
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} penaltyRule - PenaltyRule object that was created
   * @param {string} role - User role
   * @returns {Promise<object>} - Created audit log
   */
  static async logCreated(req, userId, userInfo, penaltyRule, role) {
    const metadata = new AuditMetadataBuilder(req)
      .withUserInfo(userInfo)
      .withRequestInfo()
      .withEntityFields(penaltyRule, PENALTY_RULE_METADATA_MAPPING)
      .withEntitySnapshots(null, penaltyRule) // No old snapshot for creation
      .build();

    return await logAuditEvent(
      "penalty_rule_created",
      userId,
      "PenaltyRule",
      penaltyRule._id,
      {
        ...metadata,
        role,
      },
    );
  }

  /**
   * Logs when a penalty rule is updated
   *
   * USAGE:
   * await PenaltyRuleAuditHelper.logUpdated(req, userId, userInfo, oldPenaltyRule, newPenaltyRule, role)
   *
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} oldPenaltyRule - PenaltyRule object before changes
   * @param {object} newPenaltyRule - PenaltyRule object after changes
   * @param {string} role - User role
   * @returns {Promise<object>} - Created audit log (single log for all field changes)
   */
  static async logUpdated(
    req,
    userId,
    userInfo,
    oldPenaltyRule,
    newPenaltyRule,
    role,
  ) {
    // Track changes between old and new penalty rule
    const changes = trackChanges(
      oldPenaltyRule,
      newPenaltyRule,
      PENALTY_RULE_FIELD_MAPPING,
      {
        ignoreFields: ["updatedAt", "version"], // Ignore these fields
      },
    );

    // If no changes, don't log anything
    if (changes.length === 0) {
      return null;
    }

    // Build base metadata
    const metadata = new AuditMetadataBuilder(req)
      .withUserInfo(userInfo)
      .withRequestInfo()
      .withEntityFields(newPenaltyRule, PENALTY_RULE_METADATA_MAPPING)
      .withEntitySnapshots(oldPenaltyRule, newPenaltyRule)
      .withChangeTracking(changes)
      .withCustomFields({
        oldVersion: oldPenaltyRule.version,
        newVersion: newPenaltyRule.version,
      })
      .build();

    // Log a single audit event for all field changes
    const auditLog = await logAuditEvent(
      "penalty_rule_updated",
      userId,
      "PenaltyRule",
      newPenaltyRule._id,
      {
        ...metadata,
        role,
      },
    );

    return auditLog;
  }

  /**
   * Logs when a penalty rule is disabled
   *
   * USAGE:
   * await PenaltyRuleAuditHelper.logDisabled(req, userId, userInfo, penaltyRule, role)
   *
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} penaltyRule - PenaltyRule object being disabled
   * @param {string} role - User role
   * @returns {Promise<object>} - Created audit log
   */
  static async logDisabled(req, userId, userInfo, penaltyRule, role) {
    const metadata = new AuditMetadataBuilder(req)
      .withUserInfo(userInfo)
      .withRequestInfo()
      .withEntityFields(penaltyRule, PENALTY_RULE_METADATA_MAPPING)
      .withEntitySnapshots(penaltyRule, { ...penaltyRule, isActive: false }) // Snapshot before and after
      .withCustomFields({
        previousStatus: penaltyRule.isActive ? "active" : "inactive",
      })
      .build();

    return await logAuditEvent(
      "penalty_rule_disabled",
      userId,
      "PenaltyRule",
      penaltyRule._id,
      {
        ...metadata,
        role,
      },
    );
  }
}

module.exports = PenaltyRuleAuditHelper;
