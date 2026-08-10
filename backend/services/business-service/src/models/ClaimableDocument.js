const mongoose = require("mongoose");

const ClaimableDocumentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
      required: false,
    },
    category: {
      type: String,
      enum: ["permit", "regulatory", "other"],
      default: "permit",
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
      ref: "ClaimableDocument",
      default: null,
    },
    version: {
      type: Number,
      default: 1,
    },
    templateHtml: {
      type: String,
      default: null,
    },
    templateImages: [
      {
        attributeName: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        path: {
          type: String,
          required: true,
        },
      },
    ],
    templateTexts: [
      {
        attributeName: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        previewText: {
          type: String,
          default: "",
        },
        sourceType: {
          type: String,
          enum: ["form_field", "system", "business_profile", "static"],
          required: true,
        },
        // For form_field sourceType
        bindings: [
          {
            formId: {
              type: String,
              required: true,
            },
            sectionIndex: {
              type: Number,
              required: true,
            },
            sectionName: {
              type: String,
              required: true,
            },
            fieldKey: {
              type: String,
              required: true,
            },
          },
        ],
        // For system/business_profile sourceType
        sourceKey: {
          type: String,
        },
        // For static sourceType
        staticValue: {
          type: String,
        },
      },
    ],
    feeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Fee",
      default: null,
    },
    checklistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Checklist",
      default: null,
      validate: {
        validator: async function (value) {
          if (value === null || value === undefined) return true;
          const Checklist = mongoose.model("Checklist");
          const checklist = await Checklist.findById(value);
          return !!checklist;
        },
        message: "Referenced checklist does not exist",
      },
    },
    customId: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
    },
    formIds: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

const { encryptionPlugin } = require("../../../../shared/lib/encryptionPlugin");
ClaimableDocumentSchema.plugin(encryptionPlugin, {
  fields: ["name", "notes"],
  deterministicFields: ["name"],
  nestedPaths: [],
  arrayPaths: [],
  mixedPaths: [],
});

// Index for faster queries
ClaimableDocumentSchema.index({ isActive: 1, category: 1 });
ClaimableDocumentSchema.index({ version: 1 });

module.exports =
  mongoose.models.ClaimableDocument ||
  mongoose.model("ClaimableDocument", ClaimableDocumentSchema);
