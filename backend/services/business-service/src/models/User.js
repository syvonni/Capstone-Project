const mongoose = require("mongoose");
require("./Role"); // Register Role model so User.populate('role') works

const UserSchema = new mongoose.Schema(
  {
    role: { type: mongoose.Schema.Types.ObjectId, ref: "Role", required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phoneNumber: { type: String, default: "", unique: true, sparse: true },
    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    office: { type: String, default: "" },
    isStaff: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    mustChangeCredentials: { type: Boolean, default: false },
    mustSetupMfa: { type: Boolean, default: false },
    avatarUrl: { type: String, default: "" },
    avatarIpfsCid: { type: String, default: "" },
    passwordHash: { type: String, required: true },
    passwordChangedAt: { type: Date, default: null },
    termsAccepted: { type: Boolean, default: false },
    // MFA (Time-based One-Time Password)
    mfaEnabled: { type: Boolean, default: false },
    mfaMethod: { type: String, default: "" },
    mfaSecret: { type: String, default: "" },
    mfaDisableRequestedAt: { type: Date, default: null },
    mfaDisableScheduledFor: { type: Date, default: null },
    mfaDisablePending: { type: Boolean, default: false },
    mfaLastUsedTotpCounter: { type: Number, default: -1 },
    mfaLastUsedTotpAt: { type: Date, default: null },
    fprintEnabled: { type: Boolean, default: false },
    tokenFprint: { type: String, default: "" },
    // OAuth provider metadata
    authProvider: { type: String, default: "" },
    providerId: { type: String, default: "" },
    webauthnCredentials: {
      type: [
        {
          credId: { type: String, required: true },
          publicKey: { type: String, required: true },
          counter: { type: Number, default: 0 },
          transports: { type: [String], default: [] },
        },
      ],
      default: [],
    },
    isEmailVerified: { type: Boolean, default: false },
    lastLoginAt: { type: Date, default: null },
    // Account deletion scheduling (30-day waiting period)
    deletionRequestedAt: { type: Date, default: null },
    deletionScheduledFor: { type: Date, default: null },
    deletionPending: { type: Boolean, default: false },
    // Session invalidation - increment to invalidate all existing tokens
    tokenVersion: { type: Number, default: 0 },
    // Password history - store last 5 password hashes to prevent reuse
    passwordHistory: [{ type: String }],
    // Account lockout - track failed verification attempts
    failedVerificationAttempts: { type: Number, default: 0 },
    accountLockedUntil: { type: Date, default: null },
    lastFailedAttemptAt: { type: Date, default: null },
    // MFA re-enrollment flag
    mfaReEnrollmentRequired: { type: Boolean, default: false },
    // IP tracking for suspicious activity detection
    recentLoginIPs: [
      {
        ip: { type: String, required: true },
        timestamp: { type: Date, required: true },
        location: { type: String, default: "" },
      },
    ],
    // Deletion undo token
    deletionUndoToken: { type: String, default: null },
    deletionUndoExpiresAt: { type: Date, default: null },
    // Theme preference
    theme: { type: String, default: "default" },
    // Blockchain integration fields
    profileHash: { type: String, default: "" },
    profileIpfsCid: { type: String, default: "" },
    userEthereumAddress: { type: String, default: "" },
  },
  { timestamps: true },
);

const { encryptionPlugin } = require("../../../../shared/lib/encryptionPlugin");
UserSchema.plugin(encryptionPlugin, {
  fields: [
    "firstName",
    "lastName",
    "phoneNumber",
    "office",
    "mfaSecret",
    "authProvider",
    "providerId",
    "tokenFprint",
    "avatarUrl",
    "avatarIpfsCid",
    "deletionUndoToken",
    "profileHash",
    "profileIpfsCid",
    "userEthereumAddress",
  ],
  deterministicFields: ["email", "username"],
  nestedPaths: [],
  arrayPaths: ["recentLoginIPs", "webauthnCredentials"],
  mixedPaths: [],
});

UserSchema.set("toJSON", {
  transform: (doc, ret) => {
    if (ret.role && typeof ret.role === "object" && ret.role.slug) {
      ret.role = ret.role.slug;
    }
    return ret;
  },
});

module.exports = mongoose.model("User", UserSchema);
