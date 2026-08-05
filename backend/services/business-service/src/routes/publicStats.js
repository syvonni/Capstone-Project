const express = require("express");
const router = express.Router();
const respond = require("../middleware/respond");
const BusinessProfile = require("../models/BusinessProfile");
const Lob = require("../models/Lob");
const PostRequirement = require("../models/PostRequirement");

// Public endpoint for landing page transparency statistics
router.get("/stats", async (req, res) => {
  try {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear() + 1, 0, 1);

    const [registeredThisYear, processedThisYear, pendingResult] =
      await Promise.all([
        BusinessProfile.aggregate([
          { $unwind: "$businesses" },
          {
            $match: {
              "businesses.businessStatus": "active",
              "businesses.createdAt": { $gte: yearStart, $lt: yearEnd },
            },
          },
          { $count: "count" },
        ]),
        BusinessProfile.aggregate([
          { $unwind: "$businesses" },
          {
            $match: {
              "businesses.applicationStatus": { $in: ["approved", "rejected"] },
              "businesses.reviewedAt": { $gte: yearStart, $lt: yearEnd },
            },
          },
          { $count: "count" },
        ]),
        BusinessProfile.aggregate([
          { $unwind: "$businesses" },
          {
            $match: {
              "businesses.applicationStatus": {
                $in: ["submitted", "under_review"],
              },
            },
          },
          { $count: "count" },
        ]),
      ]);

    const totalRegisteredThisYear = registeredThisYear[0]?.count || 0;
    const applicationsProcessedThisYear = processedThisYear[0]?.count || 0;
    const pendingApplications = pendingResult[0]?.count || 0;

    return respond.success(res, 200, {
      totalRegisteredThisYear,
      applicationsProcessedThisYear,
      pendingApplications,
    });
  } catch (err) {
    console.error("GET /api/public/business/stats error:", err);
    return respond.error(
      res,
      500,
      "stats_error",
      "Failed to fetch public stats",
    );
  }
});

// Public endpoint for LOBs (no authentication required)
router.get("/lobs", async (req, res) => {
  try {
    const { category, isActive, _id } = req.query;
    const filter = { isActive: true };
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (_id) filter._id = _id;

    const lobs = await Lob.find(filter)
      .populate('variables')
      .populate('documents')
      .populate('postRequirements.required')
      .populate('postRequirements.conditional')
      .sort({ category: 1, name: 1 });
    return respond.success(res, 200, { data: lobs });
  } catch (err) {
    console.error("GET /api/public/business/lobs error:", err);
    return respond.error(
      res,
      500,
      "lobs_error",
      "Failed to fetch LOBs"
    );
  }
});

// Public endpoint for PostRequirements (no authentication required)
router.get("/post-requirements", async (req, res) => {
  try {
    const { isActive } = req.query;
    const filter = { isActive: true };
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const postRequirements = await PostRequirement.find(filter).sort({ code: 1 });
    return respond.success(res, 200, { data: postRequirements });
  } catch (err) {
    console.error("GET /api/public/business/post-requirements error:", err);
    return respond.error(
      res,
      500,
      "post_requirements_error",
      "Failed to fetch PostRequirements"
    );
  }
});

module.exports = router;
