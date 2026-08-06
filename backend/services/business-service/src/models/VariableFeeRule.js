const mongoose = require("mongoose");

const VariableFeeBracketSchema = new mongoose.Schema({
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
});

const VariableFeeClassificationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  fee: {
    type: Number,
    required: true,
    min: 0,
  },
  description: {
    type: String,
    required: false,
  },
});

const VariableFeeRuleSchema = new mongoose.Schema(
  {
    customId: {
      type: String,
      required: false,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
      required: false,
    },
    question: {
      type: String,
      required: true,
    },
    calculationMethod: {
      type: String,
      required: true,
      enum: ['floor_area', 'capitalization', 'gross_sales', 'per_unit', 'percentage', 'custom', 'bracketed', 'classification'],
    },
    customCalculationMethod: {
      type: String,
      required: false,
    },
    baseRate: {
      type: Number,
      required: false,
      min: 0,
    },
    unit: {
      type: String,
      required: true,
    },
    brackets: {
      type: [VariableFeeBracketSchema],
      default: [],
    },
    classifications: {
      type: [VariableFeeClassificationSchema],
      default: [],
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
VariableFeeRuleSchema.plugin(encryptionPlugin, {
  fields: ["name", "notes", "question"],
  deterministicFields: [],
  nestedPaths: [],
  arrayPaths: [],
  mixedPaths: [],
});

module.exports = mongoose.model("VariableFeeRule", VariableFeeRuleSchema);
