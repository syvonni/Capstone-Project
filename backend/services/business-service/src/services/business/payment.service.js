const mongoose = require("mongoose");
const Payment = require("../../models/Payment");
const BusinessProfile = require("../../models/BusinessProfile");
const { logAuditEvent } = require("../../lib/auditClient");

class PaymentService {
  /**
   * Helper: build query that matches either businessId or subdoc _id
   */
  buildBusinessLookupQuery(identifier) {
    const target = String(identifier || "");
    const clauses = [{ "businesses.businessId": target }];
    if (mongoose.Types.ObjectId.isValid(target)) {
      clauses.push({ "businesses._id": new mongoose.Types.ObjectId(target) });
    }
    return clauses.length === 1 ? clauses[0] : { $or: clauses };
  }

  /**
   * Helper: find business in profile by either businessId or subdoc _id
   */
  findBusinessInProfile(profile, identifier) {
    if (!profile?.businesses) return null;
    const target = String(identifier);
    return profile.businesses.find(
      (b) => b.businessId === target || String(b._id) === target,
    );
  }

  /**
   * Helper: generate unique payment ID
   */
  async generatePaymentId() {
    const year = new Date().getFullYear();
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `PAY-${year}-${ts}-${rand}`;
  }

  /**
   * List all payments for the authenticated user
   */
  async list(userId, query) {
    const { page = 1, limit = 20, status, paymentType, businessId } = query;
    const filter = businessId
      ? { businessId: String(businessId) }
      : { userId };

    // businessId can be either businesses.businessId or the business subdocument _id,
    // depending on which module generated the payment record. Resolve both aliases so
    // owners and officers see the same payment rows regardless of identifier form.
    if (businessId) {
      const targetBusinessId = String(businessId);
      let profile = await BusinessProfile.findOne(
        this.buildBusinessLookupQuery(targetBusinessId),
      )
        .select("businesses.businessId businesses._id")
        .lean();

      // Fallback for business owners: if direct lookup misses, load owner's profile and
      // resolve aliases from the decrypted in-memory businesses list.
      if (!profile && userId) {
        profile = await BusinessProfile.findOne({ userId })
          .select("businesses.businessId businesses._id")
          .lean();
      }

      if (profile) {
        const business = this.findBusinessInProfile(profile, targetBusinessId);
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

    return payments;
  }

  /**
   * List pending payments for the authenticated user
   */
  async getPending(userId, query) {
    const { page = 1, limit = 20 } = query;
    const filter = {
      userId,
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

    return enriched;
  }

  /**
   * Payment history with filters
   */
  async getHistory(userId, query) {
    const { page = 1, limit = 20, dateFrom, dateTo, businessId } = query;
    const filter = {
      userId,
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

    return payments;
  }

  /**
   * Get payment details by ID
   */
  async getById(userId, paymentId) {
    const payment = await Payment.findOne({
      paymentId,
      userId,
    }).lean();

    if (!payment) {
      const error = new Error("Payment not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    return payment;
  }

  /**
   * Create a payment record (for fees, penalties, etc.)
   */
  async create(userId, req, paymentData) {
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
    } = paymentData;

    if (!businessId || !paymentType || !amount) {
      const error = new Error(
        "businessId, paymentType, and amount are required",
      );
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    if (amount <= 0) {
      const error = new Error("Amount must be greater than 0");
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    // Find business profile - try by businessId/subdoc _id first (works for both owner and officer)
    let profile = await BusinessProfile.findOne(
      this.buildBusinessLookupQuery(businessId),
    );

    // Fallback: try by current user (business owner case where businessId doesn't match)
    if (!profile) {
      profile = await BusinessProfile.findOne({ userId });
    }

    if (!profile) {
      const error = new Error("Business profile not found");
      error.code = "PROFILE_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const business = this.findBusinessInProfile(profile, businessId);
    if (!business) {
      const error = new Error("Business not found");
      error.code = "BUSINESS_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const id = await this.generatePaymentId();
    let payment;
    try {
      payment = await Payment.create({
        paymentId: id,
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
    } catch (err) {
      // Handle duplicate key error (E11000) - payment already exists
      if (err.code === 11000 || err.message?.includes("E11000")) {
        const error = new Error(
          "Payment already exists for this business and payment type",
        );
        error.code = "DUPLICATE";
        error.status = 409;
        throw error;
      }
      throw err;
    }

    return payment;
  }

  /**
   * Process payment
   */
  async pay(userId, paymentId, paymentData) {
    const { paymentMethod, transactionId, referenceNumber } = paymentData;

    if (!paymentMethod) {
      const error = new Error("paymentMethod is required");
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    const payment = await Payment.findOne({
      paymentId,
      userId,
    });

    if (!payment) {
      const error = new Error("Payment not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    if (payment.status === "paid") {
      const error = new Error("Payment has already been processed");
      error.code = "ALREADY_PAID";
      error.status = 400;
      throw error;
    }

    if (payment.status === "cancelled") {
      const error = new Error("Payment has been cancelled");
      error.code = "CANCELLED";
      error.status = 400;
      throw error;
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
      userId,
      "Payment",
      payment._id.toString(),
      { amount: payment.amount, businessId: payment.businessId },
    );

    return {
      payment,
      message: "Payment processed successfully",
    };
  }

  /**
   * Cancel a pending payment
   */
  async cancel(userId, paymentId, cancelData) {
    const { reason } = cancelData;

    const payment = await Payment.findOne({
      paymentId,
      userId,
    });

    if (!payment) {
      const error = new Error("Payment not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    if (payment.status !== "pending") {
      const error = new Error("Only pending payments can be cancelled");
      error.code = "INVALID_STATUS";
      error.status = 400;
      throw error;
    }

    payment.status = "cancelled";
    payment.notes = reason || "Cancelled by user";
    await payment.save();

    return payment;
  }

  /**
   * Generate receipt for a paid payment (business owner)
   */
  async getReceipt(userId, paymentId) {
    // Try to find by paymentId first, then by _id
    let payment = await Payment.findOne({
      paymentId,
      userId,
    });

    // If not found by paymentId, try by MongoDB _id
    if (!payment && paymentId.match(/^[0-9a-fA-F]{24}$/)) {
      payment = await Payment.findOne({
        _id: paymentId,
        userId,
      });
    }

    if (!payment) {
      const error = new Error("Payment not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    if (payment.status !== "paid") {
      const error = new Error("Receipt can only be generated for paid payments");
      error.code = "NOT_PAID";
      error.status = 400;
      throw error;
    }

    // Generate receipt number if not exists
    if (!payment.receiptNumber) {
      payment.receiptNumber = `RCP-${Date.now()}`;
      await payment.save();
    }

    return {
      receiptNumber: payment.receiptNumber,
      paymentId: payment.paymentId,
      amount: payment.amount,
      paidAt: payment.paidAt,
      businessId: payment.businessId,
      description: payment.description,
      paymentMethod: payment.paymentMethod,
    };
  }

  /**
   * Create a mock payment record for testing (frontend simulation)
   */
  async createMock(userId, req, mockData) {
    const {
      businessId,
      amount,
      fees = [],
      transactionName = "Business Permit Application",
      paymentType = "registration_fee",
    } = mockData;

    if (!businessId || !amount) {
      const error = new Error("businessId and amount are required");
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    if (amount <= 0) {
      const error = new Error("Amount must be greater than 0");
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    // Find business profile
    let profile = await BusinessProfile.findOne(
      this.buildBusinessLookupQuery(businessId),
    );

    // Fallback: try by current user
    if (!profile) {
      profile = await BusinessProfile.findOne({ userId });
    }

    // If no profile exists, create one for the user (for draft applications)
    if (!profile) {
      profile = await BusinessProfile.create({ userId });
    }

    const business = this.findBusinessInProfile(profile, businessId);
    // For draft applications, business may not exist yet - that's okay
    // We'll create the payment record without a business reference

    const id = await this.generatePaymentId();
    const receiptNumber = `RCP-${Date.now()}`;

    // Map fee breakdown to payment model format
    const feeBreakdown = fees.map((fee) => ({
      label: fee.label || fee.description || "Fee",
      amount: fee.amount || 0,
      type: fee.type || "other",
    }));

    let payment;
    try {
      payment = await Payment.create({
        paymentId: id,
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
        userId,
        "Payment",
        payment._id.toString(),
        { amount, businessId, paymentId: id },
      );
    } catch (err) {
      // Handle duplicate key error (E11000) - payment already exists
      if (err.code === 11000 || err.message?.includes("E11000")) {
        const error = new Error("Payment already exists for this business");
        error.code = "DUPLICATE";
        error.status = 409;
        throw error;
      }
      throw err;
    }

    return payment;
  }
}

module.exports = new PaymentService();
