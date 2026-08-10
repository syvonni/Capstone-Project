const mongoose = require("mongoose");
const { encryptionPlugin } = require("../../../../shared/lib/encryptionPlugin");

const checklistSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    legalBasis: [
      {
        _id: false,
        url: { type: String, trim: true },
        title: { type: String, trim: true },
        description: { type: String, trim: true },
      },
    ],
    items: [
      {
        _id: false,
        inspectionItemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "InspectionItem",
          required: true,
        },
        order: {
          type: Number,
          required: true,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    postRequirementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PostRequirement",
    },
    variableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Variable",
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClaimableDocument",
    },
    version: {
      type: Number,
      default: 1,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

checklistSchema.plugin(encryptionPlugin, {
  fields: [
    "name",
    "description",
    "notes",
    "legalBasis.title",
    "legalBasis.description",
  ],
  deterministicFields: ["name"],
  nestedPaths: ["legalBasis"],
  arrayPaths: [],
  mixedPaths: [],
});

checklistSchema.index({ isActive: 1 });
checklistSchema.index({ version: 1 });
checklistSchema.index({ "items.inspectionItemId": 1 });

module.exports = mongoose.model("Checklist", checklistSchema);
