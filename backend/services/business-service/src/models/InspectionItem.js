const mongoose = require("mongoose");
const { encryptionPlugin } = require("../../../../shared/lib/encryptionPlugin");

const inspectionItemSchema = new mongoose.Schema(
  {
    customId: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    question: {
      type: String,
      required: true,
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
    violationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Violation",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
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

inspectionItemSchema.plugin(encryptionPlugin, {
  fields: [
    "name",
    "question",
    "notes",
    "legalBasis.title",
    "legalBasis.description",
  ],
  deterministicFields: ["name"],
  nestedPaths: ["legalBasis"],
  arrayPaths: [],
  mixedPaths: [],
});

inspectionItemSchema.index({ violationId: 1 });
inspectionItemSchema.index({ isActive: 1 });
inspectionItemSchema.index({ version: 1 });

module.exports = mongoose.model("InspectionItem", inspectionItemSchema);
