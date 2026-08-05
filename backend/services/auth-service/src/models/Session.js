const mongoose = require("mongoose");

/**
 * Session Model
 * Tracks active user sessions for session management and timeout enforcement
 */
const SessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tokenVersion: {
      type: Number,
      required: true,
      // Must match user's tokenVersion for session to be valid
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      default: "",
    },
    deviceInfo: {
      type: String,
      default: "",
      // Parsed device/browser info
    },
    lastActivityAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      // Calculated based on role (1hr for BO/Staff, 10min for Admin); index via schema.index below
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    invalidatedAt: {
      type: Date,
      default: null,
    },
    invalidationReason: {
      type: String,
      default: "",
      // e.g., 'password_change', 'manual_logout', 'timeout', 'security'
    },
  },
  { timestamps: true },
);

const { encryptionPlugin } = require("../../../../shared/lib/encryptionPlugin");
SessionSchema.plugin(encryptionPlugin, {
  fields: ["ipAddress", "userAgent", "deviceInfo", "invalidationReason"],
  deterministicFields: [],
  nestedPaths: [],
  arrayPaths: [],
  mixedPaths: [],
});

// Indexes for efficient querying
SessionSchema.index({ userId: 1, isActive: 1 });
SessionSchema.index({ expiresAt: 1 });
SessionSchema.index({ lastActivityAt: 1 });
SessionSchema.index({ tokenVersion: 1 });

// Method to check if session is expired
SessionSchema.methods.isExpired = function () {
  if (!this.isActive) return true;
  if (Date.now() > this.expiresAt.getTime()) return true;
  return false;
};

// Method to update last activity
SessionSchema.methods.updateActivity = function () {
  this.lastActivityAt = new Date();
  // Extend expiration if needed (based on role)
  return this.save();
};

// Method to invalidate session
SessionSchema.methods.invalidate = function (reason = "manual") {
  this.isActive = false;
  this.invalidatedAt = new Date();
  this.invalidationReason = reason;
  // Don't call save() here - let the caller handle saving to avoid ParallelSaveError
  // when called during validation or other hooks
  return Promise.resolve();
};

module.exports =
  mongoose.models.Session || mongoose.model("Session", SessionSchema);
