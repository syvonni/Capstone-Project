const express = require("express");
const BusinessProfile = require("../models/BusinessProfile");
const GeneralPermit = require("../models/GeneralPermit");
const OccupationalPermit = require("../models/OccupationalPermit");
const PostDocument = require("../models/PostDocument");
const Appeal = require("../models/Appeal");
const EditRequest = require("../models/EditRequest");
const { requireJwt, requireRole } = require("../middleware/auth");

const router = express.Router();

/**
 * GET /api/business/dashboard/owner-stats
 * Dashboard stats for business owner
 */
router.get("/owner-stats", requireJwt, async (req, res) => {
  try {
    const userId = req._userId;

    const [profile, postReqs, appeals, editRequests] = await Promise.all([
      BusinessProfile.findOne({ userId }).lean(),
      PostDocument.find({ ownerId: userId }).lean(),
      Appeal.find({ requestedBy: userId }).lean(),
      EditRequest.find({ requestedBy: userId }).lean(),
    ]);

    const businesses = profile?.businesses || [];
    const activeBusinesses = businesses.filter(
      (b) => b.businessStatus === "active",
    );
    const currentYear = new Date().getFullYear();

    // Renewal status
    const renewalsDue = [];
    for (const biz of activeBusinesses) {
      const hasRenewal = (biz.renewals || []).some(
        (r) => r.renewalYear === currentYear && r.renewalStatus !== "draft",
      );
      if (!hasRenewal) {
        renewalsDue.push({
          businessId: biz.businessId,
          businessName: biz.businessName || biz.registeredBusinessName,
        });
      }
    }

    // Post-requirements
    const pendingPostReqs = postReqs.filter((r) => r.status === "pending");
    const overduePostReqs = postReqs.filter(
      (r) => r.status === "pending" && new Date(r.dueDate) < new Date(),
    );

    return res.json({
      data: {
        totalBusinesses: businesses.length,
        activeBusinesses: activeBusinesses.length,
        renewalsDue: renewalsDue.length,
        renewalsDueList: renewalsDue.slice(0, 5),
        pendingPostDocuments: pendingPostReqs.length,
        overduePostDocuments: overduePostReqs.length,
        openAppeals: appeals.filter((a) =>
          ["submitted", "under_review"].includes(a.status),
        ).length,
        pendingEditRequests: editRequests.filter((r) => r.status === "pending")
          .length,
        recentApplications: businesses
          .filter((b) => b.applicationStatus)
          .sort(
            (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0),
          )
          .slice(0, 5)
          .map((b) => ({
            businessId: b.businessId,
            businessName: b.businessName || b.registeredBusinessName,
            status: b.applicationStatus,
          })),
      },
    });
  } catch (err) {
    console.error("GET /dashboard/owner-stats error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL", message: "Failed to fetch dashboard stats" },
    });
  }
});

/**
 * GET /api/business/dashboard/manager-stats
 * Dashboard stats for Admin
 */
router.get(
  "/manager-stats",
  requireJwt,
  requireRole(["lgu_officer", "admin"]),
  async (req, res) => {
    try {
      const [
        totalProfiles,
        pendingApplications,
        generalPermits,
        occupationalPermits,
        postReqs,
        appeals,
      ] = await Promise.all([
        BusinessProfile.countDocuments(),
        BusinessProfile.countDocuments({
          "businesses.applicationStatus": "submitted",
        }),
        GeneralPermit.countDocuments(),
        OccupationalPermit.countDocuments(),
        PostDocument.countDocuments({ status: "pending" }),
        Appeal.countDocuments({
          status: { $in: ["submitted", "under_review"] },
        }),
      ]);

      // Revenue estimate (from approved renewals)
      const profiles = await BusinessProfile.find({
        "businesses.renewals.renewalStatus": "approved",
      }).lean();

      let totalRevenue = 0;
      for (const profile of profiles) {
        for (const biz of profile.businesses || []) {
          for (const renewal of biz.renewals || []) {
            if (
              renewal.renewalStatus === "approved" &&
              renewal.assessment?.total
            ) {
              totalRevenue += renewal.assessment.total;
            }
          }
        }
      }

      return res.json({
        data: {
          totalBusinessProfiles: totalProfiles,
          pendingApplications,
          generalPermitsIssued: await GeneralPermit.countDocuments({
            status: "approved",
          }),
          occupationalPermitsIssued: await OccupationalPermit.countDocuments({
            status: "approved",
          }),
          pendingPostDocuments: postReqs,
          openAppeals: appeals,
          estimatedRevenue: Math.round(totalRevenue),
          permitBreakdown: {
            generalPermits,
            occupationalPermits,
          },
        },
      });
    } catch (err) {
      console.error("GET /dashboard/manager-stats error:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL",
          message: "Failed to fetch dashboard stats",
        },
      });
    }
  },
);

module.exports = router;
