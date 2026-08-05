const mongoose = require("mongoose");
const { BUSINESS_TYPE_VALUES } = require("../../../../shared/constants");

const ApplicationSchema = new mongoose.Schema(
  {
    applicationId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      default: null,
    },
    businessName: {
      type: String,
      default: "",
    },

    // Application workflow
    applicationType: {
      type: String,
      enum: ["", "new", "renewal", "amendment", "additional"],
      default: "new",
    },
    applicationStatus: {
      type: String,
      enum: [
        "draft",
        "officer_draft",
        "requirements_viewed",
        "form_completed",
        "documents_uploaded",
        "bir_registered",
        "agencies_registered",
        "submitted",
        "resubmit",
        "under_review",
        "approved",
        "rejected",
        "needs_revision",
        "appeal_pending",
      ],
      default: "draft",
    },
    applicationReferenceNumber: {
      type: String,
      default: "",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedByName: {
      type: String,
      default: "",
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewers: [
      {
        officerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        officerName: {
          type: String,
        },
      },
    ],
    reviewComments: {
      type: String,
      default: "",
    },
    rejectionReason: {
      type: String,
      default: "",
    },
    hasActiveAppeal: {
      type: Boolean,
      default: false,
    },
    appealId: {
      type: String,
      default: "",
    },
    appealExhausted: {
      type: Boolean,
      default: false,
    },
    hadAppealGranted: {
      type: Boolean,
      default: false,
    },
    originalRejectionReason: {
      type: String,
      default: "",
    },
    returnCount: {
      type: Number,
      default: 0,
    },
    returnExhausted: {
      type: Boolean,
      default: false,
    },
    fieldReviewDecisions: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    // Pending action with undo window (for complete_review, reject, return, reject_appeal)
    pendingAction: {
      actionType: {
        type: String,
        enum: ["complete_review", "reject", "return", "reject_appeal"],
        default: null,
      },
      scheduledAt: { type: Date, default: null },
      payload: { type: mongoose.Schema.Types.Mixed, default: null },
      expiresAt: { type: Date, default: null },
      createdAt: { type: Date, default: null },
    },

    // Form data
    formType: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      default: "",
    },
    permitFormId: {
      type: String,
      default: null,
    },
    formData: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    lguDocuments: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },

    // Business details from application
    organizationType: {
      type: String,
      enum: [
        "",
        "sole_proprietorship",
        "partnership",
        "corporation",
        "cooperative",
      ],
      default: "",
    },
    businessPlateNo: {
      type: String,
      default: "",
    },
    yearEstablished: {
      type: Number,
      default: null,
    },
    houseBldgNo: {
      type: String,
      default: "",
    },
    buildingName: {
      type: String,
      default: "",
    },
    subdivision: {
      type: String,
      default: "",
    },
    blockCode: {
      type: String,
      default: "",
    },
    pin: {
      type: String,
      default: "",
    },
    buildingRegistryNo: {
      type: String,
      default: "",
    },
    businessAreaSqm: {
      type: Number,
      default: 0,
    },
    totalEmployees: {
      type: Number,
      default: 0,
    },
    employeesResidingInLgu: {
      type: Number,
      default: 0,
    },
    ownerAddress: {
      street: { type: String, default: "" },
      barangay: { type: String, default: "" },
      city: { type: String, default: "" },
      province: { type: String, default: "" },
      zipCode: { type: String, default: "" },
    },
    lessorInfo: {
      name: { type: String, default: "" },
      businessAddress: { type: String, default: "" },
    },
    emergencyContact: {
      name: { type: String, default: "" },
      phone: { type: String, default: "" },
      relationship: { type: String, default: "" },
    },
    presidentName: {
      type: String,
      default: "",
    },
    treasurerName: {
      type: String,
      default: "",
    },
    businessActivities: [
      {
        taxCode: { type: String, default: "" },
        lineOfBusiness: { type: String, default: "" },
        detailedLine: { type: String, default: "" },
        psicCode: { type: String, default: "" },
        grossSales: { type: Number, default: 0 },
        _id: false,
      },
    ],
    capital: {
      initialBuilding: { type: Number, default: 0 },
      mev: [
        {
          description: { type: String },
          amount: { type: Number, default: 0 },
          _id: false,
        },
      ],
      equity: { type: Number, default: 0 },
      payable: { type: Number, default: 0 },
    },
    accreditations: {
      dtiSecCda: { type: String, default: "" },
      nfa: { type: String, default: "" },
      bfad: { type: String, default: "" },
      bir: { type: String, default: "" },
      tin: { type: String, default: "" },
      other: { type: String, default: "" },
    },
    oathOfUndertaking: {
      type: Boolean,
      default: false,
    },

    // BIR registration
    birRegistration: {
      registrationNumber: { type: String, default: "" },
      certificateUrl: { type: String, default: "" },
      registrationFee: { type: Number, default: 500 },
      documentaryStampTax: { type: Number, default: 0 },
      businessCapital: { type: Number, default: 0 },
      booksOfAccountsUrl: { type: String, default: "" },
      authorityToPrintUrl: { type: String, default: "" },
      paymentReceiptUrl: { type: String, default: "" },
      certificateIpfsCid: { type: String, default: "" },
      booksOfAccountsIpfsCid: { type: String, default: "" },
      authorityToPrintIpfsCid: { type: String, default: "" },
      paymentReceiptIpfsCid: { type: String, default: "" },
    },

    // Other agency registrations
    otherAgencyRegistrations: {
      hasEmployees: { type: Boolean, default: false },
      sss: {
        registered: { type: Boolean, default: false },
        proofUrl: { type: String, default: "" },
        proofIpfsCid: { type: String, default: "" },
      },
      philhealth: {
        registered: { type: Boolean, default: false },
        proofUrl: { type: String, default: "" },
        proofIpfsCid: { type: String, default: "" },
      },
      pagibig: {
        registered: { type: Boolean, default: false },
        proofUrl: { type: String, default: "" },
        proofIpfsCid: { type: String, default: "" },
      },
    },

    submittedAt: {
      type: Date,
    },
    submittedToLguOfficer: {
      type: Boolean,
      default: false,
    },
    isSubmitted: {
      type: Boolean,
      default: false,
    },
    createdByOfficer: {
      type: Boolean,
      default: false,
    },
    // Email send status tracking for resend functionality
    emailSendStatus: {
      submitted: {
        status: {
          type: String,
          enum: ["pending", "sent", "failed"],
          default: "pending",
        },
        retryCount: { type: Number, default: 0 },
        lastAttempt: { type: Date, default: null },
        lockUntil: { type: Date, default: null },
      },
      resubmitted: {
        status: {
          type: String,
          enum: ["pending", "sent", "failed"],
          default: "pending",
        },
        retryCount: { type: Number, default: 0 },
        lastAttempt: { type: Date, default: null },
        lockUntil: { type: Date, default: null },
      },
      approved: {
        status: {
          type: String,
          enum: ["pending", "sent", "failed"],
          default: "pending",
        },
        retryCount: { type: Number, default: 0 },
        lastAttempt: { type: Date, default: null },
        lockUntil: { type: Date, default: null },
      },
      rejected: {
        status: {
          type: String,
          enum: ["pending", "sent", "failed"],
          default: "pending",
        },
        retryCount: { type: Number, default: 0 },
        lastAttempt: { type: Date, default: null },
        lockUntil: { type: Date, default: null },
      },
      returned: {
        status: {
          type: String,
          enum: ["pending", "sent", "failed"],
          default: "pending",
        },
        retryCount: { type: Number, default: 0 },
        lastAttempt: { type: Date, default: null },
        lockUntil: { type: Date, default: null },
      },
      appeal_denied: {
        status: {
          type: String,
          enum: ["pending", "sent", "failed"],
          default: "pending",
        },
        retryCount: { type: Number, default: 0 },
        lastAttempt: { type: Date, default: null },
        lockUntil: { type: Date, default: null },
      },
      appeal_approved: {
        status: {
          type: String,
          enum: ["pending", "sent", "failed"],
          default: "pending",
        },
        retryCount: { type: Number, default: 0 },
        lastAttempt: { type: Date, default: null },
        lockUntil: { type: Date, default: null },
      },
    },
  },
  { timestamps: true },
);

const { encryptionPlugin } = require("../../../../shared/lib/encryptionPlugin");
ApplicationSchema.plugin(encryptionPlugin, {
  fields: [],
  deterministicFields: ["applicationReferenceNumber", "reviewedByName"],
  // applicationStatus excluded from encryption - needed for filtering queries
  nestedPaths: [
    "ownerAddress",
    "lessorInfo",
    "emergencyContact",
    "birRegistration",
    "otherAgencyRegistrations",
  ],
  arrayPaths: ["businessActivities", "capital.mev"],
  arrayPathsExclude: {
    reviewers: ["officerId", "officerName"],
  },
  // fieldReviewDecisions removed from mixedPaths - needs to be readable for frontend status checks
});

module.exports = mongoose.model("Application", ApplicationSchema);
