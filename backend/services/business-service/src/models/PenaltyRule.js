const mongoose = require("mongoose");

const PenaltyRuleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      enum: ["violation", "late_renewal", "other"],
      default: "other",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDraft: {
      type: Boolean,
      default: false,
    },
    draftOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PenaltyRule",
      default: null,
    },
    version: {
      type: Number,
      default: 1,
    },
    effectiveDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

const { encryptionPlugin } = require("../../../../shared/lib/encryptionPlugin");
PenaltyRuleSchema.plugin(encryptionPlugin, {
  fields: ["name", "description"],
  deterministicFields: [],
  nestedPaths: [],
  arrayPaths: [],
  mixedPaths: [],
});

// Index for faster queries
PenaltyRuleSchema.index({ isActive: 1, category: 1 });
PenaltyRuleSchema.index({ version: 1 });

module.exports =
  mongoose.models.PenaltyRule ||
  mongoose.model("PenaltyRule", PenaltyRuleSchema);
