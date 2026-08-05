const mongoose = require("mongoose");

const AppealSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      default: null,
    },
    appealType: {
      type: String,
      enum: [
        "incorrect_fees",
        "wrong_fees",
        "wrong_violations",
        "wrong_assessment",
        "processing_errors",
        "rejection_appeal",
        "other",
      ],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    evidence: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["submitted", "under_review", "approved", "rejected"],
      default: "submitted",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolution: {
      type: String,
      default: "",
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    violationId: {
      type: String,
      default: "",
    },
    inspectionId: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

const { encryptionPlugin } = require("../../../../shared/lib/encryptionPlugin");
AppealSchema.plugin(encryptionPlugin, {
  fields: ["description", "resolution"],
  deterministicFields: ["violationId", "inspectionId"],
  nestedPaths: [],
  arrayPaths: [],
  mixedPaths: [],
});

module.exports =
  mongoose.models.Appeal || mongoose.model("Appeal", AppealSchema);
