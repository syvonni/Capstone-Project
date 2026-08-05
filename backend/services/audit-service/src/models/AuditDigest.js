const mongoose = require("mongoose");

/**
 * AuditDigest Model
 * Stores epoch digest roots for mainnet-$1k mode.
 * Each digest represents a batch of audit events anchored as a single on-chain root.
 */
const AuditDigestSchema = new mongoose.Schema(
  {
    digestRoot: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    digestType: {
      type: String,
      enum: ["merkle", "hash_chain"],
      default: "hash_chain",
    },
    leafCount: {
      type: Number,
      required: true,
      min: 1,
    },
    auditLogIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AuditLog",
      },
    ],
    leafHashes: [
      {
        type: String,
      },
    ],
    windowStart: {
      type: Date,
      required: true,
      index: true,
    },
    windowEnd: {
      type: Date,
      required: true,
      index: true,
    },
    // txHash field removed - blockchain feature deleted
    // Previously: transaction hash from blockchain anchoring
    blockNumber: {
      type: Number,
      default: null,
    },
    anchorStatus: {
      type: String,
      enum: ["pending", "anchored", "failed", "retrying"],
      default: "pending",
      index: true,
    },
    anchorError: {
      type: String,
      default: "",
    },
    anchorRetries: {
      type: Number,
      default: 0,
    },
    gasUsed: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true },
);

AuditDigestSchema.index({ anchorStatus: 1, createdAt: 1 });
AuditDigestSchema.index({ windowStart: 1, windowEnd: 1 });

/**
 * Generate inclusion proof for a specific leaf hash
 * For hash_chain type, proof is the ordered list of hashes before the target
 */
AuditDigestSchema.methods.getInclusionProof = function (leafHash) {
  const idx = this.leafHashes.indexOf(leafHash);
  if (idx === -1) return null;

  if (this.digestType === "hash_chain") {
    return {
      type: "hash_chain",
      position: idx,
      precedingHashes: this.leafHashes.slice(0, idx),
      followingHashes: this.leafHashes.slice(idx + 1),
      root: this.digestRoot,
    };
  }

  // For merkle, would need sibling path (not implemented yet)
  return {
    type: "merkle",
    position: idx,
    root: this.digestRoot,
    note: "Full merkle proof not implemented",
  };
};

// verifyInclusion method removed - blockchain feature deleted
// Previously: Verify that a leaf hash is included in this digest

/**
 * Static: find digest containing a specific audit log
 */
AuditDigestSchema.statics.findByAuditLogId = function (auditLogId) {
  return this.findOne({ auditLogIds: auditLogId });
};

/**
 * Static: find pending digests for retry
 */
AuditDigestSchema.statics.findPendingAnchors = function (limit = 10) {
  return this.find({ anchorStatus: { $in: ["pending", "retrying"] } })
    .sort({ createdAt: 1 })
    .limit(limit);
};

module.exports =
  mongoose.models.AuditDigest ||
  mongoose.model("AuditDigest", AuditDigestSchema);
