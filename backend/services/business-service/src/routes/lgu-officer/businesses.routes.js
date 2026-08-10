const express = require("express");
const router = express.Router();
const { requireJwt, requireRole } = require("../../middleware/auth");
const businessController = require("../../controllers/lgu-officer/business.controller");

/**
 * GET /api/lgu-officer/businesses
 * Get all approved businesses across the LGU
 */
router.get(
  "/businesses",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  (req, res) => businessController.list(req, res)
);

/**
 * GET /api/lgu-officer/businesses/:id
 * Get business details
 */
router.get(
  "/businesses/:id",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  (req, res) => businessController.getById(req, res)
);

/**
 * GET /api/lgu-officer/businesses/data-quality
 * Get data quality report for all businesses
 */
router.get(
  "/businesses/data-quality",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  (req, res) => businessController.getDataQuality(req, res)
);

/**
 * GET /api/lgu-officer/businesses/:id/data-quality
 * Get data quality for single business
 */
router.get(
  "/businesses/:id/data-quality",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  (req, res) => businessController.getDataQualityById(req, res)
);

/**
 * GET /api/lgu-officer/businesses/performance
 * Get performance metrics for businesses
 */
router.get(
  "/businesses/performance",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  (req, res) => businessController.getPerformance(req, res)
);

/**
 * GET /api/lgu-officer/businesses/:id/performance
 * Get performance metrics for single business
 */
router.get(
  "/businesses/:id/performance",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  (req, res) => businessController.getPerformanceById(req, res)
);

module.exports = router;
