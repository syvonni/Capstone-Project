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
        "system_alert",
        "general",
        "approval_request_pending",
        "approval_resolved",
        "restricted_field_attempt",
        "security_alert",
        "recovery_request_pending",
        "deletion_request_pending",
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
        "system",
        "approval",
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

NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });

const { encryptionPlugin } = require("../../../../shared/lib/encryptionPlugin");
NotificationSchema.plugin(encryptionPlugin, {
  fields: ["title", "message", "relatedEntityId"],
  deterministicFields: [],
  nestedPaths: [],
  arrayPaths: [],
  mixedPaths: ["metadata"],
});

module.exports =
  mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);
