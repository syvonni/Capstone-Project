/**
 * Violation Audit Helper
 *
 * PURPOSE: Provides centralized audit logging for Violation entities using the generic audit infrastructure.
 * This follows the SOLID principles by separating audit logic from route handlers and using
 * the generic AuditMetadataBuilder for consistent metadata construction.
 *
 * USAGE EXAMPLE:
 * const { ViolationAuditHelper } = require('../lib/auditHelpers/violationAuditHelper');
 * const userInfo = await getUserInfo(req._userId);
 * ViolationAuditHelper.logCreated(req, req._userId, userInfo, violation, "admin")
 *   .catch((err) => console.error("Failed to log audit event for violation create", err));
 */

const { AuditMetadataBuilder } = require('../auditMetadataBuilder');
const { trackChanges } = require('../changeTracker');
const { logAuditEvent } = require('../auditClient');
const Fee = require('../../models/Fee');

/**
 * Helper function to enrich single relationship with name
 */
async function enrichSingleRelation(id, Model) {
  if (!id) return null;
  const entity = await Model.findById(id).select('_id name').lean();
  return entity ? { id: entity._id.toString(), name: entity.name } : null;
}

const VIOLATION_METADATA_MAPPING = {
  code: 'code',
  name: 'name',
  description: 'description',
  notes: 'notes',
  severity: 'severity',
  legalBasis: 'legalBasis',
  correctiveAction: 'correctiveAction',
  feeId: 'feeId',
  isActive: 'isActive',
  version: 'version',
};

const VIOLATION_FIELD_MAPPING = {
  code: 'code',
  name: 'name',
  description: 'description',
  notes: 'notes',
  severity: 'severity',
  legalBasis: 'legalBasis',
  correctiveAction: 'correctiveAction',
  feeId: 'feeId',
  isActive: 'isActive',
  version: 'version',
};

/**
 * Violation Audit Helper Class
 *
 * Provides static methods for logging violation-related audit events
 */
class ViolationAuditHelper {
  /**
   * Logs when a violation is created
   *
   * USAGE:
   * await ViolationAuditHelper.logCreated(req, userId, userInfo, violation, role)
   *
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} violation - Violation object that was created
   * @param {string} role - User role
   * @returns {Promise<object>} - Created audit log
   */
  static async logCreated(req, userId, userInfo, violation, role) {
    // Enrich feeId with name
    const feeWithNames = await enrichSingleRelation(violation.feeId, Fee);

    const enrichedViolation = {
      ...violation.toObject ? violation.toObject() : violation,
      feeId: feeWithNames
    };

    const metadata = new AuditMetadataBuilder(req)
      .withUserInfo(userInfo)
      .withRequestInfo()
      .withEntityFields(enrichedViolation, VIOLATION_METADATA_MAPPING)
      .withEntitySnapshots(null, violation) // No old snapshot for creation
      .build();

    return await logAuditEvent(
      'violation_created',
      userId,
      'Violation',
      violation._id,
      {
        ...metadata,
        role,
      }
    );
  }

  /**
   * Logs when a violation is updated
   *
   * USAGE:
   * await ViolationAuditHelper.logUpdated(req, userId, userInfo, oldViolation, newViolation, role)
   *
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} oldViolation - Violation object before changes
   * @param {object} newViolation - Violation object after changes
   * @param {string} role - User role
   * @returns {Promise<object>} - Created audit log (single log for all field changes)
   */
  static async logUpdated(req, userId, userInfo, oldViolation, newViolation, role) {
    // Track changes between old and new violation
    const changes = trackChanges(oldViolation, newViolation, VIOLATION_FIELD_MAPPING, {
      ignoreFields: ['updatedAt', 'version'], // Ignore these fields
    });

    // If no changes, don't log anything
    if (changes.length === 0) {
      return null;
    }

    // Enrich feeId with name
    const feeWithNames = await enrichSingleRelation(newViolation.feeId, Fee);

    const enrichedViolation = {
      ...newViolation.toObject ? newViolation.toObject() : newViolation,
      feeId: feeWithNames
    };

    // Build base metadata
    const metadata = new AuditMetadataBuilder(req)
      .withUserInfo(userInfo)
      .withRequestInfo()
      .withEntityFields(enrichedViolation, VIOLATION_METADATA_MAPPING)
      .withEntitySnapshots(oldViolation, newViolation)
      .withChangeTracking(changes)
      .withCustomFields({
        oldVersion: oldViolation.version,
        newVersion: newViolation.version,
      })
      .build();

    // Log a single audit event for all field changes
    const auditLog = await logAuditEvent(
      'violation_updated',
      userId,
      'Violation',
      newViolation._id,
      {
        ...metadata,
        role,
      }
    );

    return auditLog;
  }

  /**
   * Logs when a violation is disabled
   *
   * USAGE:
   * await ViolationAuditHelper.logDisabled(req, userId, userInfo, violation, role)
   *
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} violation - Violation object being disabled
   * @param {string} role - User role
   * @returns {Promise<object>} - Created audit log
   */
  static async logDisabled(req, userId, userInfo, violation, role) {
    // Enrich feeId with name
    const feeWithNames = await enrichSingleRelation(violation.feeId, Fee);

    const enrichedViolation = {
      ...violation.toObject ? violation.toObject() : violation,
      feeId: feeWithNames
    };

    const metadata = new AuditMetadataBuilder(req)
      .withUserInfo(userInfo)
      .withRequestInfo()
      .withEntityFields(enrichedViolation, VIOLATION_METADATA_MAPPING)
      .withEntitySnapshots(violation, { ...violation, isActive: false }) // Snapshot before and after
      .withCustomFields({
        previousStatus: violation.isActive ? 'active' : 'inactive',
      })
      .build();

    return await logAuditEvent(
      'violation_disabled',
      userId,
      'Violation',
      violation._id,
      {
        ...metadata,
        role,
      }
    );
  }
}

module.exports = ViolationAuditHelper;
