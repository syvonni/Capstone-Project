/**
 * Variable-Specific Audit Helper
 * 
 * PURPOSE: This helper provides static methods for logging variable-related audit events.
 * It uses the generic change tracker and metadata builder to ensure consistent audit logging
 * for variable operations. It eliminates the need to manually construct audit logs in
 * the variable routes, reducing code duplication and ensuring consistency.
 * 
 * USAGE EXAMPLE (in variable routes):
 * 
 * // BEFORE (manual audit logging):
 * const oldValues = {
 *   name: bracket.name,
 *   minValue: bracket.minValue,
 *   maxValue: bracket.maxValue,
 *   rate: bracket.rate,
 *   // ... 20+ fields
 * }
 * 
 * if (newValues.name !== oldValues.name) {
 *   await logAuditEvent(userId, 'variable_updated', 'Variable', bracketId, 'name', oldValues.name, newValues.name, role, { ...metadata })
 * }
 * // ... 20+ more if statements
 * 
 * // AFTER (using audit helper):
 * await VariableAuditHelper.logUpdated(req, user, oldBracket, newBracket, role)
 * 
 * AVAILABLE METHODS:
 * - logCreated(): Log when a variable is created
 * - logUpdated(): Log when a variable is updated
 * - logDisabled(): Log when a variable is disabled
 * - logCalculationUpdated(): Log when variable calculation is updated
 */

const { trackChanges } = require('../changeTracker');
const { AuditMetadataBuilder } = require('../auditMetadataBuilder');
const { logAuditEvent } = require('../auditClient');

/**
 * Field mapping for variable objects
 * Maps variable field names to themselves (simple case)
 */
const VARIABLE_FIELD_MAPPING = {
  name: true,
  minValue: true,
  maxValue: true,
  rate: true,
  description: true,
  isActive: true,
  version: true,
  taxBracketId: true,
  calculationType: true,
  formula: true,
  fixedAmount: true,
  percentage: true,
  minValueOverride: true,
  maxValueOverride: true,
  effectiveDate: true,
  expiryDate: true,
};

/**
 * Field mapping for metadata construction
 * Maps metadata field names to entity field names
 */
const VARIABLE_METADATA_MAPPING = {
  variableId: '_id',
  name: 'name',
  minValue: 'minValue',
  maxValue: 'maxValue',
  rate: 'rate',
  description: 'description',
  isActive: 'isActive',
  version: 'version',
  taxBracketId: 'taxBracketId',
  calculationType: 'calculationType',
};

/**
 * Variable Audit Helper Class
 * 
 * Provides static methods for logging variable audit events
 */
class VariableAuditHelper {
  /**
   * Logs when a variable is created
   * 
   * USAGE:
   * await VariableAuditHelper.logCreated(req, userId, userInfo, variable, role)
   * 
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} variable - Variable object that was created
   * @param {string} role - User role
   * @returns {Promise<object>} - Created audit log
   */
  static async logCreated(req, userId, userInfo, variable, role) {
    const metadata = new AuditMetadataBuilder(req)
      .withUserInfo(userInfo)
      .withRequestInfo()
      .withEntityFields(variable, VARIABLE_METADATA_MAPPING)
      .withEntityIdentification('Variable', variable._id)
      .withEntitySnapshots(null, variable) // No old snapshot for creation
      .withCustomFields({
        action: 'created',
      })
      .build();

    return await logAuditEvent(
      'variable_created',
      userId,
      'Variable',
      variable._id,
      {
        ...metadata,
        role,
        fieldChanged: null,
        oldValue: null,
        newValue: JSON.stringify(variable),
      }
    );
  }

  /**
   * Logs when a variable is updated
   * 
   * USAGE:
   * await VariableAuditHelper.logUpdated(req, userId, userInfo, oldVariable, newVariable, role)
   * 
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} oldVariable - Variable object before changes
   * @param {object} newVariable - Variable object after changes
   * @param {string} role - User role
   * @returns {Promise<Array<object>>} - Array of created audit logs (one per changed field)
   */
  static async logUpdated(req, userId, userInfo, oldVariable, newVariable, role) {
    // Track changes between old and new variable
    const changes = trackChanges(oldVariable, newVariable, VARIABLE_FIELD_MAPPING, {
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
      .withEntityFields(newVariable, VARIABLE_METADATA_MAPPING)
      .withEntityIdentification('Variable', newVariable._id)
      .withEntitySnapshots(oldVariable, newVariable)
      .withChangeTracking(changes)
      .withCustomFields({
        action: 'updated',
        oldVersion: oldVariable.version,
        newVersion: newVariable.version,
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
        'variable_updated',
        userId,
        'Variable',
        newVariable._id,
        fieldMetadata
      );

      auditLogs.push(auditLog);
    }

    return auditLogs;
  }

  /**
   * Logs when a variable is disabled
   * 
   * USAGE:
   * await VariableAuditHelper.logDisabled(req, userId, userInfo, variable, role, reason)
   * 
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} variable - Variable object being disabled
   * @param {string} role - User role
   * @param {string} reason - Reason for disabling (optional)
   * @returns {Promise<object>} - Created audit log
   */
  static async logDisabled(req, userId, userInfo, variable, role, reason = '') {
    const metadata = new AuditMetadataBuilder(req)
      .withUserInfo(userInfo)
      .withRequestInfo()
      .withEntityFields(variable, VARIABLE_METADATA_MAPPING)
      .withEntityIdentification('Variable', variable._id)
      .withEntitySnapshots(variable, { ...variable, isActive: false }) // Snapshot before and after
      .withCustomFields({
        action: 'disabled',
        disableReason: reason,
        previousStatus: variable.isActive ? 'active' : 'inactive',
      })
      .build();

    return await logAuditEvent(
      'variable_disabled',
      userId,
      'Variable',
      variable._id,
      {
        ...metadata,
        role,
        fieldChanged: 'isActive',
        oldValue: String(variable.isActive),
        newValue: 'false',
      }
    );
  }

  /**
   * Logs when variable calculation is updated
   * 
   * USAGE:
   * await VariableAuditHelper.logCalculationUpdated(req, userId, userInfo, variable, oldCalculation, newCalculation, role)
   * 
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} variable - Variable object
   * @param {string} oldCalculation - Old calculation formula
   * @param {string} newCalculation - New calculation formula
   * @param {string} role - User role
   * @returns {Promise<object>} - Created audit log
   */
  static async logCalculationUpdated(req, userId, userInfo, variable, oldCalculation, newCalculation, role) {
    const metadata = new AuditMetadataBuilder(req)
      .withUserInfo(userInfo)
      .withRequestInfo()
      .withEntityFields(variable, VARIABLE_METADATA_MAPPING)
      .withEntityIdentification('Variable', variable._id)
      .withEntitySnapshots(variable, variable) // Same variable, just calculation changed
      .withCustomFields({
        action: 'calculation_updated',
        updatedByName: userInfo.name,
        oldCalculation,
        newCalculation,
      })
      .build();

    return await logAuditEvent(
      'variable_calculation_updated',
      userId,
      'Variable',
      variable._id,
      {
        ...metadata,
        role,
        fieldChanged: 'calculation',
        oldValue: oldCalculation,
        newValue: newCalculation,
      }
    );
  }

  /**
   * Logs when variable is re-enabled
   * 
   * USAGE:
   * await VariableAuditHelper.logEnabled(req, userId, userInfo, variable, role, reason)
   * 
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} variable - Variable object being enabled
   * @param {string} role - User role
   * @param {string} reason - Reason for enabling (optional)
   * @returns {Promise<object>} - Created audit log
   */
  static async logEnabled(req, userId, userInfo, variable, role, reason = '') {
    const metadata = new AuditMetadataBuilder(req)
      .withUserInfo(userInfo)
      .withRequestInfo()
      .withEntityFields(variable, VARIABLE_METADATA_MAPPING)
      .withEntityIdentification('Variable', variable._id)
      .withEntitySnapshots({ ...variable, isActive: false }, variable) // Snapshot before and after
      .withCustomFields({
        action: 'enabled',
        enableReason: reason,
        previousStatus: variable.isActive ? 'active' : 'inactive',
      })
      .build();

    return await logAuditEvent(
      'variable_updated',
      userId,
      'Variable',
      variable._id,
      {
        ...metadata,
        role,
        fieldChanged: 'isActive',
        oldValue: 'false',
        newValue: 'true',
      }
    );
  }
}

module.exports = VariableAuditHelper;
