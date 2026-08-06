const mongoose = require("mongoose");

const PerformanceMetricSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      required: true,
      enum: ['variable', 'fee', 'application', 'checklist', 'lob', 'violation'],
      index: true,
    },
    operation: {
      type: String,
      required: true,
      enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
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
    endpoint: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  },
  { timestamps: true },
);

// TTL index to automatically delete documents after 30 days
PerformanceMetricSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Compound indexes for common queries
PerformanceMetricSchema.index({ entityType: 1, operation: 1, createdAt: -1 });
PerformanceMetricSchema.index({ entityType: 1, success: 1, createdAt: -1 });
PerformanceMetricSchema.index({ entityType: 1, operation: 1, endpoint: 1, createdAt: -1 });

module.exports = mongoose.model("PerformanceMetric", PerformanceMetricSchema);
