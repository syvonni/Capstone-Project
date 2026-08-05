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

const { AuditMetadataBuilder } = require('../auditMetadataBuilder');
const { trackChanges } = require('../changeTracker');
const { logAuditEvent } = require('../auditClient');

const POST_REQUIREMENT_METADATA_MAPPING = {
  postRequirementId: '_id',
  code: 'code',
  name: 'name',
  description: 'description',
  notes: 'notes',
  legalBasis: 'legalBasis',
  isActive: 'isActive',
  checklistId: 'checklistId',
  customFields: 'customFields',
  version: 'version',
};

const POST_REQUIREMENT_FIELD_MAPPING = {
  code: 'code',
  name: 'name',
  description: 'description',
  notes: 'notes',
  legalBasis: 'legalBasis',
  isActive: 'isActive',
  checklistId: 'checklistId',
  customFields: 'customFields',
  version: 'version',
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
      .withEntityIdentification('PostRequirement', postRequirement._id)
      .withEntitySnapshots(null, postRequirement) // No old snapshot for creation
      .withCustomFields({
        action: 'created',
      })
      .build();

    return await logAuditEvent(
      'post_requirement_created',
      userId,
      'PostRequirement',
      postRequirement._id,
      {
        ...metadata,
        role,
        fieldChanged: null,
        oldValue: null,
        newValue: JSON.stringify(postRequirement),
      }
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
   * @returns {Promise<Array<object>>} - Array of created audit logs (one per changed field)
   */
  static async logUpdated(req, userId, userInfo, oldPostRequirement, newPostRequirement, role) {
    // Track changes between old and new post requirement
    const changes = trackChanges(oldPostRequirement, newPostRequirement, POST_REQUIREMENT_FIELD_MAPPING, {
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
      .withEntityFields(newPostRequirement, POST_REQUIREMENT_METADATA_MAPPING)
      .withEntityIdentification('PostRequirement', newPostRequirement._id)
      .withEntitySnapshots(oldPostRequirement, newPostRequirement)
      .withChangeTracking(changes)
      .withCustomFields({
        action: 'updated',
        oldVersion: oldPostRequirement.version,
        newVersion: newPostRequirement.version,
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
        'post_requirement_updated',
        userId,
        'PostRequirement',
        newPostRequirement._id,
        fieldMetadata
      );
      auditLogs.push(auditLog);
    }
    return auditLogs;
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
      .withEntityIdentification('PostRequirement', postRequirement._id)
      .withEntitySnapshots(postRequirement, { ...postRequirement, isActive: false }) // Snapshot before and after
      .withCustomFields({
        action: 'disabled',
        previousStatus: postRequirement.isActive ? 'active' : 'inactive',
      })
      .build();

    return await logAuditEvent(
      'post_requirement_disabled',
      userId,
      'PostRequirement',
      postRequirement._id,
      {
        ...metadata,
        role,
        fieldChanged: 'isActive',
        oldValue: String(postRequirement.isActive),
        newValue: 'false',
      }
    );
  }
}

module.exports = PostRequirementAuditHelper;
