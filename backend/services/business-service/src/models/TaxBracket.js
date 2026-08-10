const mongoose = require("mongoose");

const TaxBracketSchema = new mongoose.Schema(
  {
    lobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lob",
      required: true,
    },
    taxBasis: {
      type: String,
      required: true,
      enum: [
        "capitalization",
        "gross_sales",
        "floor_area",
        "number_of_employees",
      ],
    },
    name: {
      type: String,
      required: true,
    },
    minValue: {
      type: Number,
      required: true,
      min: 0,
    },
    maxValue: {
      type: Number,
      required: false,
      min: 0,
    },
    fixedAmount: {
      type: Number,
      required: false,
      min: 0,
    },
    excessRate: {
      type: Number,
      required: false,
      min: 0,
      max: 1,
    },
    excessRateType: {
      type: String,
      required: false,
      enum: ["direct", "percentage_of_percentage"],
    },
    notes: {
      type: String,
      required: false,
    },
    paymentFrequency: {
      type: String,
      required: false,
      enum: ["annual", "monthly"],
      default: "annual",
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

// Add indexes for performance
TaxBracketSchema.index({ lobId: 1 });

const { encryptionPlugin } = require("../../../../shared/lib/encryptionPlugin");
TaxBracketSchema.plugin(encryptionPlugin, {
  fields: ["name", "notes"],
  deterministicFields: [],
  nestedPaths: [],
  arrayPaths: [],
  mixedPaths: [],
});

module.exports = mongoose.model("TaxBracket", TaxBracketSchema);
