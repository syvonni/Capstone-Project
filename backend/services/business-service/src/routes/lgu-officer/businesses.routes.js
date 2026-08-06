const express = require("express");
const router = express.Router();
const { requireJwt, requireRole } = require("../../middleware/auth");
const Business = require("../../models/Business");
const { ok: respondOk, error: respondError } = require("../../middleware/respond");

/**
 * GET /api/lgu-officer/businesses
 * Get all approved businesses across the LGU
 */
router.get(
  "/businesses",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  async (req, res) => {
    try {
      const { page = 1, limit = 50, search = "" } = req.query;

      // Build filter - only show active businesses
      const filter = { businessStatus: "active" };

      // Add search filter if provided
      if (search) {
        const searchRegex = new RegExp(search, "i");
        filter.$or = [
          { businessName: searchRegex },
          { registeredBusinessName: searchRegex },
        ];
      }

      const businesses = await Business.find(filter)
        .sort({ updatedAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

      const total = await Business.countDocuments(filter);

      return respondOk(res, 200, {
        businesses,
        meta: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (err) {
      console.error("GET /api/lgu-officer/businesses error:", err);
      return respondError(res, 500, "fetch_error", "Failed to fetch businesses");
    }
  },
);

/**
 * GET /api/lgu-officer/businesses/:id
 * Get business details
 */
router.get(
  "/businesses/:id",
  requireJwt,
  requireRole(["lgu_officer", "staff"]),
  async (req, res) => {
    try {
      const business = await Business.findOne({
        $or: [{ businessId: req.params.id }, { _id: req.params.id }],
      });

      if (!business) {
        return respondError(res, 404, "not_found", "Business not found");
      }

      return respondOk(res, 200, { business });
    } catch (err) {
      console.error("GET /api/lgu-officer/businesses/:id error:", err);
      return respondError(res, 500, "fetch_error", "Failed to fetch business");
    }
  },
);

module.exports = router;
