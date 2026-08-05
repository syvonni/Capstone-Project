/**
 * Lob Audit Helper
 *
 * PURPOSE: Provides centralized audit logging for Lob entities using the generic audit infrastructure.
 * This follows the SOLID principles by separating audit logic from route handlers and using
 * the generic AuditMetadataBuilder for consistent metadata construction.
 *
 * USAGE EXAMPLE:
 * const { LobAuditHelper } = require('../lib/auditHelpers/lobAuditHelper');
 * const userInfo = await getUserInfo(req._userId);
 * LobAuditHelper.logCreated(req, req._userId, userInfo, lob, "admin")
 *   .catch((err) => console.error("Failed to log audit event for LOB create", err));
 */

const { AuditMetadataBuilder } = require('../auditMetadataBuilder');
const { trackChanges } = require('../changeTracker');
const { logAuditEvent } = require('../auditClient');

const LOB_METADATA_MAPPING = {
  lobId: '_id',
  code: 'code',
  name: 'name',
  description: 'description',
  notes: 'notes',
  category: 'category',
  lineOfBusiness: 'lineOfBusiness',
  variables: 'variables',
  documents: 'documents',
  postRequirements: 'postRequirements',
  essentialCommodity: 'essentialCommodity',
  status: 'status',
  activationDate: 'activationDate',
  disabledDate: 'disabledDate',
  disabledReason: 'disabledReason',
  isActive: 'isActive',
  version: 'version',
};

const LOB_FIELD_MAPPING = {
  code: 'code',
  name: 'name',
  description: 'description',
  notes: 'notes',
  category: 'category',
  lineOfBusiness: 'lineOfBusiness',
  variables: 'variables',
  documents: 'documents',
  postRequirements: 'postRequirements',
  essentialCommodity: 'essentialCommodity',
  status: 'status',
  activationDate: 'activationDate',
  disabledDate: 'disabledDate',
  disabledReason: 'disabledReason',
  isActive: 'isActive',
  version: 'version',
};

/**
 * Lob Audit Helper Class
 *
 * Provides static methods for logging LOB-related audit events
 */
class LobAuditHelper {
  /**
   * Logs when a LOB is created
   *
   * USAGE:
   * await LobAuditHelper.logCreated(req, userId, userInfo, lob, role)
   *
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} lob - Lob object that was created
   * @param {string} role - User role
   * @param {object} customFields - Additional custom fields (e.g., taxBracketsCreated)
   * @returns {Promise<object>} - Created audit log
   */
  static async logCreated(req, userId, userInfo, lob, role, customFields = {}) {
    const metadata = new AuditMetadataBuilder(req)
      .withUserInfo(userInfo)
      .withRequestInfo()
      .withEntityFields(lob, LOB_METADATA_MAPPING)
      .withEntityIdentification('Lob', lob._id)
      .withEntitySnapshots(null, lob) // No old snapshot for creation
      .withCustomFields({
        action: 'created',
        ...customFields,
      })
      .build();

    return await logAuditEvent(
      'lob_created',
      userId,
      'Lob',
      lob._id,
      {
        ...metadata,
        role,
        fieldChanged: null,
        oldValue: null,
        newValue: JSON.stringify(lob),
      }
    );
  }

  /**
   * Logs when a LOB is updated
   *
   * USAGE:
   * await LobAuditHelper.logUpdated(req, userId, userInfo, oldLob, newLob, role)
   *
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} oldLob - Lob object before changes
   * @param {object} newLob - Lob object after changes
   * @param {string} role - User role
   * @returns {Promise<Array<object>>} - Array of created audit logs (one per changed field)
   */
  static async logUpdated(req, userId, userInfo, oldLob, newLob, role) {
    // Track changes between old and new LOB
    const changes = trackChanges(oldLob, newLob, LOB_FIELD_MAPPING, {
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
      .withEntityFields(newLob, LOB_METADATA_MAPPING)
      .withEntityIdentification('Lob', newLob._id)
      .withEntitySnapshots(oldLob, newLob)
      .withChangeTracking(changes)
      .withCustomFields({
        action: 'updated',
        oldVersion: oldLob.version,
        newVersion: newLob.version,
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
        'lob_updated',
        userId,
        'Lob',
        newLob._id,
        fieldMetadata
      );
      auditLogs.push(auditLog);
    }
    return auditLogs;
  }
}

module.exports = LobAuditHelper;
