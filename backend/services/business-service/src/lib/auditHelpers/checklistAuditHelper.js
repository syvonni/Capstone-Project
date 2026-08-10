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

const { AuditMetadataBuilder } = require("../auditMetadataBuilder");
const { trackChanges } = require("../changeTracker");
const { logAuditEvent } = require("../auditClient");

const CHECKLIST_METADATA_MAPPING = {
  name: "name",
  description: "description",
  notes: "notes",
  legalBasis: "legalBasis",
  items: "items",
  isActive: "isActive",
  version: "version",
  postRequirementId: "postRequirementId",
  variableId: "variableId",
  documentId: "documentId",
};

const CHECKLIST_FIELD_MAPPING = {
  name: "name",
  description: "description",
  notes: "notes",
  legalBasis: "legalBasis",
  items: "items",
  isActive: "isActive",
  version: "version",
  postRequirementId: "postRequirementId",
  variableId: "variableId",
  documentId: "documentId",
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
      .withEntitySnapshots(null, checklist) // No old snapshot for creation
      .withCustomFields({
        itemCount: checklist.items.length,
      })
      .build();

    return await logAuditEvent(
      "checklist_created",
      userId,
      "Checklist",
      checklist._id,
      {
        ...metadata,
        role,
      },
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
   * @returns {Promise<object>} - Created audit log (single log for all field changes)
   */
  static async logUpdated(
    req,
    userId,
    userInfo,
    oldChecklist,
    newChecklist,
    role,
  ) {
    // Track changes between old and new checklist
    const changes = trackChanges(
      oldChecklist,
      newChecklist,
      CHECKLIST_FIELD_MAPPING,
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
      .withEntityFields(newChecklist, CHECKLIST_METADATA_MAPPING)
      .withEntitySnapshots(oldChecklist, newChecklist)
      .withChangeTracking(changes)
      .withCustomFields({
        oldVersion: oldChecklist.version,
        newVersion: newChecklist.version,
        itemCount: newChecklist.items.length,
      })
      .build();

    // Log a single audit event for all field changes
    const auditLog = await logAuditEvent(
      "checklist_updated",
      userId,
      "Checklist",
      newChecklist._id,
      {
        ...metadata,
        role,
      },
    );

    return auditLog;
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
      .withEntitySnapshots(checklist, { ...checklist, isActive: false }) // Snapshot before and after
      .withCustomFields({
        previousStatus: checklist.isActive ? "active" : "inactive",
        itemCount: checklist.items.length,
      })
      .build();

    return await logAuditEvent(
      "checklist_disabled",
      userId,
      "Checklist",
      checklist._id,
      {
        ...metadata,
        role,
      },
    );
  }
}

module.exports = ChecklistAuditHelper;
