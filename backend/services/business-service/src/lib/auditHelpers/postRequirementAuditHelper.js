/**
 * Post Requirement Audit Helper
 *
 * PURPOSE: Provides centralized audit logging for PostRequirement entities using the generic audit infrastructure.
 * This follows the SOLID principles by separating audit logic from route handlers and using
 * the generic AuditMetadataBuilder for consistent metadata construction.
 *
 * USAGE EXAMPLE:
 * const { PostRequirementAuditHelper } = require('../lib/auditHelpers/postRequirementAuditHelper');
 * const userInfo = await getUserInfo(req._userId);
 * PostRequirementAuditHelper.logCreated(req, req._userId, userInfo, postRequirement, "admin")
 *   .catch((err) => console.error("Failed to log audit event for post requirement create", err));
 */

const { AuditMetadataBuilder } = require("../auditMetadataBuilder");
const { trackChanges } = require("../changeTracker");
const { logAuditEvent } = require("../auditClient");

const POST_REQUIREMENT_METADATA_MAPPING = {
  code: "code",
  name: "name",
  description: "description",
  notes: "notes",
  legalBasis: "legalBasis",
  isActive: "isActive",
  checklistId: "checklistId",
  customFields: "customFields",
  version: "version",
};

const POST_REQUIREMENT_FIELD_MAPPING = {
  code: "code",
  name: "name",
  description: "description",
  notes: "notes",
  legalBasis: "legalBasis",
  isActive: "isActive",
  checklistId: "checklistId",
  customFields: "customFields",
  version: "version",
};

/**
 * Post Requirement Audit Helper Class
 *
 * Provides static methods for logging post requirement-related audit events
 */
class PostRequirementAuditHelper {
  /**
   * Logs when a post requirement is created
   *
   * USAGE:
   * await PostRequirementAuditHelper.logCreated(req, userId, userInfo, postRequirement, role)
   *
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} postRequirement - PostRequirement object that was created
   * @param {string} role - User role
   * @returns {Promise<object>} - Created audit log
   */
  static async logCreated(req, userId, userInfo, postRequirement, role) {
    const metadata = new AuditMetadataBuilder(req)
      .withUserInfo(userInfo)
      .withRequestInfo()
      .withEntityFields(postRequirement, POST_REQUIREMENT_METADATA_MAPPING)
      .withEntitySnapshots(null, postRequirement) // No old snapshot for creation
      .build();

    return await logAuditEvent(
      "post_requirement_created",
      userId,
      "PostRequirement",
      postRequirement._id,
      {
        ...metadata,
        role,
      },
    );
  }

  /**
   * Logs when a post requirement is updated
   *
   * USAGE:
   * await PostRequirementAuditHelper.logUpdated(req, userId, userInfo, oldPostRequirement, newPostRequirement, role)
   *
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} oldPostRequirement - PostRequirement object before changes
   * @param {object} newPostRequirement - PostRequirement object after changes
   * @param {string} role - User role
   * @returns {Promise<object>} - Created audit log (single log for all field changes)
   */
  static async logUpdated(
    req,
    userId,
    userInfo,
    oldPostRequirement,
    newPostRequirement,
    role,
  ) {
    // Track changes between old and new post requirement
    const changes = trackChanges(
      oldPostRequirement,
      newPostRequirement,
      POST_REQUIREMENT_FIELD_MAPPING,
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
      .withEntityFields(newPostRequirement, POST_REQUIREMENT_METADATA_MAPPING)
      .withEntitySnapshots(oldPostRequirement, newPostRequirement)
      .withChangeTracking(changes)
      .withCustomFields({
        oldVersion: oldPostRequirement.version,
        newVersion: newPostRequirement.version,
      })
      .build();

    // Log a single audit event for all field changes
    const auditLog = await logAuditEvent(
      "post_requirement_updated",
      userId,
      "PostRequirement",
      newPostRequirement._id,
      {
        ...metadata,
        role,
      },
    );

    return auditLog;
  }

  /**
   * Logs when a post requirement is disabled
   *
   * USAGE:
   * await PostRequirementAuditHelper.logDisabled(req, userId, userInfo, postRequirement, role)
   *
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} postRequirement - PostRequirement object being disabled
   * @param {string} role - User role
   * @returns {Promise<object>} - Created audit log
   */
  static async logDisabled(req, userId, userInfo, postRequirement, role) {
    const metadata = new AuditMetadataBuilder(req)
      .withUserInfo(userInfo)
      .withRequestInfo()
      .withEntityFields(postRequirement, POST_REQUIREMENT_METADATA_MAPPING)
      .withEntitySnapshots(postRequirement, {
        ...postRequirement,
        isActive: false,
      }) // Snapshot before and after
      .withCustomFields({
        previousStatus: postRequirement.isActive ? "active" : "inactive",
      })
      .build();

    return await logAuditEvent(
      "post_requirement_disabled",
      userId,
      "PostRequirement",
      postRequirement._id,
      {
        ...metadata,
        role,
      },
    );
  }
}

module.exports = PostRequirementAuditHelper;
