const mongoose = require("mongoose");

const BusinessProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Owner Identity Information
    ownerIdentity: {
      fullName: { type: String, default: "" },
      dateOfBirth: { type: Date },
      idType: { type: String, default: "" },
      idNumber: { type: String, default: "" },
      idFileUrl: { type: String, default: "" },
      idFileBackUrl: { type: String, default: "" },
      idFileIpfsCid: { type: String, default: "" },
      isSubmitted: { type: Boolean, default: false },
    },

    // Legal Consent Checkboxes
    consent: {
      confirmTrueAndAccurate: { type: Boolean, default: false },
      acceptLegalDisclaimers: { type: Boolean, default: false },
      acknowledgePrivacyPolicy: { type: Boolean, default: false },
      isSubmitted: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

const { encryptionPlugin } = require("../../../../shared/lib/encryptionPlugin");
BusinessProfileSchema.plugin(encryptionPlugin, {
  fields: [],
  deterministicFields: [],
  nestedPaths: ["ownerIdentity", "consent"],
  arrayPaths: [],
  mixedPaths: [],
});

module.exports = mongoose.model("BusinessProfile", BusinessProfileSchema);
