const express = require("express");
const router = express.Router();
const { requireJwt, requireRole } = require("../middleware/auth");
const respond = require("../middleware/respond");
const BusinessProfile = require("../models/BusinessProfile");
const Payment = require("../models/Payment");

router.get("/stats", requireJwt, requireRole(["admin"]), async (req, res) => {
  try {
    const [activeResult, pendingResult] = await Promise.all([
      BusinessProfile.aggregate([
        { $unwind: "$businesses" },
        { $match: { "businesses.businessStatus": "active" } },
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

    return respond.success(res, 200, {
      activeBusinesses: activeResult[0]?.count || 0,
      pendingApplications: pendingResult[0]?.count || 0,
    });
  } catch (err) {
    console.error("GET /api/business/admin/stats error:", err);
    return respond.error(res, 500, "stats_error", "Failed to fetch stats");
  }
});

router.get(
  "/payments/summary",
  requireJwt,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [totalResult, monthResult, pendingCount, totalCount] =
        await Promise.all([
          Payment.aggregate([
            { $match: { status: "paid" } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ]),
          Payment.aggregate([
            { $match: { status: "paid", createdAt: { $gte: monthStart } } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ]),
          Payment.countDocuments({ status: "pending" }),
          Payment.countDocuments(),
        ]);

      return respond.success(res, 200, {
        totalCollections: totalResult[0]?.total || 0,
        revenueThisMonth: monthResult[0]?.total || 0,
        pendingPayments: pendingCount,
        totalTransactions: totalCount,
      });
    } catch (err) {
      console.error("GET /api/business/admin/payments/summary error:", err);
      return respond.error(
        res,
        500,
        "summary_error",
        "Failed to fetch payment summary",
      );
    }
  },
);

router.get(
  "/payments",
  requireJwt,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      const { status, search } = req.query;

      const filter = {};
      if (status && status !== "all") filter.status = status;
      if (search) {
        filter.$or = [
          { paymentId: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }

      const [payments, total] = await Promise.all([
        Payment.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Payment.countDocuments(filter),
      ]);

      return respond.success(res, 200, {
        payments,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (err) {
      console.error("GET /api/business/admin/payments error:", err);
      return respond.error(
        res,
        500,
        "payments_error",
        "Failed to fetch payments",
      );
    }
  },
);

router.get(
  "/payments/report",
  requireJwt,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { period = "month", year, month } = req.query;
      const now = new Date();
      let dateFilter = {};

      if (period === "month") {
        const y = parseInt(year) || now.getFullYear();
        const m = parseInt(month) || now.getMonth() + 1;
        dateFilter = {
          createdAt: {
            $gte: new Date(y, m - 1, 1),
            $lt: new Date(y, m, 1),
          },
        };
      } else if (period === "quarter") {
        const y = parseInt(year) || now.getFullYear();
        const q = Math.ceil((now.getMonth() + 1) / 3);
        dateFilter = {
          createdAt: {
            $gte: new Date(y, (q - 1) * 3, 1),
            $lt: new Date(y, q * 3, 1),
          },
        };
      } else if (period === "year") {
        const y = parseInt(year) || now.getFullYear();
        dateFilter = {
          createdAt: {
            $gte: new Date(y, 0, 1),
            $lt: new Date(y + 1, 0, 1),
          },
        };
      }

      const payments = await Payment.find({ status: "paid", ...dateFilter })
        .sort({ createdAt: -1 })
        .lean();
      const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const byType = {};
      payments.forEach((p) => {
        byType[p.paymentType] = (byType[p.paymentType] || 0) + (p.amount || 0);
      });

      return respond.success(res, 200, {
        period,
        totalAmount,
        transactionCount: payments.length,
        byType,
        payments,
      });
    } catch (err) {
      console.error("GET /api/business/admin/payments/report error:", err);
      return respond.error(
        res,
        500,
        "report_error",
        "Failed to generate report",
      );
    }
  },
);

module.exports = router;
