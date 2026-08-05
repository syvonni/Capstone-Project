/**
 * Fee Audit Helper
 *
 * PURPOSE: Provides centralized audit logging for Fee entities using the generic audit infrastructure.
 * This follows the SOLID principles by separating audit logic from route handlers and using
 * the generic AuditMetadataBuilder for consistent metadata construction.
 *
 * USAGE EXAMPLE:
 * const { FeeAuditHelper } = require('../lib/auditHelpers/feeAuditHelper');
 * const userInfo = await getUserInfo(req._userId);
 * FeeAuditHelper.logCreated(req, req._userId, userInfo, fee, "admin")
 *   .catch((err) => console.error("Failed to log audit event for fee create", err));
 */

const { AuditMetadataBuilder } = require('../auditMetadataBuilder');
const { trackChanges } = require('../changeTracker');
const { logAuditEvent } = require('../auditClient');

const FEE_METADATA_MAPPING = {
  feeId: '_id',
  name: 'name',
  notes: 'notes',
  amount: 'amount',
  category: 'category',
  isActive: 'isActive',
  version: 'version',
  effectiveDate: 'effectiveDate',
};

const FEE_FIELD_MAPPING = {
  name: 'name',
  notes: 'notes',
  amount: 'amount',
  category: 'category',
  isActive: 'isActive',
  version: 'version',
  effectiveDate: 'effectiveDate',
};

/**
 * Fee Audit Helper Class
 *
 * Provides static methods for logging fee-related audit events
 */
class FeeAuditHelper {
  /**
   * Logs when a fee is created
   *
   * USAGE:
   * await FeeAuditHelper.logCreated(req, userId, userInfo, fee, role)
   *
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} fee - Fee object that was created
   * @param {string} role - User role
   * @returns {Promise<object>} - Created audit log
   */
  static async logCreated(req, userId, userInfo, fee, role) {
    const metadata = new AuditMetadataBuilder(req)
      .withUserInfo(userInfo)
      .withRequestInfo()
      .withEntityFields(fee, FEE_METADATA_MAPPING)
      .withEntityIdentification('Fee', fee._id)
      .withEntitySnapshots(null, fee) // No old snapshot for creation
      .withCustomFields({
        action: 'created',
      })
      .build();

    return await logAuditEvent(
      'fee_created',
      userId,
      'Fee',
      fee._id,
      {
        ...metadata,
        role,
        fieldChanged: null,
        oldValue: null,
        newValue: JSON.stringify(fee),
      }
    );
  }

  /**
   * Logs when a fee is updated
   *
   * USAGE:
   * await FeeAuditHelper.logUpdated(req, userId, userInfo, oldFee, newFee, role)
   *
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} oldFee - Fee object before changes
   * @param {object} newFee - Fee object after changes
   * @param {string} role - User role
   * @returns {Promise<Array<object>>} - Array of created audit logs (one per changed field)
   */
  static async logUpdated(req, userId, userInfo, oldFee, newFee, role) {
    // Track changes between old and new fee
    const changes = trackChanges(oldFee, newFee, FEE_FIELD_MAPPING, {
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
      .withEntityFields(newFee, FEE_METADATA_MAPPING)
      .withEntityIdentification('Fee', newFee._id)
      .withEntitySnapshots(oldFee, newFee)
      .withChangeTracking(changes)
      .withCustomFields({
        action: 'updated',
        oldVersion: oldFee.version,
        newVersion: newFee.version,
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
        'fee_updated',
        userId,
        'Fee',
        newFee._id,
        fieldMetadata
      );
      auditLogs.push(auditLog);
    }
    return auditLogs;
  }

  /**
   * Logs when a fee is disabled
   *
   * USAGE:
   * await FeeAuditHelper.logDisabled(req, userId, userInfo, fee, role)
   *
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} fee - Fee object being disabled
   * @param {string} role - User role
   * @returns {Promise<object>} - Created audit log
   */
  static async logDisabled(req, userId, userInfo, fee, role) {
    const metadata = new AuditMetadataBuilder(req)
      .withUserInfo(userInfo)
      .withRequestInfo()
      .withEntityFields(fee, FEE_METADATA_MAPPING)
      .withEntityIdentification('Fee', fee._id)
      .withEntitySnapshots(fee, { ...fee, isActive: false }) // Snapshot before and after
      .withCustomFields({
        action: 'disabled',
        previousStatus: fee.isActive ? 'active' : 'inactive',
      })
      .build();

    return await logAuditEvent(
      'fee_disabled',
      userId,
      'Fee',
      fee._id,
      {
        ...metadata,
        role,
        fieldChanged: 'isActive',
        oldValue: String(fee.isActive),
        newValue: 'false',
      }
    );
  }

  /**
   * Logs when a fee's calculation is updated
   *
   * USAGE:
   * await FeeAuditHelper.logCalculationUpdated(req, userId, userInfo, fee, oldCalculation, newCalculation, role)
   *
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} fee - Fee object
   * @param {string} oldCalculation - Old calculation formula
   * @param {string} newCalculation - New calculation formula
   * @param {string} role - User role
   * @returns {Promise<object>} - Created audit log
   */
  static async logCalculationUpdated(req, userId, userInfo, fee, oldCalculation, newCalculation, role) {
    const metadata = new AuditMetadataBuilder(req)
      .withUserInfo(userInfo)
      .withRequestInfo()
      .withEntityFields(fee, FEE_METADATA_MAPPING)
      .withEntityIdentification('Fee', fee._id)
      .withEntitySnapshots(fee, fee) // Same fee, just calculation changed
      .withCustomFields({
        action: 'calculation_updated',
        oldCalculation,
        newCalculation,
      })
      .build();

    return await logAuditEvent(
      'variable_calculation_updated',
      userId,
      'Variable',
      fee._id,
      {
        ...metadata,
        role,
        fieldChanged: 'calculation',
        oldValue: oldCalculation,
        newValue: newCalculation,
      }
    );
  }
}

module.exports = FeeAuditHelper;
