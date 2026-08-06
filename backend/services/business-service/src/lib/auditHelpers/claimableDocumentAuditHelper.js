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
  name: 'name',
  notes: 'notes',
  category: 'category',
  isActive: 'isActive',
  isDraft: 'isDraft',
  draftOf: 'draftOf',
  version: 'version',
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
      .withEntitySnapshots(null, document) // No old snapshot for creation
      .build();

    return await logAuditEvent(
      'document_created',
      userId,
      'ClaimableDocument',
      document._id,
      {
        ...metadata,
        role,
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
   * @returns {Promise<object>} - Created audit log (single log for all field changes)
   */
  static async logUpdated(req, userId, userInfo, oldDocument, newDocument, role) {
    // Track changes between old and new document
    const changes = trackChanges(oldDocument, newDocument, CLAIMABLE_DOCUMENT_FIELD_MAPPING, {
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
      .withEntityFields(newDocument, CLAIMABLE_DOCUMENT_METADATA_MAPPING)
      .withEntitySnapshots(oldDocument, newDocument)
      .withChangeTracking(changes)
      .withCustomFields({
        oldVersion: oldDocument.version,
        newVersion: newDocument.version,
      })
      .build();

    // Log a single audit event for all field changes
    const auditLog = await logAuditEvent(
      'document_updated',
      userId,
      'ClaimableDocument',
      newDocument._id,
      {
        ...metadata,
        role,
      }
    );

    return auditLog;
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
      .withEntitySnapshots(document, { ...document, isActive: false }) // Snapshot before and after
      .withCustomFields({
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
      .withEntitySnapshots(oldDocument, newDocument)
      .withCustomFields({
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
      }
    );
  }
}

module.exports = ClaimableDocumentAuditHelper;
