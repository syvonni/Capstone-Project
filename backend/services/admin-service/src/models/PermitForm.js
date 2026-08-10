const mongoose = require("mongoose");

// Valid field types for form builder items
const FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "date",
  "select",
  "multiselect",
  "file",
  "download",
  "checkbox",
  "radio",
  "address",
  "address_alaminos",
  "date_range",
  "repeatable_group",
  "category_upload",
];

// Sub-field schema for repeatable_group columns
const GroupFieldSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    type: {
      type: String,
      enum: ["text", "number", "date", "select", "multiselect"],
      default: "text",
    },
    key: { type: String, trim: true, required: true },
    required: { type: Boolean, default: true },
    placeholder: { type: String, default: "" },
    helpText: { type: String, default: "" },
    span: { type: Number, default: 8, min: 1, max: 24 },
    validation: { type: mongoose.Schema.Types.Mixed, default: {} },
    dropdownSource: { type: String, default: "static" },
    dropdownOptions: [{ type: mongoose.Schema.Types.Mixed }],
  },
  { _id: false },
);

// Schema for individual form items
const FormItemSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    required: { type: Boolean, default: true },
    notes: { type: String, default: "" },

    // Field type
    type: { type: String, enum: FIELD_TYPES, default: "text" },

    // Storage key for form-driven UIs (required for claimable document text attribute binding)
    key: { type: String, trim: true, required: false, default: '' },

    // Display / UX
    placeholder: { type: String, default: "" },
    helpText: { type: String, default: "" },
    span: { type: Number, default: 24, min: 1, max: 24 },

    // Validation rules
    validation: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Dropdown configuration
    dropdownSource: { type: String, default: "static" },
    dropdownOptions: [{ type: mongoose.Schema.Types.Mixed }],

    // Download field configuration
    downloadFileName: { type: String, default: "" },
    downloadFileSize: { type: Number, default: 0 },
    downloadFileType: { type: String, default: "" },
    downloadFileUrl: { type: String, default: "" },
    downloadIpfsCid: { type: String, default: "" },

    // Repeatable group configuration
    groupFields: [GroupFieldSchema],
    minRows: { type: Number, default: 1 },
    maxRows: { type: Number, default: 20 },

    // Metadata fields for category_upload
    metadataFields: [
      {
        label: { type: String, required: true },
        type: {
          type: String,
          enum: ["text", "number", "date", "address", "address_alaminos"],
          default: "text",
        },
        key: { type: String, trim: true, required: false, default: '' },
        required: { type: Boolean, default: false },
        placeholder: { type: String, default: "" },
        helpText: { type: String, default: "" },
      },
    ],
  },
  { _id: false },
);

// Schema for form sections
const SectionSchema = new mongoose.Schema(
  {
    sectionName: { type: String, required: true },
    type: { type: String, default: "" },
    description: { type: String, default: "" },
    source: { type: String, default: "" },
    items: [FormItemSchema],
    notes: { type: String, default: "" },
    showWhen: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      description:
        "Optional: { field: string, value?: string, values?: string[] }. Section visible only when formValues[field] === value or formValues[field] in values.",
    },
  },
  { _id: false },
);

const PermitFormSchema = new mongoose.Schema(
  {
    // Form identifier (e.g., 'unified-business-permit', 'cooperative-permit')
    formId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    // Display name
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Description
    description: {
      type: String,
      trim: true,
      default: "",
    },

    // Content - Form sections
    sections: [SectionSchema],

    // Version (simple integer, auto-incremented on save)
    version: {
      type: Number,
      default: 1,
    },

    // Admin notes (hidden from applicants)
    notes: {
      type: String,
      trim: true,
      default: "",
    },

    // Status (active/disabled)
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Form type: 'regular' or 'temporary'
    formType: {
      type: String,
      enum: ['regular', 'temporary'],
      default: 'regular',
      index: true,
    },

    // For temporary permits, the category (e.g., 'cooperative', 'association_foundation')
    category: {
      type: String,
      trim: true,
      default: null,
    },

    // Application fee reference
    feeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Fee",
      default: null,
    },

    // Claimable documents reference
    claimableDocumentIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "ClaimableDocument",
      default: [],
    },

    // Metadata
    createdAt: {
      type: Date,
      default: Date.now,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

const PermitForm = mongoose.model("PermitForm", PermitFormSchema);

module.exports = PermitForm;
