/**
 * Claimable Document Audit Helper
 *
 * PURPOSE: Provides centralized audit logging for ClaimableDocument entities using the generic audit infrastructure.
 * This follows the SOLID principles by separating audit logic from route handlers and using
 * the generic AuditMetadataBuilder for consistent metadata construction.
 *
 * USAGE EXAMPLE:
 * const { ClaimableDocumentAuditHelper } = require('../lib/auditHelpers/claimableDocumentAuditHelper');
 * const userInfo = await getUserInfo(req._userId);
 * ClaimableDocumentAuditHelper.logCreated(req, req._userId, userInfo, document, "admin")
 *   .catch((err) => console.error("Failed to log audit event for document create", err));
 */

const { AuditMetadataBuilder } = require('../auditMetadataBuilder');
const { trackChanges } = require('../changeTracker');
const { logAuditEvent } = require('../auditClient');

const CLAIMABLE_DOCUMENT_METADATA_MAPPING = {
  documentId: '_id',
  name: 'name',
  notes: 'notes',
  category: 'category',
  isActive: 'isActive',
  isDraft: 'isDraft',
  draftOf: 'draftOf',
  version: 'version',
  effectiveDate: 'effectiveDate',
  feeId: 'feeId',
  checklistId: 'checklistId',
  customId: 'customId',
  formIds: 'formIds',
};

const CLAIMABLE_DOCUMENT_FIELD_MAPPING = {
  name: 'name',
  notes: 'notes',
  category: 'category',
  isActive: 'isActive',
  isDraft: 'isDraft',
  draftOf: 'draftOf',
  version: 'version',
  effectiveDate: 'effectiveDate',
  templateHtml: 'templateHtml',
  templateImages: 'templateImages',
  templateTexts: 'templateTexts',
  feeId: 'feeId',
  checklistId: 'checklistId',
  customId: 'customId',
  formIds: 'formIds',
};

/**
 * Claimable Document Audit Helper Class
 *
 * Provides static methods for logging claimable document-related audit events
 */
class ClaimableDocumentAuditHelper {
  /**
   * Logs when a document is created
   *
   * USAGE:
   * await ClaimableDocumentAuditHelper.logCreated(req, userId, userInfo, document, role)
   *
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} document - Document object that was created
   * @param {string} role - User role
   * @returns {Promise<object>} - Created audit log
   */
  static async logCreated(req, userId, userInfo, document, role) {
    const metadata = new AuditMetadataBuilder(req)
      .withUserInfo(userInfo)
      .withRequestInfo()
      .withEntityFields(document, CLAIMABLE_DOCUMENT_METADATA_MAPPING)
      .withEntityIdentification('ClaimableDocument', document._id)
      .withEntitySnapshots(null, document) // No old snapshot for creation
      .withCustomFields({
        action: 'created',
      })
      .build();

    return await logAuditEvent(
      'document_created',
      userId,
      'ClaimableDocument',
      document._id,
      {
        ...metadata,
        role,
        fieldChanged: null,
        oldValue: null,
        newValue: JSON.stringify(document),
      }
    );
  }

  /**
   * Logs when a document is updated
   *
   * USAGE:
   * await ClaimableDocumentAuditHelper.logUpdated(req, userId, userInfo, oldDocument, newDocument, role)
   *
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} oldDocument - Document object before changes
   * @param {object} newDocument - Document object after changes
   * @param {string} role - User role
   * @returns {Promise<Array<object>>} - Array of created audit logs (one per changed field)
   */
  static async logUpdated(req, userId, userInfo, oldDocument, newDocument, role) {
    // Track changes between old and new document
    const changes = trackChanges(oldDocument, newDocument, CLAIMABLE_DOCUMENT_FIELD_MAPPING, {
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
      .withEntityFields(newDocument, CLAIMABLE_DOCUMENT_METADATA_MAPPING)
      .withEntityIdentification('ClaimableDocument', newDocument._id)
      .withEntitySnapshots(oldDocument, newDocument)
      .withChangeTracking(changes)
      .withCustomFields({
        action: 'updated',
        oldVersion: oldDocument.version,
        newVersion: newDocument.version,
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
        'document_updated',
        userId,
        'ClaimableDocument',
        newDocument._id,
        fieldMetadata
      );
      auditLogs.push(auditLog);
    }
    return auditLogs;
  }

  /**
   * Logs when a document is disabled
   *
   * USAGE:
   * await ClaimableDocumentAuditHelper.logDisabled(req, userId, userInfo, document, role)
   *
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} document - Document object being disabled
   * @param {string} role - User role
   * @returns {Promise<object>} - Created audit log
   */
  static async logDisabled(req, userId, userInfo, document, role) {
    const metadata = new AuditMetadataBuilder(req)
      .withUserInfo(userInfo)
      .withRequestInfo()
      .withEntityFields(document, CLAIMABLE_DOCUMENT_METADATA_MAPPING)
      .withEntityIdentification('ClaimableDocument', document._id)
      .withEntitySnapshots(document, { ...document, isActive: false }) // Snapshot before and after
      .withCustomFields({
        action: 'disabled',
        previousStatus: document.isActive ? 'active' : 'inactive',
      })
      .build();

    return await logAuditEvent(
      'document_disabled',
      userId,
      'ClaimableDocument',
      document._id,
      {
        ...metadata,
        role,
        fieldChanged: 'isActive',
        oldValue: String(document.isActive),
        newValue: 'false',
      }
    );
  }

  /**
   * Logs when a draft is published
   *
   * USAGE:
   * await ClaimableDocumentAuditHelper.logPublished(req, userId, userInfo, oldDocument, newDocument, role)
   *
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} oldDocument - Document object before publish
   * @param {object} newDocument - Document object after publish
   * @param {string} role - User role
   * @returns {Promise<object>} - Created audit log
   */
  static async logPublished(req, userId, userInfo, oldDocument, newDocument, role) {
    const metadata = new AuditMetadataBuilder(req)
      .withUserInfo(userInfo)
      .withRequestInfo()
      .withEntityFields(newDocument, CLAIMABLE_DOCUMENT_METADATA_MAPPING)
      .withEntityIdentification('ClaimableDocument', newDocument._id)
      .withEntitySnapshots(oldDocument, newDocument)
      .withCustomFields({
        action: 'published',
        oldVersion: oldDocument.version,
        newVersion: newDocument.version,
      })
      .build();

    return await logAuditEvent(
      'document_published',
      userId,
      'ClaimableDocument',
      newDocument._id,
      {
        ...metadata,
        role,
        fieldChanged: 'document',
        oldValue: JSON.stringify(oldDocument),
        newValue: JSON.stringify(newDocument),
      }
    );
  }
}

module.exports = ClaimableDocumentAuditHelper;
