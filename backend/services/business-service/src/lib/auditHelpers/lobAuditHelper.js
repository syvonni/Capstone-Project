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

const { AuditMetadataBuilder } = require("../auditMetadataBuilder");
const { trackChanges } = require("../changeTracker");
const { logAuditEvent } = require("../auditClient");
const Variable = require("../../models/Variable");
const ClaimableDocument = require("../../models/ClaimableDocument");
const PostRequirement = require("../../models/PostRequirement");

/**
 * Helper function to convert ID array to ID+name format
 */
async function enrichWithNames(ids, Model) {
  if (!ids || ids.length === 0) return [];
  const entities = await Model.find({ _id: { $in: ids } })
    .select("_id name")
    .lean();
  const entityMap = new Map(entities.map((e) => [e._id.toString(), e.name]));
  return ids.map((id) => ({
    id: id.toString(),
    name: entityMap.get(id.toString()) || "Unknown",
  }));
}

/**
 * Helper function to enrich post requirements with names
 */
async function enrichPostRequirements(postRequirements) {
  if (!postRequirements) return { required: [], conditional: [] };

  const allIds = [
    ...(postRequirements.required || []),
    ...(postRequirements.conditional || []),
  ];

  if (allIds.length === 0) return { required: [], conditional: [] };

  const entities = await PostRequirement.find({ _id: { $in: allIds } })
    .select("_id name")
    .lean();
  const entityMap = new Map(entities.map((e) => [e._id.toString(), e.name]));

  return {
    required: (postRequirements.required || []).map((id) => ({
      id: id.toString(),
      name: entityMap.get(id.toString()) || "Unknown",
    })),
    conditional: (postRequirements.conditional || []).map((id) => ({
      id: id.toString(),
      name: entityMap.get(id.toString()) || "Unknown",
    })),
  };
}

const LOB_METADATA_MAPPING = {
  code: "code",
  name: "name",
  description: "description",
  notes: "notes",
  category: "category",
  lineOfBusiness: "lineOfBusiness",
  variables: "variables",
  documents: "documents",
  postRequirements: "postRequirements",
  essentialCommodity: "essentialCommodity",
  status: "status",
  version: "version",
};

const LOB_FIELD_MAPPING = {
  code: "code",
  name: "name",
  description: "description",
  notes: "notes",
  category: "category",
  lineOfBusiness: "lineOfBusiness",
  variables: "variables",
  documents: "documents",
  postRequirements: "postRequirements",
  essentialCommodity: "essentialCommodity",
  status: "status",
  disabledDate: "disabledDate",
  disabledReason: "disabledReason",
  isActive: "isActive",
  version: "version",
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
    // Enrich relationship arrays with names
    const [variablesWithNames, documentsWithNames, postRequirementsWithNames] =
      await Promise.all([
        enrichWithNames(lob.variables, Variable),
        enrichWithNames(lob.documents, ClaimableDocument),
        enrichPostRequirements(lob.postRequirements),
      ]);

    const enrichedLob = {
      ...(lob.toObject ? lob.toObject() : lob),
      variables: variablesWithNames,
      documents: documentsWithNames,
      postRequirements: postRequirementsWithNames,
    };

    const metadata = new AuditMetadataBuilder(req)
      .withUserInfo(userInfo)
      .withRequestInfo()
      .withEntityFields(enrichedLob, LOB_METADATA_MAPPING)
      .withEntitySnapshots(null, lob) // No old snapshot for creation
      .withCustomFields(customFields)
      .build();

    return await logAuditEvent("lob_created", userId, "Lob", lob._id, {
      ...metadata,
      role,
    });
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
   * @returns {Promise<object>} - Created audit log (single log for all field changes)
   */
  static async logUpdated(req, userId, userInfo, oldLob, newLob, role) {
    // Track changes between old and new LOB
    const changes = trackChanges(oldLob, newLob, LOB_FIELD_MAPPING, {
      ignoreFields: ["updatedAt", "version"], // Ignore these fields
    });

    // If no changes, don't log anything
    if (changes.length === 0) {
      return null;
    }

    // Enrich relationship arrays with names
    const [variablesWithNames, documentsWithNames, postRequirementsWithNames] =
      await Promise.all([
        enrichWithNames(newLob.variables, Variable),
        enrichWithNames(newLob.documents, ClaimableDocument),
        enrichPostRequirements(newLob.postRequirements),
      ]);

    const enrichedLob = {
      ...(newLob.toObject ? newLob.toObject() : newLob),
      variables: variablesWithNames,
      documents: documentsWithNames,
      postRequirements: postRequirementsWithNames,
    };

    // Build base metadata
    const metadata = new AuditMetadataBuilder(req)
      .withUserInfo(userInfo)
      .withRequestInfo()
      .withEntityFields(enrichedLob, LOB_METADATA_MAPPING)
      .withEntitySnapshots(oldLob, newLob)
      .withChangeTracking(changes)
      .withCustomFields({
        oldVersion: oldLob.version,
        newVersion: newLob.version,
      })
      .build();

    // Log a single audit event for all field changes
    const auditLog = await logAuditEvent(
      "lob_updated",
      userId,
      "Lob",
      newLob._id,
      {
        ...metadata,
        role,
      },
    );

    return auditLog;
  }
}

module.exports = LobAuditHelper;
