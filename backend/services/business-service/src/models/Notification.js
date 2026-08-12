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
        "post_requirement_due",
        "post_requirement_overdue",
        "general",
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
        "post_requirement",
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

NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });

module.exports =
  mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);
