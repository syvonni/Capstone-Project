const express = require("express");
const mongoose = require("mongoose");
const Payment = require("../models/Payment");
const BusinessProfile = require("../models/BusinessProfile");
const { requireJwt, requireRole } = require("../middleware/auth");
const { logAuditEvent } = require("../lib/auditClient");

const router = express.Router();

// Helper: build query that matches either businessId or subdoc _id
function buildBusinessLookupQuery(identifier) {
  const target = String(identifier || "");
  const clauses = [{ "businesses.businessId": target }];
  if (mongoose.Types.ObjectId.isValid(target)) {
    clauses.push({ "businesses._id": new mongoose.Types.ObjectId(target) });
  }
  return clauses.length === 1 ? clauses[0] : { $or: clauses };
}

// Helper: find business in profile by either businessId or subdoc _id
function findBusinessInProfile(profile, identifier) {
  if (!profile?.businesses) return null;
  const target = String(identifier);
  return profile.businesses.find(
    (b) => b.businessId === target || String(b._id) === target,
  );
}

async function generatePaymentId() {
  const year = new Date().getFullYear();
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PAY-${year}-${ts}-${rand}`;
}

/**
 * GET /api/business/payments
 * List all payments for the authenticated user
 */
router.get("/", requireJwt, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, paymentType, businessId } = req.query;
    // If businessId is provided, search by businessId (works for LGU officers viewing business owner payments)
    // Otherwise, filter by current user's payments
    const filter = businessId
      ? { businessId: String(businessId) }
      : { userId: req._userId };

    // businessId can be either businesses.businessId or the business subdocument _id,
    // depending on which module generated the payment record. Resolve both aliases so
    // owners and officers see the same payment rows regardless of identifier form.
    if (businessId) {
      const targetBusinessId = String(businessId);
      let profile = await BusinessProfile.findOne(
        buildBusinessLookupQuery(targetBusinessId),
      )
        .select("businesses.businessId businesses._id")
        .lean();

      // Fallback for business owners: if direct lookup misses, load owner's profile and
      // resolve aliases from the decrypted in-memory businesses list.
      if (!profile && req._userId) {
        profile = await BusinessProfile.findOne({ userId: req._userId })
          .select("businesses.businessId businesses._id")
          .lean();
      }

      if (profile) {
        const business = findBusinessInProfile(profile, targetBusinessId);
        const aliases = new Set([targetBusinessId]);
        if (business?.businessId) aliases.add(String(business.businessId));
        if (business?._id) aliases.add(String(business._id));

        const aliasList = Array.from(aliases);
        filter.businessId =
          aliasList.length > 1 ? { $in: aliasList } : aliasList[0];
      }
    }

    if (status) filter.status = status;
    if (paymentType) filter.paymentType = paymentType;

    const skip = (Number(page) - 1) * Number(limit);
    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Payment.countDocuments(filter),
    ]);

    return res.json({
      data: payments,
      meta: { page: Number(page), limit: Number(limit), total },
    });
  } catch (err) {
    console.error("GET /payments error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL", message: "Failed to fetch payments" },
    });
  }
});

/**
 * GET /api/business/payments/pending
 * List pending payments for the authenticated user
 */
router.get("/pending", requireJwt, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const filter = {
      userId: req._userId,
      status: "pending",
    };

    const skip = (Number(page) - 1) * Number(limit);
    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .sort({ dueDate: 1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Payment.countDocuments(filter),
    ]);

    const now = new Date();
    const enriched = payments.map((p) => ({
      ...p,
      isOverdue: p.dueDate && new Date(p.dueDate) < now,
    }));

    return res.json({
      data: enriched,
      meta: { page: Number(page), limit: Number(limit), total },
    });
  } catch (err) {
    console.error("GET /payments/pending error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL", message: "Failed to fetch pending payments" },
    });
  }
});

/**
 * GET /api/business/payments/history
 * Payment history with filters
 */
router.get("/history", requireJwt, async (req, res) => {
  try {
    const { page = 1, limit = 20, dateFrom, dateTo, businessId } = req.query;
    const filter = {
      userId: req._userId,
      status: { $in: ["paid", "refunded"] },
    };

    if (businessId) filter.businessId = businessId;
    if (dateFrom || dateTo) {
      filter.paidAt = {};
      if (dateFrom) filter.paidAt.$gte = new Date(dateFrom);
      if (dateTo) filter.paidAt.$lte = new Date(dateTo + "T23:59:59.999Z");
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .sort({ paidAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Payment.countDocuments(filter),
    ]);

    return res.json({
      data: payments,
      meta: { page: Number(page), limit: Number(limit), total },
    });
  } catch (err) {
    console.error("GET /payments/history error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL", message: "Failed to fetch payment history" },
    });
  }
});

/**
 * GET /api/business/payments/:paymentId
 * Get payment details
 */
router.get("/:paymentId", requireJwt, async (req, res) => {
  try {
    const payment = await Payment.findOne({
      paymentId: req.params.paymentId,
      userId: req._userId,
    }).lean();

    if (!payment) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Payment not found" },
      });
    }

    return res.json({ data: payment });
  } catch (err) {
    console.error("GET /payments/:paymentId error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL", message: "Failed to fetch payment" },
    });
  }
});

/**
 * POST /api/business/payments
 * Create a payment record (for fees, penalties, etc.)
 */
router.post("/", requireJwt, async (req, res) => {
  try {
    const {
      businessId,
      paymentType,
      description,
      amount,
      dueDate,
      relatedEntityType,
      relatedEntityId,
      breakdown,
      feeBreakdown,
      metadata,
    } = req.body;

    if (!businessId || !paymentType || !amount) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "businessId, paymentType, and amount are required",
        },
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Amount must be greater than 0",
        },
      });
    }

    // Find business profile - try by businessId/subdoc _id first (works for both owner and officer)
    let profile = await BusinessProfile.findOne(
      buildBusinessLookupQuery(businessId),
    );

    // Fallback: try by current user (business owner case where businessId doesn't match)
    if (!profile) {
      profile = await BusinessProfile.findOne({ userId: req._userId });
    }

    if (!profile) {
      return res.status(404).json({
        error: {
          code: "PROFILE_NOT_FOUND",
          message: "Business profile not found",
        },
      });
    }

    const business = findBusinessInProfile(profile, businessId);
    if (!business) {
      return res.status(404).json({
        error: { code: "BUSINESS_NOT_FOUND", message: "Business not found" },
      });
    }

    const paymentId = await generatePaymentId();
    const payment = await Payment.create({
      paymentId,
      userId: profile.userId, // Use the business owner's userId, not the current user
      businessId,
      businessProfileId: profile._id,
      paymentType,
      description: description || "",
      amount,
      dueDate: dueDate ? new Date(dueDate) : null,
      relatedEntityType: relatedEntityType || null,
      relatedEntityId: relatedEntityId || "",
      breakdown: breakdown || {},
      feeBreakdown: feeBreakdown || [],
      metadata: metadata || {},
      status: "pending",
    });

    return res.status(201).json({ data: payment });
  } catch (err) {
    // Handle duplicate key error (E11000) - payment already exists
    if (err.code === 11000 || err.message?.includes("E11000")) {
      console.warn("POST /payments duplicate:", err.keyValue || err.message);
      return res.status(409).json({
        error: {
          code: "DUPLICATE",
          message: "Payment already exists for this business and payment type",
        },
      });
    }
    console.error("POST /payments error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL", message: "Failed to create payment" },
    });
  }
});

/**
 * POST /api/business/payments/:paymentId/pay
 * Process payment
 */
router.post("/:paymentId/pay", requireJwt, async (req, res) => {
  try {
    const { paymentMethod, transactionId, referenceNumber } = req.body;

    if (!paymentMethod) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "paymentMethod is required",
        },
      });
    }

    const payment = await Payment.findOne({
      paymentId: req.params.paymentId,
      userId: req._userId,
    });

    if (!payment) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Payment not found" },
      });
    }

    if (payment.status === "paid") {
      return res.status(400).json({
        error: {
          code: "ALREADY_PAID",
          message: "Payment has already been processed",
        },
      });
    }

    if (payment.status === "cancelled") {
      return res.status(400).json({
        error: { code: "CANCELLED", message: "Payment has been cancelled" },
      });
    }

    payment.status = "paid";
    payment.paymentMethod = paymentMethod;
    payment.transactionId = transactionId || "";
    payment.referenceNumber = referenceNumber || "";
    payment.paidAt = new Date();
    payment.receiptNumber = `RCP-${Date.now()}`;

    await payment.save();
    logAuditEvent(
      "payment_recorded",
      req._userId,
      "Payment",
      payment._id.toString(),
      { amount: payment.amount, businessId: payment.businessId },
    );

    return res.json({
      data: payment,
      message: "Payment processed successfully",
    });
  } catch (err) {
    console.error("POST /payments/:paymentId/pay error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL", message: "Failed to process payment" },
    });
  }
});

/**
 * PUT /api/business/payments/:paymentId/cancel
 * Cancel a pending payment
 */
router.put("/:paymentId/cancel", requireJwt, async (req, res) => {
  try {
    const { reason } = req.body;

    const payment = await Payment.findOne({
      paymentId: req.params.paymentId,
      userId: req._userId,
    });

    if (!payment) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Payment not found" },
      });
    }

    if (payment.status !== "pending") {
      return res.status(400).json({
        error: {
          code: "INVALID_STATUS",
          message: "Only pending payments can be cancelled",
        },
      });
    }

    payment.status = "cancelled";
    payment.notes = reason || "Cancelled by user";
    await payment.save();

    return res.json({ data: payment });
  } catch (err) {
    console.error("PUT /payments/:paymentId/cancel error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL", message: "Failed to cancel payment" },
    });
  }
});

/**
 * POST /api/business/payments/:paymentId/receipt
 * Generate receipt for a paid payment (business owner)
 */
router.post("/:paymentId/receipt", requireJwt, async (req, res) => {
  try {
    const idParam = req.params.paymentId;
    // Try to find by paymentId first, then by _id
    let payment = await Payment.findOne({
      paymentId: idParam,
      userId: req._userId,
    });

    // If not found by paymentId, try by MongoDB _id
    if (!payment && idParam.match(/^[0-9a-fA-F]{24}$/)) {
      payment = await Payment.findOne({
        _id: idParam,
        userId: req._userId,
      });
    }

    if (!payment) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Payment not found" },
      });
    }

    if (payment.status !== "paid") {
      return res.status(400).json({
        error: {
          code: "NOT_PAID",
          message: "Receipt can only be generated for paid payments",
        },
      });
    }

    // Generate receipt number if not exists
    if (!payment.receiptNumber) {
      payment.receiptNumber = `RCP-${Date.now()}`;
      await payment.save();
    }

    return res.json({
      receiptNumber: payment.receiptNumber,
      paymentId: payment.paymentId,
      amount: payment.amount,
      paidAt: payment.paidAt,
      businessId: payment.businessId,
      description: payment.description,
      paymentMethod: payment.paymentMethod,
    });
  } catch (err) {
    console.error("POST /payments/:paymentId/receipt error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL", message: "Failed to generate receipt" },
    });
  }
});

/**
 * POST /api/business/payments/mock
 * Create a mock payment record for testing (frontend simulation)
 */
router.post("/mock", requireJwt, async (req, res) => {
  try {
    const {
      businessId,
      amount,
      fees = [],
      transactionName = "Business Permit Application",
      paymentType = "registration_fee",
    } = req.body;

    if (!businessId || !amount) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "businessId and amount are required",
        },
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Amount must be greater than 0",
        },
      });
    }

    // Find business profile
    let profile = await BusinessProfile.findOne(
      buildBusinessLookupQuery(businessId),
    );

    // Fallback: try by current user
    if (!profile) {
      profile = await BusinessProfile.findOne({ userId: req._userId });
    }

    // If no profile exists, create one for the user (for draft applications)
    if (!profile) {
      profile = await BusinessProfile.create({ userId: req._userId });
    }

    const business = findBusinessInProfile(profile, businessId);
    // For draft applications, business may not exist yet - that's okay
    // We'll create the payment record without a business reference

    const paymentId = await generatePaymentId();
    const receiptNumber = `RCP-${Date.now()}`;

    // Map fee breakdown to payment model format
    const feeBreakdown = fees.map((fee) => ({
      label: fee.label || fee.description || "Fee",
      amount: fee.amount || 0,
      type: fee.type || "other",
    }));

    const payment = await Payment.create({
      paymentId,
      userId: profile.userId,
      businessId,
      businessProfileId: profile._id,
      paymentType,
      description: transactionName,
      amount,
      status: "paid",
      paymentMethod: "demo_auto",
      paidAt: new Date(),
      receiptNumber,
      breakdown: {
        baseFee: amount,
        surcharge: 0,
        penalty: 0,
        discount: 0,
        tax: 0,
      },
      feeBreakdown,
      metadata: {
        isMockPayment: true,
        transactionName,
      },
    });

    logAuditEvent(
      "mock_payment_recorded",
      req._userId,
      "Payment",
      payment._id.toString(),
      { amount, businessId, paymentId },
    );

    return res.status(201).json({ data: payment });
  } catch (err) {
    if (err.code === 11000 || err.message?.includes("E11000")) {
      console.warn(
        "POST /payments/mock duplicate:",
        err.keyValue || err.message,
      );
      return res.status(409).json({
        error: {
          code: "DUPLICATE",
          message: "Payment already exists for this business",
        },
      });
    }
    console.error("POST /payments/mock error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL", message: "Failed to create mock payment" },
    });
  }
});

module.exports = router;
