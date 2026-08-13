/**
 * Pending Action Service
 *
 * PURPOSE: Handles pending action/undo logic for permit applications.
 * Supports undo window for actions like approve, reject, return, field_decisions.
 *
 * USAGE EXAMPLE:
 * const pendingActionService = require('../services/lgu-officer/pendingAction.service');
 * await pendingActionService.createPendingAction(applicationId, 'approve', payload, officerId, 30);
 */

const Application = require("../../models/Application");
const Business = require("../../models/Business");
const GeneralPermit = require("../../models/GeneralPermit");
const BusinessProfile = require("../../models/BusinessProfile");
const ApplicationAuditHelper = require("../../lib/auditHelpers/applicationAuditHelper");
const applicationEmailService = require("./applicationEmail.service");
const businessCreationService = require("./businessCreation.service");
const { getUserInfo } = require("../../../../../shared/lib/getUserInfo");

class PendingActionService {
  /**
   * Check if pending action has expired
   *
   * @param {object} pendingAction - Pending action object
   * @returns {boolean} - True if expired
   */
  isPendingActionExpired(pendingAction) {
    if (!pendingAction || !pendingAction.expiresAt) {
      return true;
    }
    return new Date() > new Date(pendingAction.expiresAt);
  }

  /**
   * Find document across Application, Business, and GeneralPermit collections
   *
   * @param {string} id - Document ID
   * @returns {Promise<object|null>} - Document or null
   */
  async findDocument(id) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);

    // Try Application collection
    let doc = await Application.findOne({
      $or: isObjectId ? [{ applicationId: id }, { _id: id }] : [{ applicationId: id }],
    });

    // Try Business collection
    if (!doc) {
      doc = await Business.findOne({
        $or: isObjectId ? [{ businessId: id }, { _id: id }] : [{ businessId: id }],
      });
    }

    // Try GeneralPermit collection
    if (!doc) {
      doc = await GeneralPermit.findOne({ _id: id });
    }

    return doc;
  }

  /**
   * Create pending action with undo window
   *
   * @param {string} applicationId - Application ID
   * @param {string} actionType - Action type: complete_review, reject, return, reject_appeal
   * @param {object} payload - Action payload
   * @param {string} officerId - Officer ID
   * @param {number} undoWindowMinutes - Undo window in minutes (default 10)
   * @param {object} [auditContext={}] - Optional audit context (e.g. { req })
   * @returns {Promise<object>} - Updated document
   * @throws {Error} - If document not found or conflict
   */
  async createPendingAction(applicationId, actionType, payload, officerId, undoWindowMinutes = 10, auditContext = {}) {
    const validActionTypes = ["complete_review", "reject", "return", "reject_appeal"];
    if (!actionType || !validActionTypes.includes(actionType)) {
      const error = new Error(`actionType must be one of: ${validActionTypes.join(", ")}`);
      error.code = "INVALID_DATA";
      error.status = 400;
      throw error;
    }

    const doc = await this.findDocument(applicationId);
    if (!doc) {
      const error = new Error("Application not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    // Check if there's already a pending action
    if (doc.pendingAction?.actionType) {
      const error = new Error("A pending action already exists. Cancel it first.");
      error.code = "CONFLICT";
      error.status = 409;
      throw error;
    }

    const now = new Date();
    const scheduledAt = new Date(now.getTime() + undoWindowMinutes * 60 * 1000);

    const updateData = {
      pendingAction: {
        actionType,
        scheduledAt,
        payload: payload || {},
        expiresAt: scheduledAt,
        createdAt: now,
      },
      updatedAt: new Date(),
    };

    // Update based on collection type
    if (doc.constructor.modelName === "Application") {
      await Application.updateOne({ _id: doc._id }, { $set: updateData });
    } else if (doc.constructor.modelName === "GeneralPermit") {
      await GeneralPermit.updateOne({ _id: doc._id }, { $set: updateData });
    } else {
      await Business.updateOne({ _id: doc._id }, { $set: updateData });
    }

    // Log audit event
    await ApplicationAuditHelper.logPendingActionCreated(
      auditContext?.req,
      officerId,
      doc,
      actionType,
      scheduledAt,
      payload,
    );

    // Re-fetch and return updated document
    const updatedDoc = await (doc.constructor.modelName === "Application"
      ? Application.findById(doc._id)
      : doc.constructor.modelName === "GeneralPermit"
        ? GeneralPermit.findById(doc._id)
        : Business.findById(doc._id));

    return updatedDoc;
  }

  /**
   * Cancel/delete pending action
   *
   * @param {string} applicationId - Application ID
   * @param {string} officerId - Officer ID
   * @param {object} [auditContext={}] - Optional audit context (e.g. { req })
   * @returns {Promise<object>} - Updated document
   * @throws {Error} - If document not found
   */
  async cancelPendingAction(applicationId, officerId, auditContext = {}) {
    const doc = await this.findDocument(applicationId);
    if (!doc) {
      const error = new Error("Application not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const updateData = {
      pendingAction: null,
      updatedAt: new Date(),
    };

    // Update based on collection type
    if (doc.constructor.modelName === "Application") {
      await Application.updateOne({ _id: doc._id }, { $set: updateData });
    } else if (doc.constructor.modelName === "GeneralPermit") {
      await GeneralPermit.updateOne({ _id: doc._id }, { $set: updateData });
    } else {
      await Business.updateOne({ _id: doc._id }, { $set: updateData });
    }

    // Log audit event
    await ApplicationAuditHelper.logPendingActionCancelled(
      auditContext?.req,
      officerId,
      doc,
      doc.pendingAction?.actionType,
    );

    // Re-fetch and return updated document
    const updatedDoc = await (doc.constructor.modelName === "Application"
      ? Application.findById(doc._id)
      : doc.constructor.modelName === "GeneralPermit"
        ? GeneralPermit.findById(doc._id)
        : Business.findById(doc._id));

    return updatedDoc;
  }

  /**
   * Get pending action details
   *
   * @param {string} applicationId - Application ID
   * @returns {Promise<object|null>} - Pending action or null
   * @throws {Error} - If document not found
   */
  async getPendingAction(applicationId) {
    const doc = await this.findDocument(applicationId);
    if (!doc) {
      const error = new Error("Application not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    return doc.pendingAction || null;
  }

  /**
   * Execute pending action (called by scheduled job or manual trigger)
   *
   * @param {string} applicationId - Application ID
   * @param {string} officerId - Officer ID
   * @param {object} [auditContext={}] - Optional audit context (e.g. { req })
   * @returns {Promise<object>} - Updated document
   * @throws {Error} - If document not found, no pending action, or expired
   */
  async executePendingAction(applicationId, officerId, auditContext = {}) {
    const doc = await this.findDocument(applicationId);
    if (!doc) {
      const error = new Error("Application not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const pendingAction = doc.pendingAction;
    if (!pendingAction || !pendingAction.actionType) {
      const error = new Error("No pending action to execute");
      error.code = "NO_PENDING_ACTION";
      error.status = 400;
      throw error;
    }

    // Check if expired
    if (this.isPendingActionExpired(pendingAction)) {
      const error = new Error("Pending action has expired");
      error.code = "EXPIRED";
      error.status = 400;
      throw error;
    }

    // Execute the action based on type
    let newStatus = doc.applicationStatus || doc.status;
    if (pendingAction.actionType === "complete_review") {
      newStatus = "approved";
    } else if (pendingAction.actionType === "reject") {
      newStatus = "rejected";
    } else if (pendingAction.actionType === "return") {
      newStatus = "returned";
    } else if (pendingAction.actionType === "reject_appeal") {
      newStatus = "appeal_rejected";
    }

    const now = new Date();
    const officerInfo = await getUserInfo(officerId);
    const officerName = officerInfo?.name || "";

    const updateData = {
      pendingAction: null,
      reviewedBy: officerId,
      reviewedByName: officerName,
      reviewedAt: now,
      updatedAt: now,
    };

    // Use appropriate status field based on model type
    if (doc.constructor.modelName === "GeneralPermit") {
      updateData.status = newStatus;
    } else {
      updateData.applicationStatus = newStatus;
    }

    // Store rejection reason or comments when rejecting
    if (pendingAction.actionType === "reject") {
      updateData.rejectionReason =
        pendingAction.payload?.rejectionReason ||
        pendingAction.payload?.comments ||
        pendingAction.payload?.requestOther;
    }

    // Store comments when approving or returning
    if (["complete_review", "return"].includes(pendingAction.actionType)) {
      updateData.reviewComments =
        pendingAction.payload?.requestOther ||
        pendingAction.payload?.comments ||
        "";
    }

    // Track return count and history for returns
    let returnHistoryEntry = null;
    if (pendingAction.actionType === "return") {
      const newReturnCount = (doc.returnCount || 0) + 1;
      updateData.returnCount = newReturnCount;
      returnHistoryEntry = {
        returnNumber: newReturnCount,
        returnedAt: now,
        returnedBy: officerId,
        returnedByName: officerName,
        reviewComments:
          pendingAction.payload?.requestOther ||
          pendingAction.payload?.comments ||
          "",
        fields: doc.fieldReviewDecisions
          ? JSON.parse(JSON.stringify(doc.fieldReviewDecisions))
          : {},
      };
    }

    // Generate application reference number for approved applications if missing
    if (
      pendingAction.actionType === "complete_review" &&
      !doc.applicationReferenceNumber
    ) {
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
      const randomSeq = Math.floor(1000 + Math.random() * 9000);
      updateData.applicationReferenceNumber = `APP-${dateStr}-${randomSeq}`;
    }

    // Handle appeal rejection - update appeal document
    if (pendingAction.actionType === "reject_appeal") {
      const Appeal = require("../../models/Appeal");
      const appealId = pendingAction.payload?.appealId;
      if (appealId) {
        await Appeal.updateOne(
          { _id: appealId },
          {
            $set: {
              status: "rejected",
              resolution: pendingAction.payload?.rejectionReason || "",
              reviewedBy: officerId,
              reviewedAt: now,
            },
          },
        );
      }
    }

    const oldDoc = doc.toObject();

    // Update based on collection type
    if (doc.constructor.modelName === "Application") {
      const updateOps = { $set: updateData };
      if (returnHistoryEntry) {
        updateOps.$push = { returnHistory: returnHistoryEntry };
      }
      await Application.updateOne({ _id: doc._id }, updateOps);
    } else if (doc.constructor.modelName === "GeneralPermit") {
      await GeneralPermit.updateOne({ _id: doc._id }, { $set: updateData });
    } else {
      await Business.updateOne({ _id: doc._id }, { $set: updateData });
    }

    // Re-fetch updated document for audit logging and email
    const updatedDoc = await (doc.constructor.modelName === "Application"
      ? Application.findById(doc._id)
      : doc.constructor.modelName === "GeneralPermit"
        ? GeneralPermit.findById(doc._id)
        : Business.findById(doc._id));

    // Create business from approved application
    if (
      pendingAction.actionType === "complete_review" &&
      doc.constructor.modelName === "Application"
    ) {
      try {
        const businessProfile = await BusinessProfile.findOne({
          userId: updatedDoc.userId,
        });
        if (businessProfile) {
          await businessCreationService.createBusinessFromApplication(
            updatedDoc,
            businessProfile,
          );
        }
      } catch (businessErr) {
        console.error(
          "[executePendingAction] Failed to create business from approved application:",
          businessErr.message,
        );
      }
    }

    // Log the actual lifecycle audit event (approved/rejected/returned/appeal_rejected)
    switch (pendingAction.actionType) {
      case "complete_review":
        await ApplicationAuditHelper.logApproved(
          auditContext?.req,
          officerId,
          updatedDoc,
          pendingAction.payload?.comments || "",
          oldDoc,
        );
        break;
      case "reject":
        await ApplicationAuditHelper.logRejected(
          auditContext?.req,
          officerId,
          updatedDoc,
          pendingAction.payload?.comments ||
            pendingAction.payload?.requestOther ||
            "",
          pendingAction.payload?.rejectionReason || "",
          oldDoc,
        );
        break;
      case "return":
        await ApplicationAuditHelper.logReturned(
          auditContext?.req,
          officerId,
          updatedDoc,
          pendingAction.payload?.requestOther ||
            pendingAction.payload?.comments ||
            "",
          oldDoc,
        );
        break;
      case "reject_appeal":
        await ApplicationAuditHelper.logAppealRejected(
          auditContext?.req,
          officerId,
          updatedDoc,
          pendingAction.payload?.appealId,
          pendingAction.payload?.rejectionReason || "",
          oldDoc,
        );
        break;
      default:
        // Fallback for any future action types that do not map to a lifecycle event
        await ApplicationAuditHelper.logPendingActionExecuted(
          auditContext?.req,
          officerId,
          updatedDoc,
          pendingAction.actionType,
          newStatus,
          pendingAction.payload,
          oldDoc,
        );
    }

    // Send the appropriate notification email for this final action
    if (doc.constructor.modelName === "Application" || doc.constructor.modelName === "GeneralPermit") {
      try {
        if (pendingAction.actionType === "complete_review") {
          await applicationEmailService.sendApplicationEmail(updatedDoc, "approved");
        } else if (pendingAction.actionType === "reject") {
          await applicationEmailService.sendApplicationEmail(
            updatedDoc,
            "rejected",
            { rejectionReason: pendingAction.payload?.rejectionReason || pendingAction.payload?.requestOther || "" },
          );
        } else if (pendingAction.actionType === "return") {
          await applicationEmailService.sendApplicationEmail(
            updatedDoc,
            "returned",
            { reviewComments: pendingAction.payload?.requestOther || pendingAction.payload?.comments || "" },
          );
        }
      } catch (emailErr) {
        console.error("[executePendingAction] Failed to send notification email:", emailErr.message);
      }
    }

    return updatedDoc;
  }
}

module.exports = new PendingActionService();
