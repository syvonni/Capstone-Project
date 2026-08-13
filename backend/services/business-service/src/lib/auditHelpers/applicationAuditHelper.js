/**
 * Application Audit Helper
 *
 * PURPOSE: Centralize rich, consistent audit logging for the application/permit
 * lifecycle. It uses the existing AuditMetadataBuilder and changeTracker pattern
 * from the variable audit feature, but keeps application diffs lightweight and
 * privacy-safe (no full formData snapshots).
 */

const { logAuditEvent } = require("../auditClient");
const { AuditMetadataBuilder } = require("../auditMetadataBuilder");
const { getUserInfo } = require("../../../../../shared/lib/getUserInfo");
const { diffApplication } = require("./applicationDiffHelper");

const DEFAULT_ENTITY_TYPE = "application";

function getBusinessName(doc) {
  if (!doc) return "Unnamed Business";

  const formData = doc.formData;
  const fromFormData =
    formData && typeof formData === "object"
      ? formData.businessName ||
        formData.registeredBusinessName ||
        formData.activityName ||
        formData["Business / trade name"] ||
        formData.businessTradeName ||
        formData.tradeName ||
        formData["Trade / Business Name"]
      : null;

  return (
    doc.businessName ||
    fromFormData ||
    doc.registeredBusinessName ||
    doc.applicationId ||
    doc.businessId ||
    (doc._id ? String(doc._id) : null) ||
    "Unnamed Business"
  );
}

function getEntityId(doc) {
  if (!doc) return null;
  return doc.applicationId || doc.businessId || (doc._id ? String(doc._id) : null);
}

function getEntityType(doc, override) {
  if (override) return override;
  if (!doc) return DEFAULT_ENTITY_TYPE;
  if (doc.constructor && doc.constructor.modelName) {
    // Keep the model casing if available, but normalize common cases
    const modelName = doc.constructor.modelName;
    if (modelName === "Application" || modelName === "Business" || modelName === "GeneralPermit") {
      return modelName;
    }
  }
  return DEFAULT_ENTITY_TYPE;
}

async function buildBaseMetadata(req, userId, doc, role, extraFields = {}) {
  const resolvedRole = role || req?._userRole || req?.user?.role || "unknown";

  const userInfo = await getUserInfo(userId);
  // AuditMetadataBuilder.withUserInfo expects _id for userId metadata
  if (userInfo) {
    userInfo._id = userId;
  }

  const builder = new AuditMetadataBuilder(req)
    .withUserInfo(userInfo)
    .withRequestInfo()
    .withEntityFields(doc, {
      name: "businessName",
      applicationId: "applicationId",
      applicationReferenceNumber: "applicationReferenceNumber",
    })
    .withCustomFields({
      ...extraFields,
      name: getBusinessName(doc),
      userId,
      role: resolvedRole,
    });

  return builder.build();
}

function fireAndForgetLog(eventType, userId, entityType, entityId, metadata) {
  return logAuditEvent(eventType, userId, entityType, entityId, metadata).catch((err) =>
    console.error(`[ApplicationAuditHelper] Failed to log ${eventType}:`, err.message),
  );
}

class ApplicationAuditHelper {
  // --- Creation / draft ---

  static async logCreated(req, userId, application, role) {
    const metadata = await buildBaseMetadata(req, userId, application, role, {
      createdAt: application?.createdAt,
    });
    return fireAndForgetLog(
      "application_created",
      userId,
      getEntityType(application),
      getEntityId(application),
      metadata,
    );
  }

  static async logWalkInCreated(req, officerId, application, role) {
    const metadata = await buildBaseMetadata(req, officerId, application, role, {
      applicationType: application?.applicationType,
      permitType: application?.permitType,
      category: application?.category,
    });
    return fireAndForgetLog(
      "walkin_application_created",
      officerId,
      getEntityType(application),
      getEntityId(application),
      metadata,
    );
  }

  static async logOfficerDraftFinished(req, officerId, application, role) {
    const metadata = await buildBaseMetadata(req, officerId, application, role, {
      applicationStatus: application?.applicationStatus,
      businessId: application?.businessId,
    });
    return fireAndForgetLog(
      "officer_draft_finished",
      officerId,
      getEntityType(application),
      getEntityId(application),
      metadata,
    );
  }

  // --- Updates ---

  static async logAutosaved(req, userId, application, role, changedKeys = []) {
    const metadata = await buildBaseMetadata(req, userId, application, role, {
      changedFields: changedKeys,
      changeCount: changedKeys.length,
      changeSummary: changedKeys.length
        ? `Autosaved fields: ${changedKeys.slice(0, 10).join(", ")}`
        : "Autosave (no changes)",
    });
    return fireAndForgetLog(
      "application_autosaved",
      userId,
      getEntityType(application),
      getEntityId(application),
      metadata,
    );
  }

  static async logUpdated(req, userId, oldApplication, newApplication, role) {
    const diff = diffApplication(oldApplication, newApplication);
    const metadata = await buildBaseMetadata(req, userId, newApplication, role, {
      ...diff,
      updatedAt: newApplication?.updatedAt,
    });
    return fireAndForgetLog(
      "application_updated",
      userId,
      getEntityType(newApplication),
      getEntityId(newApplication),
      metadata,
    );
  }

  // --- Submission ---

  static async logSubmitted(req, userId, application, role, { isResubmit, oldApplication } = {}) {
    const diff = oldApplication ? diffApplication(oldApplication, application) : null;
    const eventType = isResubmit ? "application_resubmitted" : "application_submitted";
    const metadata = await buildBaseMetadata(req, userId, application, role, {
      isResubmit,
      submittedAt: application?.submittedAt,
      applicationReferenceNumber: application?.applicationReferenceNumber,
      ...(diff
        ? {
            changedFields: diff.changedFields,
            changeCount: diff.changeCount,
            changeSummary: diff.changeSummary,
            oldStatus: diff.oldStatus,
            newStatus: diff.newStatus,
          }
        : {}),
    });
    return fireAndForgetLog(
      eventType,
      userId,
      getEntityType(application),
      getEntityId(application),
      metadata,
    );
  }

  // --- Review lifecycle ---

  static async logClaimed(req, officerId, application, role) {
    const metadata = await buildBaseMetadata(req, officerId, application, role, {
      claimedAt: application?.claimedAt,
      reviewedBy: application?.reviewedBy,
    });
    return fireAndForgetLog(
      "application_claimed",
      officerId,
      getEntityType(application),
      getEntityId(application),
      metadata,
    );
  }

  static async logReleased(req, officerId, application, role, { reason } = {}) {
    const metadata = await buildBaseMetadata(req, officerId, application, role, {
      releasedAt: application?.releasedAt || new Date().toISOString(),
      releaseReason: reason,
    });
    return fireAndForgetLog(
      "application_released",
      officerId,
      getEntityType(application),
      getEntityId(application),
      metadata,
    );
  }

  static async logTransferred(req, officerId, application, newOfficerId, role, { oldOfficerId } = {}) {
    const metadata = await buildBaseMetadata(req, officerId, application, role, {
      oldOfficerId,
      newOfficerId,
      reviewedBy: newOfficerId,
    });
    return fireAndForgetLog(
      "application_transferred",
      officerId,
      getEntityType(application),
      getEntityId(application),
      metadata,
    );
  }

  // --- Decisions ---

  static async logApproved(req, officerId, application, comments, oldApplication, role) {
    const diff = oldApplication ? diffApplication(oldApplication, application) : null;
    const metadata = await buildBaseMetadata(req, officerId, application, role, {
      ...(comments ? { comments } : {}),
      reviewedAt: application?.reviewedAt,
      approvedAt: application?.reviewedAt,
      businessId: application?.businessId,
      ...(diff
        ? {
            changedFields: diff.changedFields,
            changeCount: diff.changeCount,
            changeSummary: diff.changeSummary,
            oldStatus: diff.oldStatus,
            newStatus: diff.newStatus,
          }
        : {}),
    });
    return fireAndForgetLog(
      "application_approved",
      officerId,
      getEntityType(application),
      getEntityId(application),
      metadata,
    );
  }

  static async logRejected(req, officerId, application, comments, rejectionReason, oldApplication, role) {
    const diff = oldApplication ? diffApplication(oldApplication, application) : null;
    const shouldLogComments = comments && comments !== rejectionReason;
    const metadata = await buildBaseMetadata(req, officerId, application, role, {
      ...(shouldLogComments ? { comments } : {}),
      ...(rejectionReason ? { rejectionReason } : {}),
      reviewedAt: application?.reviewedAt,
      rejectedAt: application?.reviewedAt,
      ...(diff
        ? {
            changedFields: diff.changedFields,
            changeCount: diff.changeCount,
            changeSummary: diff.changeSummary,
            oldStatus: diff.oldStatus,
            newStatus: diff.newStatus,
          }
        : {}),
    });
    return fireAndForgetLog(
      "application_rejected",
      officerId,
      getEntityType(application),
      getEntityId(application),
      metadata,
    );
  }

  static async logReturned(req, officerId, application, comments, oldApplication, role) {
    const diff = oldApplication ? diffApplication(oldApplication, application) : null;
    const metadata = await buildBaseMetadata(req, officerId, application, role, {
      ...(comments ? { comments } : {}),
      reviewedAt: application?.reviewedAt,
      returnedAt: application?.reviewedAt,
      returnCount: application?.returnCount,
      returnExhausted: application?.returnExhausted,
      ...(diff
        ? {
            changedFields: diff.changedFields,
            changeCount: diff.changeCount,
            changeSummary: diff.changeSummary,
            oldStatus: diff.oldStatus,
            newStatus: diff.newStatus,
          }
        : {}),
    });
    return fireAndForgetLog(
      "application_returned",
      officerId,
      getEntityType(application),
      getEntityId(application),
      metadata,
    );
  }

  static async logAppealRejected(req, officerId, application, appealId, rejectionReason, oldApplication, role) {
    const diff = oldApplication ? diffApplication(oldApplication, application) : null;
    const metadata = await buildBaseMetadata(req, officerId, application, role, {
      appealId,
      ...(rejectionReason ? { rejectionReason } : {}),
      reviewedAt: application?.reviewedAt,
      rejectedAt: application?.reviewedAt,
      outcome: 'rejected',
      granted: false,
      status: 'rejected',
      ...(diff
        ? {
            changedFields: diff.changedFields,
            changeCount: diff.changeCount,
            changeSummary: diff.changeSummary,
            oldStatus: diff.oldStatus,
            newStatus: diff.newStatus,
          }
        : {}),
    });
    return fireAndForgetLog(
      "appeal_rejected",
      officerId,
      getEntityType(application),
      getEntityId(application),
      metadata,
    );
  }

  static async logAppealSubmitted(req, userId, application, appeal, role) {
    const metadata = await buildBaseMetadata(req, userId, application, role, {
      appealId: appeal?._id ? appeal._id.toString() : null,
      appealType: appeal?.appealType,
      businessId: appeal?.businessId,
      applicationId: application?._id ? application._id.toString() : getEntityId(application),
    });
    return fireAndForgetLog(
      "appeal_submitted",
      userId,
      getEntityType(application),
      getEntityId(application),
      metadata,
    );
  }

  static async logAppealResolved(req, officerId, application, appeal, oldApplication, role) {
    const diff = oldApplication ? diffApplication(oldApplication, application) : null;
    const isGranted = appeal?.status === "approved" || appeal?.status === "granted";
    const metadata = await buildBaseMetadata(req, officerId, application, role, {
      appealId: appeal?._id ? appeal._id.toString() : null,
      appealType: appeal?.appealType,
      outcome: appeal?.status,
      granted: isGranted,
      status: appeal?.status,
      resolvedAt: appeal?.resolvedAt,
      ...(isGranted
        ? { approvedAt: appeal?.resolvedAt }
        : { rejectedAt: appeal?.resolvedAt }),
      ...(diff
        ? {
            changedFields: diff.changedFields,
            changeCount: diff.changeCount,
            changeSummary: diff.changeSummary,
            oldStatus: diff.oldStatus,
            newStatus: diff.newStatus,
          }
        : {}),
    });
    return fireAndForgetLog(
      "appeal_resolved",
      officerId,
      getEntityType(application),
      getEntityId(application),
      metadata,
    );
  }

  // --- Field reviews ---

  static async logFieldReviewed(req, officerId, application, fieldKey, decision, reasonCode, reasonOther, role) {
    const metadata = await buildBaseMetadata(req, officerId, application, role, {
      fieldKey,
      fieldDecision: decision,
      reasonCode,
      reasonOther,
    });
    return fireAndForgetLog(
      "field_reviewed",
      officerId,
      getEntityType(application),
      getEntityId(application),
      metadata,
    );
  }

  static async logFieldDecisionsUpdated(req, officerId, application, decisions, oldDecisions, role) {
    const validOldDecisions = (oldDecisions || []).filter(Boolean);
    const oldByField = Array.isArray(oldDecisions)
      ? Object.fromEntries(validOldDecisions.map((d) => [d.fieldKey, d]))
      : oldDecisions || {};

    const validDecisions = (decisions || []).filter(Boolean);
    const changedDecisions = validDecisions.filter((d) => {
      const old = oldByField[d.fieldKey];
      return !old || old.status !== d.status || old.reasonCode !== d.reasonCode || old.reasonOther !== d.reasonOther;
    });

    const metadata = await buildBaseMetadata(req, officerId, application, role, {
      decisionsCount: validDecisions.length,
      changedDecisionsCount: changedDecisions.length,
      changedDecisions: changedDecisions.map((d) => ({
        fieldKey: d.fieldKey,
        decision: d.decision,
        reasonCode: d.reasonCode,
        reasonOther: d.reasonOther,
      })),
      changeSummary:
        changedDecisions.length > 0
          ? `Field decisions updated for: ${changedDecisions.map((d) => d.fieldKey).join(", ")}`
          : "No field decisions changed",
    });
    return fireAndForgetLog(
      "field_decisions_updated",
      officerId,
      getEntityType(application),
      getEntityId(application),
      metadata,
    );
  }

  // --- Pending actions ---

  static async logPendingActionCreated(req, officerId, application, actionType, scheduledAt, payload, role) {
    const metadata = await buildBaseMetadata(req, officerId, application, role, {
      actionType,
      scheduledAt,
      payloadSummary: payload ? summarizePendingPayload(payload) : null,
    });
    return fireAndForgetLog(
      "pending_action_created",
      officerId,
      getEntityType(application),
      getEntityId(application),
      metadata,
    );
  }

  static async logPendingActionCancelled(req, officerId, application, actionType, role) {
    const metadata = await buildBaseMetadata(req, officerId, application, role, {
      actionType,
      cancelledAt: new Date().toISOString(),
    });
    return fireAndForgetLog(
      "pending_action_cancelled",
      officerId,
      getEntityType(application),
      getEntityId(application),
      metadata,
    );
  }

  static async logPendingActionExecuted(req, officerId, application, actionType, newStatus, payload, oldApplication, role) {
    const diff = oldApplication ? diffApplication(oldApplication, application) : null;
    const metadata = await buildBaseMetadata(req, officerId, application, role, {
      actionType,
      newStatus,
      executedAt: new Date().toISOString(),
      payloadSummary: payload ? summarizePendingPayload(payload) : null,
      ...(diff
        ? {
            changedFields: diff.changedFields,
            changeCount: diff.changeCount,
            changeSummary: diff.changeSummary,
            oldStatus: diff.oldStatus,
            newStatus: diff.newStatus,
          }
        : {}),
    });
    return fireAndForgetLog(
      "pending_action_executed",
      officerId,
      getEntityType(application),
      getEntityId(application),
      metadata,
    );
  }

  // --- Other ---

  static async logStatusReset(req, officerId, application, newStatus, oldApplication, role) {
    const diff = oldApplication ? diffApplication(oldApplication, application) : null;
    const metadata = await buildBaseMetadata(req, officerId, application, role, {
      newStatus,
      resetAt: new Date().toISOString(),
      ...(diff
        ? {
            changedFields: diff.changedFields,
            changeCount: diff.changeCount,
            changeSummary: diff.changeSummary,
            oldStatus: diff.oldStatus,
            newStatus: diff.newStatus,
          }
        : {}),
    });
    return fireAndForgetLog(
      "application_status_reset",
      officerId,
      getEntityType(application),
      getEntityId(application),
      metadata,
    );
  }

  static async logDeleted(req, userId, application, role) {
    const metadata = await buildBaseMetadata(req, userId, application, role, {
      deletedAt: new Date().toISOString(),
    });
    return fireAndForgetLog(
      "application_deleted",
      userId,
      getEntityType(application),
      getEntityId(application),
      metadata,
    );
  }

  static async logEmailResent(req, userId, application, emailType, role) {
    const metadata = await buildBaseMetadata(req, userId, application, role, {
      emailType,
      resentAt: new Date().toISOString(),
    });
    return fireAndForgetLog(
      "application_email_resent",
      userId,
      getEntityType(application),
      getEntityId(application),
      metadata,
    );
  }

  static async logEmailStatusReset(req, userId, application, emailType, role) {
    const metadata = await buildBaseMetadata(req, userId, application, role, {
      emailType,
      resetAt: new Date().toISOString(),
    });
    return fireAndForgetLog(
      "application_email_status_reset",
      userId,
      getEntityType(application),
      getEntityId(application),
      metadata,
    );
  }
}

function summarizePendingPayload(payload) {
  if (!payload || typeof payload !== "object") return null;
  const summary = {};
  for (const key of Object.keys(payload)) {
    if (["rejectionReason", "comments", "reviewComments", "reason", "reasonOther", "reasonCode"].includes(key)) {
      summary[key] = payload[key];
    } else if (key === "fieldDecisions" && Array.isArray(payload[key])) {
      summary.decisionsCount = payload[key].length;
      summary.fieldKeys = payload[key].map((d) => d.fieldKey || d.field);
    } else if (key === "newStatus") {
      summary.newStatus = payload[key];
    }
  }
  return summary;
}

module.exports = ApplicationAuditHelper;
