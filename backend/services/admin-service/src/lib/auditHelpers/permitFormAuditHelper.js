/**
 * Permit Form Audit Helper
 *
 * PURPOSE: Provides centralized audit logging for Permit Form entities using the audit infrastructure.
 * This follows the SOLID principles by separating audit logic from route handlers.
 *
 * Callers should provide a userInfo object (e.g. `{ name, email }`) when calling
 * the static log methods below.
 */

const { logAuditEvent } = require("../auditClient");

/**
 * Permit Form Audit Helper Class
 *
 * Provides static methods for logging permit form-related audit events
 */
class PermitFormAuditHelper {
  /**
   * Logs when a permit form is created
   *
   * USAGE:
   * await PermitFormAuditHelper.logCreated(req, userId, userInfo, form, role)
   *
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} form - Permit form object that was created
   * @param {string} role - User role
   * @returns {Promise<object>} - Created audit log
   */
  static async logCreated(req, userId, userInfo, form, role) {
    const metadata = {
      userInfo,
      formId: form.formId,
      name: form.name,
      description: form.description,
      isActive: form.isActive,
      applicationFeeAmount: form.applicationFeeAmount,
      feeId: form.feeId,
      requestInfo: {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      },
    };

    return await logAuditEvent(
      "permit_form_created",
      userId,
      "PermitForm",
      form._id,
      {
        ...metadata,
        role,
      },
    );
  }

  /**
   * Logs when a permit form is updated
   *
   * USAGE:
   * await PermitFormAuditHelper.logUpdated(req, userId, userInfo, oldForm, newForm, role)
   *
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} oldForm - Permit form object before changes
   * @param {object} newForm - Permit form object after changes
   * @param {string} role - User role
   * @returns {Promise<object>} - Created audit log
   */
  static async logUpdated(req, userId, userInfo, oldForm, newForm, role) {
    const metadata = {
      userInfo,
      formId: newForm.formId,
      name: newForm.name,
      description: newForm.description,
      isActive: newForm.isActive,
      applicationFeeAmount: newForm.applicationFeeAmount,
      feeId: newForm.feeId,
      requestInfo: {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      },
      changes: {
        oldName: oldForm.name,
        newName: newForm.name,
        oldDescription: oldForm.description,
        newDescription: newForm.description,
        oldIsActive: oldForm.isActive,
        newIsActive: newForm.isActive,
      },
    };

    return await logAuditEvent(
      "permit_form_updated",
      userId,
      "PermitForm",
      newForm._id,
      {
        ...metadata,
        role,
      },
    );
  }

  /**
   * Logs when a permit form version is incremented
   *
   * USAGE:
   * await PermitFormAuditHelper.logVersionIncremented(req, userId, userInfo, form, oldVersion, newVersion, role)
   *
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} form - Permit form object
   * @param {number} oldVersion - Old version number
   * @param {number} newVersion - New version number
   * @param {string} role - User role
   * @returns {Promise<object>} - Created audit log
   */
  static async logVersionIncremented(
    req,
    userId,
    userInfo,
    form,
    oldVersion,
    newVersion,
    role,
  ) {
    const metadata = {
      userInfo,
      formId: form.formId,
      name: form.name,
      oldVersion,
      newVersion,
      requestInfo: {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      },
    };

    return await logAuditEvent(
      "permit_form_version_incremented",
      userId,
      "PermitForm",
      form._id,
      {
        ...metadata,
        role,
      },
    );
  }

  /**
   * Logs when a permit form status is changed
   *
   * USAGE:
   * await PermitFormAuditHelper.logStatusChanged(req, userId, userInfo, form, oldStatus, newStatus, role)
   *
   * @param {object} req - Express request object
   * @param {string} userId - User ID
   * @param {object} userInfo - User info object with name and email
   * @param {object} form - Permit form object
   * @param {boolean} oldStatus - Old active status
   * @param {boolean} newStatus - New active status
   * @param {string} role - User role
   * @returns {Promise<object>} - Created audit log
   */
  static async logStatusChanged(
    req,
    userId,
    userInfo,
    form,
    oldStatus,
    newStatus,
    role,
  ) {
    const metadata = {
      userInfo,
      formId: form.formId,
      name: form.name,
      oldStatus: oldStatus ? "active" : "inactive",
      newStatus: newStatus ? "active" : "inactive",
      requestInfo: {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      },
    };

    return await logAuditEvent(
      "permit_form_status_changed",
      userId,
      "PermitForm",
      form._id,
      {
        ...metadata,
        role,
      },
    );
  }
}

module.exports = PermitFormAuditHelper;
