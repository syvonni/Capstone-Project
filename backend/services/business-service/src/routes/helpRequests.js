const express = require("express");
const crypto = require("crypto");
const {
  requireJwt,
  requireRole,
  requireAdminStepUp,
} = require("../middleware/auth");
const respond = require("../middleware/respond");
const HelpRequest = require("../models/HelpRequest");
const logger = require("../lib/logger");
const { logAuditEvent } = require("../lib/auditClient");
const {
  sendHelpRequestConfirmation,
  sendOfficerReplyNotification,
  sendRequestClosedNotification,
  sendRequestInvalidNotification,
} = require("../lib/helpRequestMailer");

const router = express.Router();

function generateRequestId() {
  const ts = Date.now().toString(36);
  const rand = crypto.randomBytes(3).toString("hex");
  return `HR-${ts}-${rand}`.toUpperCase();
}

const VALID_STATUSES = [
  "open",
  "in_progress",
  "needs_response",
  "waiting_for_business_owner",
  "closed",
  "invalid",
];
const VALID_PRIORITIES = ["low", "normal", "high"];
const PRIORITY_ORDER = { high: 0, normal: 1, low: 2 };

// ─── PUBLIC: Submit Help Request ─────────────────────────────────────────────
// POST /api/help-requests
router.post("/", async (req, res) => {
  try {
    const {
      subject,
      message,
      contactEmail,
      businessPermitNumber,
      attachments,
    } = req.body || {};

    if (!subject || !subject.trim()) {
      return respond.error(res, 400, "validation_error", "Subject is required");
    }
    if (!message || !message.trim()) {
      return respond.error(res, 400, "validation_error", "Message is required");
    }
    if (!contactEmail || !contactEmail.includes("@")) {
      return respond.error(
        res,
        400,
        "validation_error",
        "A valid contact email is required",
      );
    }

    const requestId = generateRequestId();

    const helpRequest = await HelpRequest.create({
      requestId,
      subject: subject.trim(),
      message: message.trim(),
      contactEmail: contactEmail.trim().toLowerCase(),
      businessPermitNumber: (businessPermitNumber || "").trim(),
      attachments: Array.isArray(attachments)
        ? attachments.filter(Boolean)
        : [],
      status: "open",
      priority: "low",
    });

    // Send confirmation email (fire-and-forget)
    sendHelpRequestConfirmation(
      contactEmail.trim().toLowerCase(),
      requestId,
      subject.trim(),
    ).catch((err) =>
      logger.error("Help request confirmation email failed", {
        error: err.message,
      }),
    );

    return res.status(201).json({
      success: true,
      requestId: helpRequest.requestId,
      message:
        "Help request submitted successfully. A confirmation email has been sent.",
    });
  } catch (err) {
    logger.error("POST /api/help-requests error", { error: err.message });
    return respond.error(
      res,
      500,
      "help_request_failed",
      "Failed to submit help request",
    );
  }
});

// ─── PUBLIC: Business owner reply ────────────────────────────────────────────
// POST /api/help-requests/:requestId/reply
router.post("/:requestId/reply", async (req, res) => {
  try {
    const { requestId } = req.params;
    const { content, contactEmail, attachments } = req.body || {};

    if (!content || !content.trim()) {
      return respond.error(
        res,
        400,
        "validation_error",
        "Message content is required",
      );
    }
    if (!contactEmail || !contactEmail.includes("@")) {
      return respond.error(
        res,
        400,
        "validation_error",
        "Contact email is required for verification",
      );
    }

    const helpRequest = await HelpRequest.findOne({ requestId });
    if (!helpRequest) {
      return respond.error(res, 404, "not_found", "Help request not found");
    }

    // Verify email matches the original submitter
    if (
      helpRequest.contactEmail.toLowerCase() !==
      contactEmail.trim().toLowerCase()
    ) {
      return respond.error(
        res,
        403,
        "email_mismatch",
        "Contact email does not match the original request",
      );
    }

    // Don't allow replies on closed/invalid requests
    if (["closed", "invalid"].includes(helpRequest.status)) {
      return respond.error(
        res,
        400,
        "request_closed",
        "This help request is closed and cannot receive new replies",
      );
    }

    helpRequest.messages.push({
      sender: "business_owner",
      senderName: contactEmail.trim(),
      content: content.trim(),
      attachments: Array.isArray(attachments)
        ? attachments.filter(Boolean)
        : [],
    });

    helpRequest.status = "waiting_for_business_owner";
    await helpRequest.save();

    return res.json({
      success: true,
      message: "Reply sent successfully",
    });
  } catch (err) {
    logger.error("POST /api/help-requests/:requestId/reply error", {
      error: err.message,
    });
    return respond.error(res, 500, "reply_failed", "Failed to send reply");
  }
});

// ─── PUBLIC: Get request details (by requestId + contactEmail) ────────────────
// GET /api/help-requests/:requestId/public
router.get("/:requestId/public", async (req, res) => {
  try {
    const { requestId } = req.params;
    const { email } = req.query;

    if (!email || !email.includes("@")) {
      return respond.error(res, 400, "validation_error", "Email is required");
    }

    const helpRequest = await HelpRequest.findOne({ requestId });
    if (!helpRequest) {
      return respond.error(res, 404, "not_found", "Help request not found");
    }

    if (helpRequest.contactEmail.toLowerCase() !== email.trim().toLowerCase()) {
      return respond.error(res, 403, "email_mismatch", "Email does not match");
    }

    return res.json({
      success: true,
      data: {
        requestId: helpRequest.requestId,
        subject: helpRequest.subject,
        message: helpRequest.message,
        status: helpRequest.status,
        priority: helpRequest.priority,
        contactEmail: helpRequest.contactEmail,
        businessPermitNumber: helpRequest.businessPermitNumber,
        attachments: helpRequest.attachments,
        messages: helpRequest.messages.map((m) => ({
          sender: m.sender,
          senderName: m.senderName,
          content: m.content,
          attachments: m.attachments,
          createdAt: m.createdAt,
        })),
        createdAt: helpRequest.createdAt,
        updatedAt: helpRequest.updatedAt,
      },
    });
  } catch (err) {
    logger.error("GET /api/help-requests/:requestId/public error", {
      error: err.message,
    });
    return respond.error(
      res,
      500,
      "fetch_failed",
      "Failed to fetch help request",
    );
  }
});

// ─── OFFICER: List Help Requests ─────────────────────────────────────────────
// GET /api/help-requests
router.get(
  "/",
  requireJwt,
  requireRole(["lgu_officer", "admin"]),
  async (req, res) => {
    try {
      const { status, priority, limit = 100 } = req.query;
      const filter = {};

      if (status && VALID_STATUSES.includes(status)) {
        filter.status = status;
      }
      if (priority && VALID_PRIORITIES.includes(priority)) {
        filter.priority = priority;
      }

      const requests = await HelpRequest.find(filter)
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .lean();

      // Sort by priority then by date
      requests.sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority] ?? 2;
        const pb = PRIORITY_ORDER[b.priority] ?? 2;
        if (pa !== pb) return pa - pb;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });

      // Count by status for badge
      const counts = await HelpRequest.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]);
      const countMap = {};
      for (const c of counts) {
        countMap[c._id] = c.count;
      }
      const openCount =
        (countMap.open || 0) +
        (countMap.in_progress || 0) +
        (countMap.needs_response || 0) +
        (countMap.waiting_for_business_owner || 0);

      return res.json({
        success: true,
        data: requests.map((r) => ({
          _id: r._id,
          requestId: r.requestId,
          subject: r.subject,
          message: r.message,
          contactEmail: r.contactEmail,
          businessPermitNumber: r.businessPermitNumber,
          status: r.status,
          priority: r.priority,
          claimedBy: r.claimedBy,
          claimedByName: r.claimedByName,
          claimedAt: r.claimedAt,
          messageCount: (r.messages || []).length,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        })),
        counts: countMap,
        openCount,
      });
    } catch (err) {
      logger.error("GET /api/help-requests error", { error: err.message });
      return respond.error(
        res,
        500,
        "fetch_failed",
        "Failed to fetch help requests",
      );
    }
  },
);

// ─── OFFICER: Get Single Help Request ────────────────────────────────────────
// GET /api/help-requests/:requestId
router.get(
  "/:requestId",
  requireJwt,
  requireRole(["lgu_officer", "admin"]),
  async (req, res) => {
    try {
      const { requestId } = req.params;
      const helpRequest = await HelpRequest.findOne({ requestId });
      if (!helpRequest) {
        return respond.error(res, 404, "not_found", "Help request not found");
      }

      return res.json({
        success: true,
        data: helpRequest.toObject(),
      });
    } catch (err) {
      logger.error("GET /api/help-requests/:requestId error", {
        error: err.message,
      });
      return respond.error(
        res,
        500,
        "fetch_failed",
        "Failed to fetch help request",
      );
    }
  },
);

// ─── OFFICER: Claim Request ──────────────────────────────────────────────────
// PUT /api/help-requests/:requestId/claim
router.put(
  "/:requestId/claim",
  requireJwt,
  requireRole(["lgu_officer", "admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const { requestId } = req.params;
      const helpRequest = await HelpRequest.findOne({ requestId });
      if (!helpRequest) {
        return respond.error(res, 404, "not_found", "Help request not found");
      }

      const previousClaimedBy = helpRequest.claimedBy;
      const previousClaimedByName = helpRequest.claimedByName;

      helpRequest.claimedBy = req._userId;
      helpRequest.claimedByName = req._userEmail || "";
      helpRequest.claimedAt = new Date();
      const previousStatus = helpRequest.status;
      if (helpRequest.status === "open") {
        helpRequest.status = "in_progress";
      }
      await helpRequest.save();

      // Log audit event
      console.log(
        "[HelpRequests] Attempting to log audit event for claim:",
        requestId,
      );
      logAuditEvent("claim", req._userId, "help_request", requestId, {
        claimedBy: req._userId,
        claimedByName: req._userEmail,
        claimedAt: helpRequest.claimedAt,
        status: { from: previousStatus, to: helpRequest.status },
        ...(previousClaimedBy && {
          override: {
            from: previousClaimedBy,
            fromName: previousClaimedByName,
          },
        }),
      }).catch((err) =>
        logger.error("Failed to log claim audit", { error: err.message }),
      );

      return res.json({ success: true, data: helpRequest.toObject() });
    } catch (err) {
      logger.error("PUT /api/help-requests/:requestId/claim error", {
        error: err.message,
      });
      return respond.error(
        res,
        500,
        "claim_failed",
        "Failed to claim help request",
      );
    }
  },
);

// ─── OFFICER: Release Request ────────────────────────────────────────────────
// PUT /api/help-requests/:requestId/release
router.put(
  "/:requestId/release",
  requireJwt,
  requireRole(["lgu_officer", "admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const { requestId } = req.params;
      const helpRequest = await HelpRequest.findOne({ requestId });
      if (!helpRequest) {
        return respond.error(res, 404, "not_found", "Help request not found");
      }

      if (
        helpRequest.claimedBy &&
        String(helpRequest.claimedBy) !== req._userId
      ) {
        return respond.error(
          res,
          403,
          "not_owner",
          "Only the claiming officer can release this request",
        );
      }

      helpRequest.claimedBy = null;
      helpRequest.claimedByName = "";
      helpRequest.claimedAt = null;
      const previousStatus = helpRequest.status;
      if (helpRequest.status === "in_progress") {
        helpRequest.status = "open";
      }
      await helpRequest.save();

      // Log audit event
      console.log(
        "[HelpRequests] Attempting to log audit event for release:",
        requestId,
      );
      logAuditEvent("release", req._userId, "help_request", requestId, {
        releasedBy: req._userId,
        releasedByName: req._userEmail,
        releasedAt: new Date(),
        status: { from: previousStatus, to: helpRequest.status },
      }).catch((err) =>
        logger.error("Failed to log release audit", { error: err.message }),
      );

      return res.json({ success: true, data: helpRequest.toObject() });
    } catch (err) {
      logger.error("PUT /api/help-requests/:requestId/release error", {
        error: err.message,
      });
      return respond.error(
        res,
        500,
        "release_failed",
        "Failed to release help request",
      );
    }
  },
);

// ─── OFFICER: Update Status ──────────────────────────────────────────────────
// PUT /api/help-requests/:requestId/status
router.put(
  "/:requestId/status",
  requireJwt,
  requireRole(["lgu_officer", "admin"]),
  async (req, res) => {
    try {
      const { requestId } = req.params;
      const { status } = req.body || {};

      if (!status || !VALID_STATUSES.includes(status)) {
        return respond.error(
          res,
          400,
          "validation_error",
          `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        );
      }

      const helpRequest = await HelpRequest.findOne({ requestId });
      if (!helpRequest) {
        return respond.error(res, 404, "not_found", "Help request not found");
      }

      // Check if 24-hour window has passed for terminal statuses (closed, invalid)
      const isTerminalStatus = ["closed", "invalid"].includes(
        helpRequest.status,
      );
      const isChangingToTerminal = ["closed", "invalid"].includes(status);

      if (isTerminalStatus && isChangingToTerminal) {
        // Changing from one terminal status to another - check lock
        const statusChangedAt =
          helpRequest.statusChangedAt || helpRequest.createdAt;
        const hoursSinceChange =
          (Date.now() - new Date(statusChangedAt).getTime()) / (1000 * 60 * 60);
        if (hoursSinceChange >= 24) {
          return respond.error(
            res,
            403,
            "status_locked",
            "Terminal status can only be changed within 24 hours. This status is now permanent.",
          );
        }
      }

      const previousStatus = helpRequest.status;
      helpRequest.status = status;
      helpRequest.statusChangedAt = new Date();
      await helpRequest.save();

      // Log audit event
      logAuditEvent("status_update", req._userId, "help_request", requestId, {
        status: { from: previousStatus, to: status },
        updatedByName: req._userEmail,
      }).catch((err) =>
        logger.error("Failed to log status update audit", {
          error: err.message,
        }),
      );

      // Send email notifications for terminal statuses
      if (status === "closed") {
        sendRequestClosedNotification(
          helpRequest.contactEmail,
          requestId,
          helpRequest.subject,
        ).catch((err) =>
          logger.error("Failed to send closed notification", {
            error: err.message,
          }),
        );
      } else if (status === "invalid") {
        sendRequestInvalidNotification(
          helpRequest.contactEmail,
          requestId,
          helpRequest.subject,
        ).catch((err) =>
          logger.error("Failed to send invalid notification", {
            error: err.message,
          }),
        );
      }

      return res.json({ success: true, data: helpRequest.toObject() });
    } catch (err) {
      logger.error("PUT /api/help-requests/:requestId/status error", {
        error: err.message,
      });
      return respond.error(
        res,
        500,
        "status_update_failed",
        "Failed to update status",
      );
    }
  },
);

// ─── OFFICER: Update Priority ────────────────────────────────────────────────
// PUT /api/help-requests/:requestId/priority
router.put(
  "/:requestId/priority",
  requireJwt,
  requireRole(["lgu_officer", "admin"]),
  async (req, res) => {
    try {
      const { requestId } = req.params;
      const { priority } = req.body || {};

      if (!priority || !VALID_PRIORITIES.includes(priority)) {
        return respond.error(
          res,
          400,
          "validation_error",
          `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(", ")}`,
        );
      }

      const helpRequest = await HelpRequest.findOne({ requestId });
      if (!helpRequest) {
        return respond.error(res, 404, "not_found", "Help request not found");
      }

      const previousPriority = helpRequest.priority;
      helpRequest.priority = priority;
      await helpRequest.save();

      // Log audit event
      logAuditEvent("priority_update", req._userId, "help_request", requestId, {
        priority: { from: previousPriority, to: priority },
        updatedByName: req._userEmail,
      }).catch((err) =>
        logger.error("Failed to log priority update audit", {
          error: err.message,
        }),
      );

      return res.json({ success: true, data: helpRequest.toObject() });
    } catch (err) {
      logger.error("PUT /api/help-requests/:requestId/priority error", {
        error: err.message,
      });
      return respond.error(
        res,
        500,
        "priority_update_failed",
        "Failed to update priority",
      );
    }
  },
);

// ─── OFFICER: Add Message (Reply) ────────────────────────────────────────────
// POST /api/help-requests/:requestId/messages
router.post(
  "/:requestId/messages",
  requireJwt,
  requireRole(["lgu_officer", "admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const { requestId } = req.params;
      const { content, attachments } = req.body || {};

      if (!content || !content.trim()) {
        return respond.error(
          res,
          400,
          "validation_error",
          "Message content is required",
        );
      }

      const helpRequest = await HelpRequest.findOne({ requestId });
      if (!helpRequest) {
        return respond.error(res, 404, "not_found", "Help request not found");
      }

      // Fetch officer's name for display
      const User = require("../models/User");
      const officer = await User.findById(req._userId)
        .select("firstName lastName")
        .lean();
      const officerName = officer
        ? `${officer.firstName} ${officer.lastName}`
        : req._userEmail || "Officer";

      helpRequest.messages.push({
        sender: "officer",
        senderName: officerName,
        content: content.trim(),
        attachments: Array.isArray(attachments)
          ? attachments.filter(Boolean)
          : [],
      });

      // Update status to needs_response (waiting for business owner reply)
      helpRequest.status = "needs_response";
      await helpRequest.save();

      // Send email notification to business owner
      const preview =
        content.trim().substring(0, 200) +
        (content.trim().length > 200 ? "..." : "");
      sendOfficerReplyNotification(
        helpRequest.contactEmail,
        requestId,
        preview,
      ).catch((err) =>
        logger.error("Failed to send officer reply email", {
          error: err.message,
        }),
      );

      return res.json({ success: true, data: helpRequest.toObject() });
    } catch (err) {
      logger.error("POST /api/help-requests/:requestId/messages error", {
        error: err.message,
      });
      return respond.error(res, 500, "message_failed", "Failed to add message");
    }
  },
);

// ─── OFFICER: Add Internal Note ──────────────────────────────────────────────
// POST /api/help-requests/:requestId/internal-notes
router.post(
  "/:requestId/internal-notes",
  requireJwt,
  requireRole(["lgu_officer", "admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const { requestId } = req.params;
      const { content } = req.body || {};

      if (!content || !content.trim()) {
        return respond.error(
          res,
          400,
          "validation_error",
          "Note content is required",
        );
      }

      const helpRequest = await HelpRequest.findOne({ requestId });
      if (!helpRequest) {
        return respond.error(res, 404, "not_found", "Help request not found");
      }

      helpRequest.internalNotes.push({
        content: content.trim(),
        addedBy: req._userId,
        addedByName: req._userEmail || "Officer",
      });
      await helpRequest.save();

      return res.json({ success: true, data: helpRequest.toObject() });
    } catch (err) {
      logger.error("POST /api/help-requests/:requestId/internal-notes error", {
        error: err.message,
      });
      return respond.error(
        res,
        500,
        "note_failed",
        "Failed to add internal note",
      );
    }
  },
);

// ─── OFFICER: Get Audit History ───────────────────────────────────────────────
// GET /api/help-requests/:requestId/audit
router.get(
  "/:requestId/audit",
  requireJwt,
  requireRole(["lgu_officer", "admin"]),
  async (req, res) => {
    try {
      const { requestId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const helpRequest = await HelpRequest.findOne({ requestId });
      if (!helpRequest) {
        return respond.error(res, 404, "not_found", "Help request not found");
      }

      // Query AuditLog directly from database (consistent with other services)
      const AuditLog = require("../models/AuditLog");
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const filter = {
        entityType: "help_request",
        entityId: requestId,
      };

      const [logs, total] = await Promise.all([
        AuditLog.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        AuditLog.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / parseInt(limit));

      return res.json({
        success: true,
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
        },
      });
    } catch (err) {
      logger.error("GET /api/help-requests/:requestId/audit error", {
        error: err.message,
      });
      return respond.error(
        res,
        500,
        "fetch_failed",
        "Failed to fetch audit history",
      );
    }
  },
);

// ─── INBOUND EMAIL WEBHOOK (Resend) ─────────────────────────────────────────────
// POST /api/help-requests/inbound
// Handles incoming email replies from business owners
router.post("/inbound", async (req, res) => {
  try {
    // Resend sends webhook with format: { type: "email.received", data: { email_id, from, to, subject, ... } }
    const { type, data } = req.body || {};

    if (type !== "email.received") {
      logger.warn("Inbound webhook wrong event type", { type });
      return res.status(200).json({ message: "Accepted but wrong event type" });
    }

    // Log the full webhook data to see what fields are available
    logger.info("Received inbound email webhook", {
      email_id: data.email_id,
      from: data.from,
      to: data.to,
      subject: data.subject,
      dataKeys: Object.keys(data),
      hasText: !!data.text,
      hasHtml: !!data.html,
      hasRaw: !!data.raw,
    });

    const {
      email_id,
      from,
      to,
      subject,
      text: webhookText,
      html: webhookHtml,
    } = data || {};

    if (!to || !subject) {
      logger.warn("Inbound email missing required fields", { to, subject });
      return res.status(200).json({ message: "Accepted but missing fields" });
    }

    // Extract requestId from subject (format: "Reply to Help Request HR-XXX" or "HR-XXX")
    const requestIdMatch = subject.match(/HR-[A-Z0-9-]+/i);
    if (!requestIdMatch) {
      logger.warn("Inbound email subject does not contain requestId", {
        subject,
      });
      return res
        .status(200)
        .json({ message: "Accepted but no requestId in subject" });
    }

    const requestId = requestIdMatch[0].toUpperCase();
    const helpRequest = await HelpRequest.findOne({ requestId });

    if (!helpRequest) {
      logger.warn("Inbound email for non-existent help request", { requestId });
      return res
        .status(200)
        .json({ message: "Accepted but request not found" });
    }

    // Verify sender email matches the original contact email
    const senderEmail = from?.match(/<(.+)>/)?.[1] || from;
    if (senderEmail?.toLowerCase() !== helpRequest.contactEmail.toLowerCase()) {
      logger.warn(
        "Inbound email sender does not match original contact email",
        {
          requestId,
          senderEmail,
          originalEmail: helpRequest.contactEmail,
        },
      );
      return res.status(200).json({ message: "Accepted but sender mismatch" });
    }

    // Fetch full email content from Resend API with delay + retry
    const axios = require("axios");
    const resendApiKey = process.env.EMAIL_API_KEY;
    let text = webhookText || "",
      html = webhookHtml || "",
      attachments = [];

    // If webhook didn't include content, try fetching from API
    // Add initial delay because Resend may not have content ready when webhook fires
    if (!text && email_id && resendApiKey) {
      const maxRetries = 4;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        // Wait before each attempt (increasing delay: 3s, 5s, 7s, 9s)
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 + attempt * 2000),
        );

        try {
          const response = await axios.get(
            `https://api.resend.com/emails/receiving/${email_id}`,
            {
              headers: {
                Authorization: `Bearer ${resendApiKey}`,
              },
            },
          );
          const emailData = response.data;
          logger.info("Fetched email content from Resend", {
            email_id,
            attempt,
            hasText: !!emailData.text,
            hasHtml: !!emailData.html,
            textLength: emailData.text?.length || 0,
            htmlLength: emailData.html?.length || 0,
          });
          text = emailData.text || "";
          html = emailData.html || "";
          attachments = emailData.attachments || [];
          if (text || html) break; // Got content, exit loop
        } catch (err) {
          logger.warn(
            `Failed to fetch email content from Resend (attempt ${attempt}/${maxRetries})`,
            {
              email_id,
              error: err.message,
              responseStatus: err.response?.status,
            },
          );
        }
      }
    }

    // Add message to help request
    let messageContent = text || html?.replace(/<[^>]*>/g, "") || "";

    // Strip quoted reply content (Gmail and other clients add "On [date], [sender] wrote:")
    // Handle multi-line patterns where "wrote:" might be on a separate line
    const quotedReplyPatterns = [
      /On .+?wrote:\s*$/im, // "On [date] [sender] wrote:" (multi-line)
      /On .+?wrote:/i, // "On [date] [sender] wrote:" (single-line)
      /From: .+/i, // "From: [email]"
      /-----Original Message-----/i,
      />+ On .+?wrote:/i, // Quoted reply starting with >
    ];

    for (const pattern of quotedReplyPatterns) {
      const match = messageContent.match(pattern);
      if (match) {
        const quotedIndex = messageContent.indexOf(match[0]);
        if (quotedIndex > 0) {
          messageContent = messageContent.substring(0, quotedIndex).trim();
          break;
        }
      }
    }

    // Also strip common quote markers like "> "
    messageContent = messageContent
      .split("\n")
      .filter((line) => !line.trim().startsWith(">"))
      .join("\n")
      .trim();

    if (!messageContent) {
      logger.warn(
        "Inbound email has no message content after stripping quotes",
        { requestId },
      );
      return res.status(200).json({ message: "Accepted but no content" });
    }

    helpRequest.messages.push({
      sender: "business_owner",
      senderName: senderEmail,
      content: messageContent.trim(),
      attachments: Array.isArray(attachments)
        ? attachments.map((a) => ({
            filename: a.filename,
            contentType: a.content_type,
            size: a.size,
            cid: a.content_id,
          }))
        : [],
    });

    // Update status to in_progress (officer needs to respond)
    helpRequest.status = "in_progress";
    await helpRequest.save();

    logger.info("Inbound email added to help request", {
      requestId,
      senderEmail,
    });

    return res.status(200).json({ message: "OK" });
  } catch (err) {
    logger.error("Inbound email webhook error", {
      error: err.message,
    });
    // Return 200 to avoid Resend retrying indefinitely
    return res.status(200).json({ message: "Error processing" });
  }
});

module.exports = router;
