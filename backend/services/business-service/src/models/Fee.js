const mongoose = require("mongoose");

const FeeSchema = new mongoose.Schema(
  {
    customId: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
    },
    name: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
      required: false,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      enum: ['global', 'claimable_document', 'appeal', 'conditional', 'penalty', 'variable_fee', 'application_fee'],
      default: 'global',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true },
);

const { encryptionPlugin } = require("../../../../shared/lib/encryptionPlugin");
FeeSchema.plugin(encryptionPlugin, {
  fields: ["name", "notes"],
  deterministicFields: [],
  nestedPaths: [],
  arrayPaths: [],
  mixedPaths: [],
});

// Index for faster queries
FeeSchema.index({ isActive: 1, category: 1 });
FeeSchema.index({ category: 1 });
FeeSchema.index({ version: 1 });

module.exports = mongoose.models.Fee || mongoose.model("Fee", FeeSchema);
