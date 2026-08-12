const mongoose = require("mongoose");
const Payment = require("../../models/Payment");
const Business = require("../../models/Business");
const Application = require("../../models/Application");
const { logAuditEvent } = require("../../lib/auditClient");

class PaymentService {
  /**
   * Helper: resolve the entity an identifier points to.
   * The identifier may be a Business._id, Business.businessId,
   * Application._id or Application.applicationId.
   * Returns { type, id, userId } or null.
   */
  async _resolveEntity(identifier, userId) {
    const target = String(identifier || "");
    if (!target) return null;

    const isObjectId = mongoose.Types.ObjectId.isValid(target);

    // 1. Try Business by _id
    if (isObjectId) {
      const business = await Business.findById(target).lean();
      if (business) {
        return { type: "business", id: business._id, userId: business.userId };
      }
    }

    // 2. Try Business by businessId string
    const business = await Business.findOne({ businessId: target }).lean();
    if (business) {
      return { type: "business", id: business._id, userId: business.userId };
    }

    // 3. Try Application by _id
    if (isObjectId) {
      const application = await Application.findById(target).lean();
      if (application) {
        return {
          type: "application",
          id: application._id,
          userId: application.userId,
        };
      }
    }

    // 4. Try Application by applicationId string
    const application = await Application.findOne({ applicationId: target }).lean();
    if (application) {
      return {
        type: "application",
        id: application._id,
        userId: application.userId,
      };
    }

    // 5. Optional owner-wide fallback: if a userId is supplied, search their applications
    if (userId) {
      const ownerApplication = await Application.findOne({
        userId,
        $or: [{ _id: target }, { applicationId: target }],
      }).lean();
      if (ownerApplication) {
        return {
          type: "application",
          id: ownerApplication._id,
          userId: ownerApplication.userId,
        };
      }
    }

    return null;
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
    const {
      page = 1,
      limit = 20,
      status,
      paymentType,
      businessId,
      applicationId,
    } = query;
    const filter = { userId };

    if (businessId) {
      const entity = await this._resolveEntity(businessId, userId);
      if (entity?.type === "business") {
        filter.businessId = entity.id;
      } else if (entity?.type === "application") {
        filter.applicationId = entity.id;
      } else if (mongoose.Types.ObjectId.isValid(businessId)) {
        // Legacy / direct id fallback
        filter.businessId = new mongoose.Types.ObjectId(businessId);
      }
    }

    if (applicationId) {
      filter.applicationId = mongoose.Types.ObjectId.isValid(applicationId)
        ? new mongoose.Types.ObjectId(applicationId)
        : applicationId;
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
    const {
      page = 1,
      limit = 20,
      dateFrom,
      dateTo,
      businessId,
      applicationId,
    } = query;
    const filter = {
      userId,
      status: { $in: ["paid", "refunded"] },
    };

    if (businessId) {
      const entity = await this._resolveEntity(businessId, userId);
      if (entity?.type === "business") {
        filter.businessId = entity.id;
      } else if (entity?.type === "application") {
        filter.applicationId = entity.id;
      } else if (mongoose.Types.ObjectId.isValid(businessId)) {
        filter.businessId = new mongoose.Types.ObjectId(businessId);
      }
    }

    if (applicationId) {
      filter.applicationId = mongoose.Types.ObjectId.isValid(applicationId)
        ? new mongoose.Types.ObjectId(applicationId)
        : applicationId;
    }

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

    if (businessId == null || paymentType == null || amount == null) {
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

    const entity = await this._resolveEntity(businessId, userId);
    if (!entity) {
      const error = new Error("Business or application not found");
      error.code = "ENTITY_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const paymentPayload = {
      paymentId: await this.generatePaymentId(),
      userId: entity.userId, // Use the entity owner, not the current user
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
    };

    if (entity.type === "business") {
      paymentPayload.businessId = entity.id;
    } else {
      paymentPayload.applicationId = entity.id;
    }

    let payment;
    try {
      payment = await Payment.create(paymentPayload);
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
      applicationId: payment.applicationId,
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
      receiptNumber: requestedReceiptNumber,
      paymentId: requestedPaymentId,
    } = mockData;

    if (businessId == null || amount == null) {
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

    const entity = await this._resolveEntity(businessId, userId);
    if (!entity) {
      const error = new Error("Business or application not found");
      error.code = "ENTITY_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const id = requestedPaymentId || await this.generatePaymentId();
    const receiptNumber = requestedReceiptNumber || `RCP-${Date.now()}`;

    // Map fee breakdown to payment model format
    const feeBreakdown = fees.map((fee) => ({
      label: fee.label || fee.description || "Fee",
      amount: fee.amount || 0,
      type: fee.type || "other",
    }));

    const paymentPayload = {
      paymentId: id,
      userId: entity.userId,
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
    };

    if (entity.type === "business") {
      paymentPayload.businessId = entity.id;
    } else {
      paymentPayload.applicationId = entity.id;
    }

    let payment;
    try {
      payment = await Payment.create(paymentPayload);

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
