const mongoose = require("mongoose");

const PerformanceMetricSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      required: true,
      enum: ["variable", "fee", "application", "checklist", "lob", "violation", "inspectionItem", "postRequirement"],
      index: true,
    },
    operation: {
      type: String,
      required: true,
      enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      index: true,
    },
    responseTime: {
      type: Number,
      required: true,
      min: 0,
    },
    success: {
      type: Boolean,
      required: true,
      index: true,
    },
    error: {
      type: String,
      required: false,
    },
    errorName: {
      type: String,
      required: false,
    },
    errorMessage: {
      type: String,
      required: false,
    },
    errorCode: {
      type: String,
      required: false,
    },
    errorStack: {
      type: String,
      required: false,
    },
    severity: {
      type: String,
      enum: ["critical", "high", "medium", "low"],
      required: false,
    },
    correlationId: {
      type: String,
      required: false,
    },
    endpoint: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  { timestamps: true },
);

// TTL index to automatically delete documents after 24 hours
PerformanceMetricSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 24 * 60 * 60 },
);

// Compound indexes for common queries
PerformanceMetricSchema.index({ entityType: 1, operation: 1, createdAt: -1 });
PerformanceMetricSchema.index({ entityType: 1, success: 1, createdAt: -1 });
PerformanceMetricSchema.index({
  entityType: 1,
  operation: 1,
  endpoint: 1,
  createdAt: -1,
});
// Index for error aggregation queries
PerformanceMetricSchema.index({ entityType: 1, success: 1, errorName: 1, errorMessage: 1, createdAt: -1 });

module.exports = mongoose.model("PerformanceMetric", PerformanceMetricSchema);
