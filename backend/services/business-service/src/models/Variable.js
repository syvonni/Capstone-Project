const mongoose = require("mongoose");

const VariableBracketSchema = new mongoose.Schema({
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

const VariableClassificationSchema = new mongoose.Schema({
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

const VariableSchema = new mongoose.Schema(
  {
    customId: {
      type: String,
      required: false,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    question: {
      type: String,
      required: true,
      maxlength: 500,
    },
    calculationMethod: {
      type: String,
      required: true,
      enum: ['per_unit', 'percentage', 'custom', 'bracketed', 'classification', 'yes_no'],
    },
    customCalculationMethod: {
      type: String,
      required: false,
      maxlength: 500,
    },
    baseRate: {
      type: Number,
      required: false,
      min: 0,
    },
    unit: {
      type: String,
      required: true,
      maxlength: 50,
    },
    unitSingular: {
      type: String,
      required: true,
      maxlength: 50,
    },
    unitPlural: {
      type: String,
      required: true,
      maxlength: 50,
    },
    unitContextSingular: {
      type: String,
      required: true,
      maxlength: 50,
    },
    unitContextPlural: {
      type: String,
      required: true,
      maxlength: 50,
    },
    brackets: {
      type: [VariableBracketSchema],
      default: [],
    },
    classifications: {
      type: [VariableClassificationSchema],
      default: [],
    },
    fixedAmount: {
      type: Number,
      required: false,
      min: 0,
    },
    legalBasis: [{
      _id: false,
      url: { type: String, trim: true },
      title: { type: String, trim: true },
      description: { type: String, trim: true }
    }],
    feeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Fee',
      default: null,
    },
    variableFeeRuleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VariableFeeRule',
      default: null,
    },
    checklistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Checklist',
      default: null,
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
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true },
);

const { encryptionPlugin } = require("../../../../shared/lib/encryptionPlugin");
VariableSchema.plugin(encryptionPlugin, {
  fields: ["name", "description", "notes", "question"],
  deterministicFields: ["name"],
  nestedPaths: [],
  arrayPaths: [],
  mixedPaths: [],
});

VariableSchema.index({ customId: 1 });
VariableSchema.index({ calculationMethod: 1 });
VariableSchema.index({ isActive: 1 });

module.exports = mongoose.model("Variable", VariableSchema);
