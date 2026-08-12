const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "application_status_update",
        "application_review_started",
        "application_approved",
        "application_rejected",
        "application_needs_revision",
        "inspection_assigned",
        "inspection_schedule_changed",
        "appeal_outcome",
        "system_alert",
        "general",
        "approval_request_pending",
        "approval_resolved",
        "restricted_field_attempt",
        "security_alert",
        "recovery_request_pending",
        "deletion_request_pending",
        "auth_login",
        "auth_logout",
        "auth_password_changed",
        "auth_email_changed",
        "auth_email_reverted",
        "auth_mfa_enabled",
        "auth_mfa_disabled",
        "auth_passkey_added",
        "auth_passkey_removed",
        "auth_account_deletion_scheduled",
        "auth_account_deletion_cancelled",
        "auth_session_invalidated",
        "auth_profile_updated",
        "payment_received",
        "payment_due_reminder",
        "post_requirement_due",
        "post_requirement_overdue",
        "post_requirement_verified",
        "retirement_accepted",
        "retirement_rejected",
        "violation_issued",
        "violation_resolved",
        "new_application_submitted",
        "walkin_application_created",
        "retirement_request_received",
        "appeal_submitted",
        "application_needs_approval",
        "inspection_completed",
        "violation_escalated",
        "abandoned_business_detected",
        "reinspection_required",
        "penalty_config_changed",
        "fee_config_changed",
      ],
      default: "general",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    relatedEntityType: {
      type: String,
      enum: [
        "business_application",
        "payment",
        "inspection",
        "system",
        "approval",
        "violation",
        "post_requirement",
        "retirement",
        "appeal",
        "fee_configuration",
        null,
      ],
      default: null,
    },
    relatedEntityId: {
      type: String,
      default: null,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

const { encryptionPlugin } = require("../../../../shared/lib/encryptionPlugin");
NotificationSchema.plugin(encryptionPlugin, {
  fields: ["title", "message", "relatedEntityId"],
  deterministicFields: [],
  nestedPaths: [],
  arrayPaths: [],
  mixedPaths: ["metadata"],
});

// Compound index for efficient queries
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });

module.exports =
  mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);
