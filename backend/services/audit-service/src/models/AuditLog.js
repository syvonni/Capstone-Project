const mongoose = require("mongoose");
const crypto = require("crypto");

const AuditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    fieldChanged: {
      type: String,
      required: false,
      // Removed enum constraint to follow Open/Closed Principle
      // Entity-specific field validation should be handled at the application level
      // This allows any entity type to define its own fields without modifying this schema
    },
    oldValue: {
      type: String,
      default: "",
      // For sensitive fields like password, store hash instead of plain text
    },
    newValue: {
      type: String,
      default: "",
      // For sensitive fields like password, store hash instead of plain text
    },
    hash: {
      type: String,
      required: true,
      unique: true,
      index: true,
      // SHA256 hash of the full audit record (for integrity verification)
    },
    role: {
      type: String,
      required: true,
      // Role of the user who made the change
    },
    entityType: {
      type: String,
      default: "",
      // Type of entity affected (e.g., Application, Business, User)
    },
    entityId: {
      type: String,
      default: "",
      index: true,
      // ID of the entity affected
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      // Additional context: IP address, user agent, approval IDs, etc.
    },
  },
  { timestamps: true },
);

// Index for efficient querying
AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ eventType: 1, createdAt: -1 });

// Compound indexes for entity-specific queries
// These indexes optimize the most common audit log queries by entity type
// Each index supports queries that filter by entity ID in metadata and sort by creation date

// Variables: queries like { "metadata.variableId": "123" } sorted by createdAt
AuditLogSchema.index({ "metadata.variableId": 1, createdAt: -1 });

// Applications: queries like { "metadata.applicationId": "123" } sorted by createdAt
AuditLogSchema.index({ "metadata.applicationId": 1, createdAt: -1 });

// Fees: queries like { "metadata.feeId": "123" } sorted by createdAt
AuditLogSchema.index({ "metadata.feeId": 1, createdAt: -1 });

// Entity type + event type: queries like { entityType: "variable", eventType: "variable_created" } sorted by createdAt
// This index supports filtering by both entity type and event type together
AuditLogSchema.index({ entityType: 1, eventType: 1, createdAt: -1 });

// Additional entity-specific indexes for common query patterns
// These can be added as needed when performance issues are identified
// Examples for future reference:
// AuditLogSchema.index({ 'metadata.businessId': 1, createdAt: -1 });
// AuditLogSchema.index({ 'metadata.penaltyRuleId': 1, createdAt: -1 });
// AuditLogSchema.index({ 'metadata.requirementId': 1, createdAt: -1 });

// Note: Hash is now calculated manually before creating the document
// This avoids validation issues and ensures the hash is always set correctly
// The pre-save hook was removed since we calculate the hash in the route handler

// Static method to create audit log with automatic hash calculation
AuditLogSchema.statics.createAuditLog = async function (data) {
  const auditLog = new this(data);
  await auditLog.save();
  return auditLog;
};

// Static method to get audit history for a user
AuditLogSchema.statics.getUserAuditHistory = async function (
  userId,
  options = {},
) {
  const { limit = 50, skip = 0, eventType } = options;
  const query = { userId };
  if (eventType) {
    query.eventType = eventType;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
};

const { encryptionPlugin } = require("../../../../shared/lib/encryptionPlugin");
AuditLogSchema.plugin(encryptionPlugin, {
  fields: ["oldValue", "newValue", "role"],
  deterministicFields: ["hash"],
  nestedPaths: [],
  arrayPaths: [],
  mixedPaths: [], // Don't encrypt metadata - it needs to be readable for audit display
});

module.exports =
  mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);
