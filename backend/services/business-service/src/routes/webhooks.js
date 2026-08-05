const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const Payment = require("../models/Payment");
const { logAuditEvent } = require("../lib/auditClient");
const notificationService = require("../services/notificationService");

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(payload, signature, secret) {
  const hash = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");

  return hash === signature;
}

/**
 * POST /api/webhooks/gcash
 * Handle GCash payment webhook
 */
router.post("/gcash", async (req, res) => {
  try {
    const signature = req.headers["x-gcash-signature"];
    const secret = process.env.GCASH_WEBHOOK_SECRET || "gcash-secret";

    // Verify signature
    if (!verifyWebhookSignature(req.body, signature, secret)) {
      console.error("Invalid GCash webhook signature");
      return res.status(401).json({ error: "Invalid signature" });
    }

    const { reference_number, status, amount, transaction_id } = req.body;

    // Find payment by reference number
    const payment = await Payment.findOne({
      referenceNumber: reference_number,
    });

    if (!payment) {
      console.error("Payment not found for reference:", reference_number);
      return res.status(404).json({ error: "Payment not found" });
    }

    // Update payment status
    const statusMap = {
      SUCCESS: "paid",
      FAILED: "failed",
      PENDING: "pending",
      CANCELLED: "cancelled",
    };

    payment.status = statusMap[status] || "pending";
    payment.transactionId = transaction_id;
    payment.paidAt = status === "SUCCESS" ? new Date() : null;
    payment.webhookData = req.body;
    payment.webhookReceivedAt = new Date();

    await payment.save();

    // Log audit event
    logAuditEvent(
      "payment_webhook_received",
      null,
      "Payment",
      payment._id.toString(),
      {
        provider: "gcash",
        status,
        transactionId: transaction_id,
      },
    );

    // Send notification to business owner
    if (status === "SUCCESS") {
      try {
        await notificationService.createNotification(
          payment.userId,
          "payment_confirmed",
          "Payment Confirmed",
          `Your payment of ₱${amount} via GCash has been confirmed.`,
          "payment",
          payment._id.toString(),
          { paymentId: payment._id, amount, method: "gcash" },
        );
      } catch (notifErr) {
        console.error("Failed to send payment notification:", notifErr);
      }
    }

    return res.json({ success: true, paymentId: payment._id });
  } catch (error) {
    console.error("GCash webhook error:", error);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
});

/**
 * POST /api/webhooks/maya
 * Handle Maya payment webhook
 */
router.post("/maya", async (req, res) => {
  try {
    const signature = req.headers["x-maya-signature"];
    const secret = process.env.MAYA_WEBHOOK_SECRET || "maya-secret";

    // Verify signature
    if (!verifyWebhookSignature(req.body, signature, secret)) {
      console.error("Invalid Maya webhook signature");
      return res.status(401).json({ error: "Invalid signature" });
    }

    const { referenceNumber, status, amount, transactionId } = req.body;

    // Find payment by reference number
    const payment = await Payment.findOne({ referenceNumber });

    if (!payment) {
      console.error("Payment not found for reference:", referenceNumber);
      return res.status(404).json({ error: "Payment not found" });
    }

    // Update payment status
    const statusMap = {
      PAYMENT_SUCCESS: "paid",
      PAYMENT_FAILED: "failed",
      PAYMENT_PENDING: "pending",
      PAYMENT_CANCELLED: "cancelled",
    };

    payment.status = statusMap[status] || "pending";
    payment.transactionId = transactionId;
    payment.paidAt = status === "PAYMENT_SUCCESS" ? new Date() : null;
    payment.webhookData = req.body;
    payment.webhookReceivedAt = new Date();

    await payment.save();

    // Log audit event
    logAuditEvent(
      "payment_webhook_received",
      null,
      "Payment",
      payment._id.toString(),
      {
        provider: "maya",
        status,
        transactionId,
      },
    );

    // Send notification
    if (status === "PAYMENT_SUCCESS") {
      try {
        await notificationService.createNotification(
          payment.userId,
          "payment_confirmed",
          "Payment Confirmed",
          `Your payment of ₱${amount} via Maya has been confirmed.`,
          "payment",
          payment._id.toString(),
          { paymentId: payment._id, amount, method: "maya" },
        );
      } catch (notifErr) {
        console.error("Failed to send payment notification:", notifErr);
      }
    }

    return res.json({ success: true, paymentId: payment._id });
  } catch (error) {
    console.error("Maya webhook error:", error);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
});

/**
 * POST /api/webhooks/bank-transfer
 * Handle bank transfer confirmation webhook
 */
router.post("/bank-transfer", async (req, res) => {
  try {
    const signature = req.headers["x-bank-signature"];
    const secret = process.env.BANK_WEBHOOK_SECRET || "bank-secret";

    // Verify signature
    if (!verifyWebhookSignature(req.body, signature, secret)) {
      console.error("Invalid bank webhook signature");
      return res.status(401).json({ error: "Invalid signature" });
    }

    const { reference_number, status, amount, transaction_reference } =
      req.body;

    // Find payment by reference number
    const payment = await Payment.findOne({
      referenceNumber: reference_number,
    });

    if (!payment) {
      console.error("Payment not found for reference:", reference_number);
      return res.status(404).json({ error: "Payment not found" });
    }

    // Update payment status
    const statusMap = {
      CONFIRMED: "paid",
      REJECTED: "failed",
      PENDING: "pending",
    };

    payment.status = statusMap[status] || "pending";
    payment.transactionId = transaction_reference;
    payment.paidAt = status === "CONFIRMED" ? new Date() : null;
    payment.webhookData = req.body;
    payment.webhookReceivedAt = new Date();

    await payment.save();

    // Log audit event
    logAuditEvent(
      "payment_webhook_received",
      null,
      "Payment",
      payment._id.toString(),
      {
        provider: "bank_transfer",
        status,
        transactionReference: transaction_reference,
      },
    );

    // Send notification
    if (status === "CONFIRMED") {
      try {
        await notificationService.createNotification(
          payment.userId,
          "payment_confirmed",
          "Payment Confirmed",
          `Your bank transfer payment of ₱${amount} has been confirmed.`,
          "payment",
          payment._id.toString(),
          { paymentId: payment._id, amount, method: "bank_transfer" },
        );
      } catch (notifErr) {
        console.error("Failed to send payment notification:", notifErr);
      }
    }

    return res.json({ success: true, paymentId: payment._id });
  } catch (error) {
    console.error("Bank transfer webhook error:", error);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
});

/**
 * GET /api/webhooks/payment-status/:paymentId
 * Poll payment status (fallback for webhooks)
 */
router.get("/payment-status/:paymentId", async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId)
      .select("status transactionId paidAt amount paymentMethod")
      .lean();

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    return res.json({
      paymentId: req.params.paymentId,
      status: payment.status,
      transactionId: payment.transactionId,
      paidAt: payment.paidAt,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
    });
  } catch (error) {
    console.error("Payment status poll error:", error);
    return res.status(500).json({ error: "Failed to fetch payment status" });
  }
});

module.exports = router;
