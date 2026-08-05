const mongoose = require("mongoose");

const PostRequirementSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
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
    legalBasis: [{
      _id: false,
      url: {
        type: String,
        trim: true,
      },
      title: {
        type: String,
        trim: true,
      },
      description: {
        type: String,
        trim: true,
      },
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
    checklistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Checklist",
    },
    customFields: [{
      _id: false,
      key: {
        type: String,
        required: true,
        trim: true,
      },
      label: {
        type: String,
        required: true,
        trim: true,
      },
      type: {
        type: String,
        required: true,
        enum: ['text', 'textarea', 'date', 'boolean', 'number', 'select'],
      },
      required: {
        type: Boolean,
        default: false,
      },
      placeholder: {
        type: String,
        trim: true,
      },
      // Text/textarea specific
      maxLength: {
        type: Number,
      },
      pattern: {
        type: String,
        trim: true,
      },
      // Date specific
      minDate: {
        type: Date,
      },
      maxDate: {
        type: Date,
      },
      // Number specific
      min: {
        type: Number,
      },
      max: {
        type: Number,
      },
      step: {
        type: Number,
      },
      // Boolean specific
      defaultValue: {
        type: Boolean,
      },
      // Select specific
      options: [{
        _id: false,
        value: {
          type: String,
          required: true,
        },
        label: {
          type: String,
          required: true,
        },
      }],
    }],
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
  { timestamps: true },
);

const { encryptionPlugin } = require("../../../../shared/lib/encryptionPlugin");
PostRequirementSchema.plugin(encryptionPlugin, {
  fields: ["name", "description", "notes"],
  deterministicFields: ["name"],
  nestedPaths: [],
  arrayPaths: [],
  mixedPaths: [],
});

// Index for faster queries
PostRequirementSchema.index({ isActive: 1 });

module.exports =
  mongoose.models.PostRequirement ||
  mongoose.model("PostRequirement", PostRequirementSchema);
