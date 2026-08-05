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

const { AuditMetadataBuilder } = require('../auditMetadataBuilder');
const { trackChanges } = require('../changeTracker');
const { logAuditEvent } = require('../auditClient');

const TAX_BRACKET_METADATA_MAPPING = {
  taxBracketId: '_id',
  lobId: 'lobId',
  taxBasis: 'taxBasis',
  name: 'name',
  minValue: 'minValue',
  maxValue: 'maxValue',
  fixedAmount: 'fixedAmount',
  excessRate: 'excessRate',
  excessRateType: 'excessRateType',
  paymentFrequency: 'paymentFrequency',
  notes: 'notes',
  isActive: 'isActive',
  version: 'version',
};

const TAX_BRACKET_FIELD_MAPPING = {
  lobId: 'lobId',
  taxBasis: 'taxBasis',
  name: 'name',
  minValue: 'minValue',
  maxValue: 'maxValue',
  fixedAmount: 'fixedAmount',
  excessRate: 'excessRate',
  excessRateType: 'excessRateType',
  paymentFrequency: 'paymentFrequency',
  notes: 'notes',
  isActive: 'isActive',
  version: 'version',
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
      .withEntityIdentification('TaxBracket', bracket._id)
      .withEntitySnapshots(null, bracket) // No old snapshot for creation
      .withCustomFields({
        action: 'created',
      })
      .build();

    return await logAuditEvent(
      'tax_bracket_created',
      userId,
      'TaxBracket',
      bracket._id,
      {
        ...metadata,
        role,
        fieldChanged: null,
        oldValue: null,
        newValue: JSON.stringify(bracket),
      }
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
   * @returns {Promise<Array<object>>} - Array of created audit logs (one per changed field)
   */
  static async logUpdated(req, userId, userInfo, oldBracket, newBracket, role) {
    // Track changes between old and new bracket
    const changes = trackChanges(oldBracket, newBracket, TAX_BRACKET_FIELD_MAPPING, {
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
      .withEntityFields(newBracket, TAX_BRACKET_METADATA_MAPPING)
      .withEntityIdentification('TaxBracket', newBracket._id)
      .withEntitySnapshots(oldBracket, newBracket)
      .withChangeTracking(changes)
      .withCustomFields({
        action: 'updated',
        oldVersion: oldBracket.version,
        newVersion: newBracket.version,
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
        'tax_bracket_updated',
        userId,
        'TaxBracket',
        newBracket._id,
        fieldMetadata
      );
      auditLogs.push(auditLog);
    }
    return auditLogs;
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
      .withEntityIdentification('TaxBracket', bracket._id)
      .withEntitySnapshots(bracket, null) // Snapshot before, no after for deletion
      .withCustomFields({
        action: 'deleted',
      })
      .build();

    return await logAuditEvent(
      'tax_bracket_deleted',
      userId,
      'TaxBracket',
      bracket._id,
      {
        ...metadata,
        role,
        fieldChanged: 'tax_bracket',
        oldValue: JSON.stringify(bracket),
        newValue: null,
      }
    );
  }
}

module.exports = TaxBracketAuditHelper;
