const mongoose = require("mongoose");
const Payment = require("../../models/Payment");
const Application = require("../../models/Application");
const Business = require("../../models/Business");

class LguOfficerPaymentService {
  /**
   * Resolve an identifier to a business or application entity.
   * Accepts ObjectId _id or applicationId/businessId strings.
   */
  async _resolveEntity(identifier) {
    const target = String(identifier || "");
    if (!target) return null;

    const isObjectId = mongoose.Types.ObjectId.isValid(target);

    if (isObjectId) {
      const business = await Business.findById(target).lean();
      if (business) return { type: "business", id: business._id };

      const application = await Application.findById(target).lean();
      if (application) return { type: "application", id: application._id };
    }

    const business = await Business.findOne({ businessId: target }).lean();
    if (business) return { type: "business", id: business._id };

    const application = await Application.findOne({ applicationId: target }).lean();
    if (application) return { type: "application", id: application._id };

    return null;
  }

  /**
   * List payments for an application/business.
   * Officers are not restricted by userId; they can view payments
   * for applications they are reviewing.
   */
  async list(query) {
    const {
      page = 1,
      limit = 20,
      status,
      paymentType,
      businessId,
      applicationId,
    } = query;

    const filter = {};

    if (businessId) {
      const entity = await this._resolveEntity(businessId);
      if (entity?.type === "business") {
        filter.businessId = entity.id;
      } else if (entity?.type === "application") {
        filter.applicationId = entity.id;
      } else if (mongoose.Types.ObjectId.isValid(businessId)) {
        filter.businessId = new mongoose.Types.ObjectId(businessId);
      }
    }

    if (applicationId) {
      const entity = await this._resolveEntity(applicationId);
      if (entity?.type === "application") {
        filter.applicationId = entity.id;
      } else if (entity?.type === "business") {
        filter.businessId = entity.id;
      } else if (mongoose.Types.ObjectId.isValid(applicationId)) {
        filter.applicationId = new mongoose.Types.ObjectId(applicationId);
      } else {
        filter.applicationId = applicationId;
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
   * Get a single payment by paymentId.
   */
  async getById(paymentId) {
    const payment = await Payment.findOne({ paymentId }).lean();

    if (!payment) {
      const error = new Error("Payment not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    return payment;
  }

  /**
   * Generate receipt data for a paid payment.
   */
  async getReceipt(paymentId) {
    let payment = await Payment.findOne({ paymentId });

    if (!payment && paymentId.match(/^[0-9a-fA-F]{24}$/)) {
      payment = await Payment.findById(paymentId);
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
      feeBreakdown: payment.feeBreakdown,
    };
  }
}

module.exports = new LguOfficerPaymentService();
