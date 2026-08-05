/**
 * Checklist Audit Helper
 *
 * PURPOSE: Provides centralized audit logging for Checklist entities using the generic audit infrastructure.
 * This follows the SOLID principles by separating audit logic from route handlers and using
 * the generic AuditMetadataBuilder for consistent metadata construction.
 *
 * USAGE EXAMPLE:
 * const { ChecklistAuditHelper } = require('../lib/auditHelpers/checklistAuditHelper');
 * const userInfo = await getUserInfo(req._userId);
 * ChecklistAuditHelper.logCreated(req, req._userId, userInfo, checklist, "admin")
 *   .catch((err) => console.error("Failed to log audit event for checklist create", err));
 */

const { AuditMetadataBuilder } = require('../auditMetadataBuilder');
const { trackChanges } = require('../changeTracker');
const { logAuditEvent } = require('../auditClient');

const CHECKLIST_METADATA_MAPPING = {
  checklistId: '_id',
  name: 'name',
  description: 'description',
  notes: 'notes',
  legalBasis: 'legalBasis',
  items: 'items',
  isActive: 'isActive',
  version: 'version',
  postRequirementId: 'postRequirementId',
  variableId: 'variableId',
  documentId: 'documentId',
};

const CHECKLIST_FIELD_MAPPING = {
  name: 'name',
  description: 'description',
  notes: 'notes',
  legalBasis: 'legalBasis',
  items: 'items',
  isActive: 'isActive',
  version: 'version',
  postRequirementId: 'postRequirementId',
  variableId: 'variableId',
  documentId: 'documentId',
};

/**
 * Checklist Audit Helper Class
 *
 * Provides static methods for logging checklist-related audit events
 */
class ChecklistAuditHelper {
  /**
   * Logs when a checklist is created
   *
   * USAGE:
   * await ChecklistAuditHelper.logCreated(req, userId, userInfo, checklist, role)
   *
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} checklist - Checklist object that was created
   * @param {string} role - User role
   * @returns {Promise<object>} - Created audit log
   */
  static async logCreated(req, userId, userInfo, checklist, role) {
    const metadata = new AuditMetadataBuilder(req)
      .withUserInfo(userInfo)
      .withRequestInfo()
      .withEntityFields(checklist, CHECKLIST_METADATA_MAPPING)
      .withEntityIdentification('Checklist', checklist._id)
      .withEntitySnapshots(null, checklist) // No old snapshot for creation
      .withCustomFields({
        action: 'created',
        itemCount: checklist.items.length,
      })
      .build();

    return await logAuditEvent(
      'checklist_created',
      userId,
      'Checklist',
      checklist._id,
      {
        ...metadata,
        role,
        fieldChanged: null,
        oldValue: null,
        newValue: JSON.stringify(checklist),
      }
    );
  }

  /**
   * Logs when a checklist is updated
   *
   * USAGE:
   * await ChecklistAuditHelper.logUpdated(req, userId, userInfo, oldChecklist, newChecklist, role)
   *
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} oldChecklist - Checklist object before changes
   * @param {object} newChecklist - Checklist object after changes
   * @param {string} role - User role
   * @returns {Promise<Array<object>>} - Array of created audit logs (one per changed field)
   */
  static async logUpdated(req, userId, userInfo, oldChecklist, newChecklist, role) {
    // Track changes between old and new checklist
    const changes = trackChanges(oldChecklist, newChecklist, CHECKLIST_FIELD_MAPPING, {
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
      .withEntityFields(newChecklist, CHECKLIST_METADATA_MAPPING)
      .withEntityIdentification('Checklist', newChecklist._id)
      .withEntitySnapshots(oldChecklist, newChecklist)
      .withChangeTracking(changes)
      .withCustomFields({
        action: 'updated',
        oldVersion: oldChecklist.version,
        newVersion: newChecklist.version,
        itemCount: newChecklist.items.length,
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
        'checklist_updated',
        userId,
        'Checklist',
        newChecklist._id,
        fieldMetadata
      );
      auditLogs.push(auditLog);
    }
    return auditLogs;
  }

  /**
   * Logs when a checklist is disabled
   *
   * USAGE:
   * await ChecklistAuditHelper.logDisabled(req, userId, userInfo, checklist, role)
   *
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} checklist - Checklist object being disabled
   * @param {string} role - User role
   * @returns {Promise<object>} - Created audit log
   */
  static async logDisabled(req, userId, userInfo, checklist, role) {
    const metadata = new AuditMetadataBuilder(req)
      .withUserInfo(userInfo)
      .withRequestInfo()
      .withEntityFields(checklist, CHECKLIST_METADATA_MAPPING)
      .withEntityIdentification('Checklist', checklist._id)
      .withEntitySnapshots(checklist, { ...checklist, isActive: false }) // Snapshot before and after
      .withCustomFields({
        action: 'disabled',
        previousStatus: checklist.isActive ? 'active' : 'inactive',
        itemCount: checklist.items.length,
      })
      .build();

    return await logAuditEvent(
      'checklist_disabled',
      userId,
      'Checklist',
      checklist._id,
      {
        ...metadata,
        role,
        fieldChanged: 'isActive',
        oldValue: String(checklist.isActive),
        newValue: 'false',
      }
    );
  }
}

module.exports = ChecklistAuditHelper;
