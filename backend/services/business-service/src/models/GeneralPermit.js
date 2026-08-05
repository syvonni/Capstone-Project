const mongoose = require("mongoose");
const {
  GENERAL_PERMIT_CATEGORY_VALUES,
} = require("../../../../shared/constants");

const RequirementSchema = new mongoose.Schema(
  {
    label: { type: String, default: "" },
    type: { type: String, default: "" },
    documentUrl: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "submitted", "verified", "rejected"],
      default: "pending",
    },
  },
  { _id: false },
);

const GeneralPermitSchema = new mongoose.Schema(
  {
    permitCategory: {
      type: String,
      enum: GENERAL_PERMIT_CATEGORY_VALUES,
      required: true,
    },
    requirements: {
      type: [RequirementSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["draft", "submitted", "under_review", "approved", "rejected"],
      default: "draft",
    },
    applicantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    businessPlateNo: {
      type: String,
      default: "",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    issuedAt: {
      type: Date,
      default: null,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      default: null,
    },
    // Pending action with undo window (for complete_review, reject, return)
    pendingAction: {
      actionType: {
        type: String,
        enum: ["complete_review", "reject", "return"],
        default: null,
      },
      scheduledAt: { type: Date, default: null },
      payload: { type: mongoose.Schema.Types.Mixed, default: null },
      expiresAt: { type: Date, default: null },
      createdAt: { type: Date, default: null },
    },
    // Email send status tracking for resend functionality
    emailSendStatus: {
      submitted: {
        status: {
          type: String,
          enum: ["pending", "sent", "failed"],
          default: "pending",
        },
        retryCount: { type: Number, default: 0 },
        lastAttempt: { type: Date, default: null },
        lockUntil: { type: Date, default: null },
      },
      approved: {
        status: {
          type: String,
          enum: ["pending", "sent", "failed"],
          default: "pending",
        },
        retryCount: { type: Number, default: 0 },
        lastAttempt: { type: Date, default: null },
        lockUntil: { type: Date, default: null },
      },
      rejected: {
        status: {
          type: String,
          enum: ["pending", "sent", "failed"],
          default: "pending",
        },
        retryCount: { type: Number, default: 0 },
        lastAttempt: { type: Date, default: null },
        lockUntil: { type: Date, default: null },
      },
      returned: {
        status: {
          type: String,
          enum: ["pending", "sent", "failed"],
          default: "pending",
        },
        retryCount: { type: Number, default: 0 },
        lastAttempt: { type: Date, default: null },
        lockUntil: { type: Date, default: null },
      },
    },
  },
  { timestamps: true },
);

const { encryptionPlugin } = require("../../../../shared/lib/encryptionPlugin");
GeneralPermitSchema.plugin(encryptionPlugin, {
  fields: ["businessPlateNo"],
  deterministicFields: [],
  nestedPaths: [],
  arrayPaths: ["requirements"],
  mixedPaths: [],
});

module.exports =
  mongoose.models.GeneralPermit ||
  mongoose.model("GeneralPermit", GeneralPermitSchema);
