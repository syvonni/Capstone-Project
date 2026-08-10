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

const { AuditMetadataBuilder } = require("../auditMetadataBuilder");
const { trackChanges } = require("../changeTracker");
const { logAuditEvent } = require("../auditClient");
const Violation = require("../../models/Violation");

/**
 * Helper function to enrich single relationship with name
 */
async function enrichSingleRelation(id, Model) {
  if (!id) return null;
  const entity = await Model.findById(id).select("_id name").lean();
  return entity ? { id: entity._id.toString(), name: entity.name } : null;
}

const INSPECTION_ITEM_METADATA_MAPPING = {
  customId: "customId",
  name: "name",
  question: "question",
  notes: "notes",
  legalBasis: "legalBasis",
  violationId: "violationId",
  isActive: "isActive",
  version: "version",
};

const INSPECTION_ITEM_FIELD_MAPPING = {
  customId: "customId",
  name: "name",
  question: "question",
  notes: "notes",
  legalBasis: "legalBasis",
  violationId: "violationId",
  isActive: "isActive",
  version: "version",
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
    // Enrich violationId with name
    const violationWithNames = await enrichSingleRelation(
      inspectionItem.violationId,
      Violation,
    );

    const enrichedInspectionItem = {
      ...(inspectionItem.toObject ? inspectionItem.toObject() : inspectionItem),
      violationId: violationWithNames,
    };

    const metadata = new AuditMetadataBuilder(req)
      .withUserInfo(userInfo)
      .withRequestInfo()
      .withEntityFields(
        enrichedInspectionItem,
        INSPECTION_ITEM_METADATA_MAPPING,
      )
      .withEntitySnapshots(null, inspectionItem) // No old snapshot for creation
      .build();

    return await logAuditEvent(
      "inspection_item_created",
      userId,
      "InspectionItem",
      inspectionItem._id,
      {
        ...metadata,
        role,
      },
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
   * @returns {Promise<object>} - Created audit log (single log for all field changes)
   */
  static async logUpdated(
    req,
    userId,
    userInfo,
    oldInspectionItem,
    newInspectionItem,
    role,
  ) {
    // Track changes between old and new inspection item
    const changes = trackChanges(
      oldInspectionItem,
      newInspectionItem,
      INSPECTION_ITEM_FIELD_MAPPING,
      {
        ignoreFields: ["updatedAt", "version"], // Ignore these fields
      },
    );

    // If no changes, don't log anything
    if (changes.length === 0) {
      return null;
    }

    // Enrich violationId with name
    const violationWithNames = await enrichSingleRelation(
      newInspectionItem.violationId,
      Violation,
    );

    const enrichedInspectionItem = {
      ...(newInspectionItem.toObject
        ? newInspectionItem.toObject()
        : newInspectionItem),
      violationId: violationWithNames,
    };

    // Build base metadata
    const metadata = new AuditMetadataBuilder(req)
      .withUserInfo(userInfo)
      .withRequestInfo()
      .withEntityFields(
        enrichedInspectionItem,
        INSPECTION_ITEM_METADATA_MAPPING,
      )
      .withEntitySnapshots(oldInspectionItem, newInspectionItem)
      .withChangeTracking(changes)
      .withCustomFields({
        oldVersion: oldInspectionItem.version,
        newVersion: newInspectionItem.version,
      })
      .build();

    // Log a single audit event for all field changes
    const auditLog = await logAuditEvent(
      "inspection_item_updated",
      userId,
      "InspectionItem",
      newInspectionItem._id,
      {
        ...metadata,
        role,
      },
    );

    return auditLog;
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
    // Enrich violationId with name
    const violationWithNames = await enrichSingleRelation(
      inspectionItem.violationId,
      Violation,
    );

    const enrichedInspectionItem = {
      ...(inspectionItem.toObject ? inspectionItem.toObject() : inspectionItem),
      violationId: violationWithNames,
    };

    const metadata = new AuditMetadataBuilder(req)
      .withUserInfo(userInfo)
      .withRequestInfo()
      .withEntityFields(
        enrichedInspectionItem,
        INSPECTION_ITEM_METADATA_MAPPING,
      )
      .withEntitySnapshots(inspectionItem, {
        ...inspectionItem,
        isActive: false,
      }) // Snapshot before and after
      .withCustomFields({
        previousStatus: inspectionItem.isActive ? "active" : "inactive",
      })
      .build();

    return await logAuditEvent(
      "inspection_item_disabled",
      userId,
      "InspectionItem",
      inspectionItem._id,
      {
        ...metadata,
        role,
      },
    );
  }
}

module.exports = InspectionItemAuditHelper;
