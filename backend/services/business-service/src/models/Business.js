const mongoose = require("mongoose");
const { BUSINESS_TYPE_VALUES } = require("../../../../shared/constants");

const BusinessSchema = new mongoose.Schema(
  {
    businessId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    ownerProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusinessProfile",
      required: true,
    },
    approvedApplicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      default: null,
    },

    // Business entity fields
    businessName: {
      type: String,
      required: true,
    },
    registeredBusinessName: {
      type: String,
      default: "",
    },
    businessStatus: {
      type: String,
      enum: ["active", "inactive", "closed"],
      default: "active",
    },
    registrationStatus: {
      type: String,
      enum: ["not_yet_registered", "proposed"],
      default: "not_yet_registered",
    },
    applicationStatus: {
      type: String,
      enum: [
        "draft",
        "pending",
        "submitted",
        "under_review",
        "approved",
        "rejected",
        "returned",
      ],
      default: "draft",
    },
    applicationReferenceNumber: {
      type: String,
      default: "",
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
    formType: {
      type: String,
      default: "permit",
    },
    category: {
      type: String,
      default: "",
    },
    formData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    claimedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    location: {
      street: { type: String, default: "" },
      barangay: { type: String, default: "" },
      city: { type: String, default: "" },
      municipality: { type: String, default: "" },
      province: { type: String, default: "" },
      zipCode: { type: String, default: "" },
      geolocation: {
        lat: { type: Number },
        lng: { type: Number },
      },
      mailingAddress: { type: String, default: "" },
    },
    businessType: {
      type: String,
      enum: BUSINESS_TYPE_VALUES,
    },
    registrationAgency: {
      type: String,
      enum: [
        "DTI",
        "SEC",
        "LGU",
        "CDA",
        "BIR",
        "Barangay_Office",
        "FDA",
        "BFAD",
        "DA",
        "DENR",
        "PRC",
        "MARITIME_INDUSTRY_AUTHORITY",
      ],
    },
    businessRegistrationNumber: {
      type: String,
      required: true,
    },
    businessStartDate: {
      type: Date,
    },
    numberOfBranches: {
      type: Number,
      default: 0,
    },
    industryClassification: {
      type: String,
      default: "",
    },
    taxIdentificationNumber: {
      type: String,
      default: "",
    },
    contactNumber: {
      type: String,
      default: "",
    },

    // Risk profile
    riskProfile: {
      businessSize: { type: Number, default: null },
      annualRevenue: { type: Number, default: null },
      businessActivitiesDescription: { type: String, default: "" },
      riskLevel: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "low",
      },
    },

    // Retirement/cessation
    retirementStatus: {
      type: String,
      enum: [
        "",
        "requested",
        "inspector_verified",
        "pending_tax_payment",
        "confirmed",
        "rejected",
      ],
      default: "",
    },
    retirementRequestedAt: {
      type: Date,
      default: null,
    },
    retirementApplicationLetter: {
      type: String,
      default: "",
    },
    swornStatementGrossSales: {
      type: Number,
      default: 0,
    },
    yearsActive: {
      type: Number,
      default: 0,
    },
    inspectorVerifiedClosed: {
      type: Boolean,
      default: false,
    },
    inspectorVerifiedAt: {
      type: Date,
      default: null,
    },
    retirementConfirmedAt: {
      type: Date,
      default: null,
    },
    retirementRejectionReason: {
      type: String,
      default: "",
    },

    permitRevoked: {
      type: Boolean,
      default: false,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revokedReason: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

const { encryptionPlugin } = require("../../../../shared/lib/encryptionPlugin");
BusinessSchema.plugin(encryptionPlugin, {
  fields: [],
  deterministicFields: [
    "businessId",
    "businessRegistrationNumber",
    "taxIdentificationNumber",
  ],
  nestedPaths: ["location", "riskProfile"],
  arrayPaths: [],
  mixedPaths: [],
  arrayPathsExclude: {
    "": [
      "applicationStatus",
      "applicationReferenceNumber",
      "businessName",
      "registeredBusinessName",
      "businessStatus",
      "registrationStatus",
      "isPrimary",
      "formType",
      "category",
      "submittedAt",
      "reviewedBy",
      "claimedBy",
    ],
  },
});

module.exports = mongoose.model("Business", BusinessSchema);
