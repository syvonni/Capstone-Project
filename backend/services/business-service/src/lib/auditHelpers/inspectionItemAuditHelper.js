/**
 * Inspection Item Audit Helper
 *
 * PURPOSE: Provides centralized audit logging for InspectionItem entities using the generic audit infrastructure.
 * This follows the SOLID principles by separating audit logic from route handlers and using
 * the generic AuditMetadataBuilder for consistent metadata construction.
 *
 * USAGE EXAMPLE:
 * const { InspectionItemAuditHelper } = require('../lib/auditHelpers/inspectionItemAuditHelper');
 * const userInfo = await getUserInfo(req._userId);
 * InspectionItemAuditHelper.logCreated(req, req._userId, userInfo, inspectionItem, "admin")
 *   .catch((err) => console.error("Failed to log audit event for inspection item create", err));
 */

const { AuditMetadataBuilder } = require('../auditMetadataBuilder');
const { trackChanges } = require('../changeTracker');
const { logAuditEvent } = require('../auditClient');

const INSPECTION_ITEM_METADATA_MAPPING = {
  inspectionItemId: '_id',
  customId: 'customId',
  name: 'name',
  question: 'question',
  notes: 'notes',
  legalBasis: 'legalBasis',
  violationId: 'violationId',
  isActive: 'isActive',
  version: 'version',
};

const INSPECTION_ITEM_FIELD_MAPPING = {
  customId: 'customId',
  name: 'name',
  question: 'question',
  notes: 'notes',
  legalBasis: 'legalBasis',
  violationId: 'violationId',
  isActive: 'isActive',
  version: 'version',
};

/**
 * Inspection Item Audit Helper Class
 *
 * Provides static methods for logging inspection item-related audit events
 */
class InspectionItemAuditHelper {
  /**
   * Logs when an inspection item is created
   *
   * USAGE:
   * await InspectionItemAuditHelper.logCreated(req, userId, userInfo, inspectionItem, role)
   *
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} inspectionItem - InspectionItem object that was created
   * @param {string} role - User role
   * @returns {Promise<object>} - Created audit log
   */
  static async logCreated(req, userId, userInfo, inspectionItem, role) {
    const metadata = new AuditMetadataBuilder(req)
      .withUserInfo(userInfo)
      .withRequestInfo()
      .withEntityFields(inspectionItem, INSPECTION_ITEM_METADATA_MAPPING)
      .withEntityIdentification('InspectionItem', inspectionItem._id)
      .withEntitySnapshots(null, inspectionItem) // No old snapshot for creation
      .withCustomFields({
        action: 'created',
      })
      .build();

    return await logAuditEvent(
      'inspection_item_created',
      userId,
      'InspectionItem',
      inspectionItem._id,
      {
        ...metadata,
        role,
        fieldChanged: null,
        oldValue: null,
        newValue: JSON.stringify(inspectionItem),
      }
    );
  }

  /**
   * Logs when an inspection item is updated
   *
   * USAGE:
   * await InspectionItemAuditHelper.logUpdated(req, userId, userInfo, oldInspectionItem, newInspectionItem, role)
   *
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} oldInspectionItem - InspectionItem object before changes
   * @param {object} newInspectionItem - InspectionItem object after changes
   * @param {string} role - User role
   * @returns {Promise<Array<object>>} - Array of created audit logs (one per changed field)
   */
  static async logUpdated(req, userId, userInfo, oldInspectionItem, newInspectionItem, role) {
    // Track changes between old and new inspection item
    const changes = trackChanges(oldInspectionItem, newInspectionItem, INSPECTION_ITEM_FIELD_MAPPING, {
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
      .withEntityFields(newInspectionItem, INSPECTION_ITEM_METADATA_MAPPING)
      .withEntityIdentification('InspectionItem', newInspectionItem._id)
      .withEntitySnapshots(oldInspectionItem, newInspectionItem)
      .withChangeTracking(changes)
      .withCustomFields({
        action: 'updated',
        oldVersion: oldInspectionItem.version,
        newVersion: newInspectionItem.version,
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
        'inspection_item_updated',
        userId,
        'InspectionItem',
        newInspectionItem._id,
        fieldMetadata
      );
      auditLogs.push(auditLog);
    }
    return auditLogs;
  }

  /**
   * Logs when an inspection item is disabled
   *
   * USAGE:
   * await InspectionItemAuditHelper.logDisabled(req, userId, userInfo, inspectionItem, role)
   *
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} inspectionItem - InspectionItem object being disabled
   * @param {string} role - User role
   * @returns {Promise<object>} - Created audit log
   */
  static async logDisabled(req, userId, userInfo, inspectionItem, role) {
    const metadata = new AuditMetadataBuilder(req)
      .withUserInfo(userInfo)
      .withRequestInfo()
      .withEntityFields(inspectionItem, INSPECTION_ITEM_METADATA_MAPPING)
      .withEntityIdentification('InspectionItem', inspectionItem._id)
      .withEntitySnapshots(inspectionItem, { ...inspectionItem, isActive: false }) // Snapshot before and after
      .withCustomFields({
        action: 'disabled',
        previousStatus: inspectionItem.isActive ? 'active' : 'inactive',
      })
      .build();

    return await logAuditEvent(
      'inspection_item_disabled',
      userId,
      'InspectionItem',
      inspectionItem._id,
      {
        ...metadata,
        role,
        fieldChanged: 'isActive',
        oldValue: String(inspectionItem.isActive),
        newValue: 'false',
      }
    );
  }
}

module.exports = InspectionItemAuditHelper;
