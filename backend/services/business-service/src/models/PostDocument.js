const mongoose = require("mongoose");
const {
  POST_REQUIREMENT_TYPE_VALUES,
} = require("../../../../shared/constants");

const PostDocumentSchema = new mongoose.Schema(
  {
    businessId: {
      type: String,
      required: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    permitId: {
      type: String,
      default: "",
    },
    requirementType: {
      type: String,
      enum: POST_REQUIREMENT_TYPE_VALUES,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    isNewPermit: {
      type: Boolean,
      default: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    submittedDocuments: {
      type: [String],
      default: [],
    },
    documentUrl: {
      type: String,
      default: "",
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    verificationNotes: {
      type: String,
      default: "",
    },
    extensionHistory: [
      {
        previousDueDate: Date,
        newDueDate: Date,
        reason: { type: String, default: "" },
        extendedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        extendedAt: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: ["pending", "submitted", "verified", "overdue", "non_compliant"],
      default: "pending",
    },
  },
  { timestamps: true },
);

const { encryptionPlugin } = require("../../../../shared/lib/encryptionPlugin");
PostDocumentSchema.plugin(encryptionPlugin, {
  fields: ["description", "documentUrl", "verificationNotes"],
  deterministicFields: ["businessId", "permitId"],
  nestedPaths: [],
  arrayPaths: ["submittedDocuments", "extensionHistory"],
  mixedPaths: [],
});

module.exports =
  mongoose.models.PostDocument ||
  mongoose.model("PostDocument", PostDocumentSchema);
