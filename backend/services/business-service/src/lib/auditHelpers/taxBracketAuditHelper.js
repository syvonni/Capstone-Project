/**
 * Tax Bracket Audit Helper
 *
 * PURPOSE: Provides centralized audit logging for TaxBracket entities using the generic audit infrastructure.
 * This follows the SOLID principles by separating audit logic from route handlers and using
 * the generic AuditMetadataBuilder for consistent metadata construction.
 *
 * USAGE EXAMPLE:
 * const { TaxBracketAuditHelper } = require('../lib/auditHelpers/taxBracketAuditHelper');
 * const userInfo = await getUserInfo(req._userId);
 * TaxBracketAuditHelper.logCreated(req, req._userId, userInfo, bracket, "admin")
 *   .catch((err) => console.error("Failed to log audit event for tax bracket create", err));
 */

const { AuditMetadataBuilder } = require("../auditMetadataBuilder");
const { trackChanges } = require("../changeTracker");
const { logAuditEvent } = require("../auditClient");

const TAX_BRACKET_METADATA_MAPPING = {
  lobId: "lobId",
  taxBasis: "taxBasis",
  name: "name",
  minValue: "minValue",
  maxValue: "maxValue",
  fixedAmount: "fixedAmount",
  excessRate: "excessRate",
  excessRateType: "excessRateType",
  paymentFrequency: "paymentFrequency",
  notes: "notes",
  isActive: "isActive",
  version: "version",
};

const TAX_BRACKET_FIELD_MAPPING = {
  lobId: "lobId",
  taxBasis: "taxBasis",
  name: "name",
  minValue: "minValue",
  maxValue: "maxValue",
  fixedAmount: "fixedAmount",
  excessRate: "excessRate",
  excessRateType: "excessRateType",
  paymentFrequency: "paymentFrequency",
  notes: "notes",
  isActive: "isActive",
  version: "version",
};

/**
 * Tax Bracket Audit Helper Class
 *
 * Provides static methods for logging tax bracket-related audit events
 */
class TaxBracketAuditHelper {
  /**
   * Logs when a tax bracket is created
   *
   * USAGE:
   * await TaxBracketAuditHelper.logCreated(req, userId, userInfo, bracket, role)
   *
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} bracket - TaxBracket object that was created
   * @param {string} role - User role
   * @returns {Promise<object>} - Created audit log
   */
  static async logCreated(req, userId, userInfo, bracket, role) {
    const metadata = new AuditMetadataBuilder(req)
      .withUserInfo(userInfo)
      .withRequestInfo()
      .withEntityFields(bracket, TAX_BRACKET_METADATA_MAPPING)
      .withEntitySnapshots(null, bracket) // No old snapshot for creation
      .build();

    return await logAuditEvent(
      "tax_bracket_created",
      userId,
      "TaxBracket",
      bracket._id,
      {
        ...metadata,
        role,
      },
    );
  }

  /**
   * Logs when a tax bracket is updated
   *
   * USAGE:
   * await TaxBracketAuditHelper.logUpdated(req, userId, userInfo, oldBracket, newBracket, role)
   *
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} oldBracket - TaxBracket object before changes
   * @param {object} newBracket - TaxBracket object after changes
   * @param {string} role - User role
   * @returns {Promise<object>} - Created audit log (single log for all field changes)
   */
  static async logUpdated(req, userId, userInfo, oldBracket, newBracket, role) {
    // Track changes between old and new bracket
    const changes = trackChanges(
      oldBracket,
      newBracket,
      TAX_BRACKET_FIELD_MAPPING,
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
      .withEntityFields(newBracket, TAX_BRACKET_METADATA_MAPPING)
      .withEntitySnapshots(oldBracket, newBracket)
      .withChangeTracking(changes)
      .withCustomFields({
        oldVersion: oldBracket.version,
        newVersion: newBracket.version,
      })
      .build();

    // Log a single audit event for all field changes
    const auditLog = await logAuditEvent(
      "tax_bracket_updated",
      userId,
      "TaxBracket",
      newBracket._id,
      {
        ...metadata,
        role,
      },
    );

    return auditLog;
  }

  /**
   * Logs when a tax bracket is deleted
   *
   * USAGE:
   * await TaxBracketAuditHelper.logDeleted(req, userId, userInfo, bracket, role)
   *
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} bracket - TaxBracket object being deleted
   * @param {string} role - User role
   * @returns {Promise<object>} - Created audit log
   */
  static async logDeleted(req, userId, userInfo, bracket, role) {
    const metadata = new AuditMetadataBuilder(req)
      .withUserInfo(userInfo)
      .withRequestInfo()
      .withEntityFields(bracket, TAX_BRACKET_METADATA_MAPPING)
      .withEntitySnapshots(bracket, null) // Snapshot before, no after for deletion
      .build();

    return await logAuditEvent(
      "tax_bracket_deleted",
      userId,
      "TaxBracket",
      bracket._id,
      {
        ...metadata,
        role,
      },
    );
  }
}

module.exports = TaxBracketAuditHelper;
