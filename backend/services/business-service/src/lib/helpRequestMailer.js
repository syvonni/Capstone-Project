const logger = require("./logger");
const {
  buildNotificationEmailBody,
  buildInfoBox,
  EMAIL_COLORS,
} = require("../../../../shared/lib/emailTemplateBuilder");

/**
 * Help Request Email Service
 * Sends transactional emails for the help request system.
 * Reuses the same sendEmail infrastructure as admin-service mailer.
 */

let sendEmailFn = null;

function getSendEmail() {
  if (sendEmailFn) return sendEmailFn;
  try {
    const { sendEmail } = require("../../admin-service/src/lib/mailer");
    sendEmailFn = sendEmail;
    logger.info("HelpRequest Email: using shared admin-service mailer");
  } catch (err) {
    logger.warn(
      "HelpRequest Email: failed to load admin-service mailer, using fallback",
      {
        error: err.message,
      },
    );
    // Fallback: inline minimal implementation matching admin-service pattern
    const axios = require("axios");
    sendEmailFn = async (opts) => {
      const provider = process.env.EMAIL_API_PROVIDER || "resend";
      const apiKey = process.env.EMAIL_API_KEY || "";
      const fromEmail = process.env.DEFAULT_FROM_EMAIL || "noreply@localhost";

      const devRedirectTo = process.env.EMAIL_DEV_REDIRECT_TO;
      let actualTo = opts.to;
      if (devRedirectTo && devRedirectTo.includes("@")) {
        logger.info("HelpRequest Email: dev redirect", {
          originalTo: opts.to,
          redirectTo: devRedirectTo,
        });
        actualTo = devRedirectTo.trim();
      }

      const placeholderKeys = [
        "your-sendgrid-api-key-here",
        "your-email-api-key-here",
        "your-resend-api-key-here",
      ];
      if (
        !apiKey ||
        placeholderKeys.some((p) => apiKey === p) ||
        process.env.NODE_ENV === "development"
      ) {
        logger.warn("HelpRequest Email: using mock sender", {
          to: actualTo,
          subject: opts.subject,
        });
        return {
          messageId: "mock-" + Date.now(),
          accepted: [actualTo],
          rejected: [],
        };
      }

      if (provider === "resend") {
        const url =
          process.env.EMAIL_API_URL || "https://api.resend.com/emails";
        const response = await axios.post(
          url,
          {
            from: fromEmail,
            to: [actualTo],
            subject: opts.subject,
            text: opts.text || "",
            html: opts.html || "",
            reply_to: opts.replyTo || undefined,
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
          },
        );
        return {
          messageId: response.data?.id || "unknown",
          accepted: [actualTo],
          rejected: [],
        };
      }
      // Fallback mock
      logger.warn("HelpRequest Email: unsupported provider, using mock", {
        provider,
      });
      return {
        messageId: "mock-" + Date.now(),
        accepted: [actualTo],
        rejected: [],
      };
    };
  }
  return sendEmailFn;
}

async function sendHelpRequestConfirmation(to, requestId, subject) {
  const appUrl =
    process.env.FRONTEND_URL || process.env.APP_URL || "http://localhost:5173";
  const brandName = "BizClear";

  const html = buildNotificationEmailBody({
    greeting: "Hello",
    intro:
      "Thank you for reaching out. We have received your help request and will respond as soon as possible.",
    fields: {
      fields: [
        {
          label: "Reference number",
          value: requestId,
          color: EMAIL_COLORS.primary,
          fontSize: "14px",
          fontWeight: "700",
        },
        { label: "Subject", value: subject },
      ],
    },
    appUrl,
  });
  const text = `Help Request Received\n\nReference: ${requestId}\nSubject: ${subject}\n\nWe will respond to your request as soon as possible.\n\n${brandName}`;

  try {
    const sendEmail = getSendEmail();
    await sendEmail({
      to,
      subject: `Help Request Received - ${requestId}`,
      text,
      html,
    });
    logger.info("Help request confirmation sent", { to, requestId });
  } catch (err) {
    logger.error("Failed to send help request confirmation", {
      to,
      requestId,
      error: err.message,
    });
  }
}

async function sendOfficerReplyNotification(to, requestId, messagePreview) {
  const appUrl =
    process.env.FRONTEND_URL || process.env.APP_URL || "http://localhost:5173";
  const brandName = "BizClear";

  const html = buildNotificationEmailBody({
    greeting: "Hello",
    intro:
      "Our team has responded to your help request. Please note that you are limited to sending one reply.",
    fields: {
      fields: [
        {
          label: "Reference",
          value: requestId,
          color: EMAIL_COLORS.primary,
          fontSize: "14px",
          fontWeight: "700",
        },
        { label: "Message", value: messagePreview },
      ],
    },
    appUrl,
  });
  const text = `New Reply to Help Request ${requestId}\n\n${messagePreview}\n\n${brandName}`;

  try {
    const sendEmail = getSendEmail();
    const replyToEmail =
      process.env.HELP_REQUEST_REPLY_TO || "help@erkokoidda.resend.app";
    await sendEmail({
      to,
      subject: `Reply to Help Request ${requestId}`,
      text,
      html,
      replyTo: replyToEmail,
    });
    logger.info("Officer reply notification sent", {
      to,
      requestId,
      replyTo: replyToEmail,
    });
  } catch (err) {
    logger.error("Failed to send officer reply notification", {
      to,
      requestId,
      error: err.message,
    });
  }
}

async function sendRequestClosedNotification(to, requestId, subject) {
  const brandName = "BizClear";

  const html = buildNotificationEmailBody({
    greeting: "Hello",
    intro: "Your help request has been resolved and closed.",
    fields: {
      fields: [
        {
          label: "Reference",
          value: requestId,
          color: EMAIL_COLORS.primary,
          fontSize: "14px",
          fontWeight: "700",
        },
        { label: "Subject", value: subject },
        {
          label: "Status",
          value: "Closed",
          color: EMAIL_COLORS.success,
          fontSize: "14px",
          fontWeight: "700",
        },
      ],
      bgColor: EMAIL_COLORS.bgSuccess,
      borderColor: EMAIL_COLORS.borderSuccess,
      accentColor: EMAIL_COLORS.success,
    },
    appUrl,
  });
  const text = `Help Request Closed\n\nReference: ${requestId}\nSubject: ${subject}\nStatus: Closed\n\n${brandName}`;

  try {
    const sendEmail = getSendEmail();
    await sendEmail({
      to,
      subject: `Help Request Closed - ${requestId}`,
      text,
      html,
    });
    logger.info("Request closed notification sent", { to, requestId });
  } catch (err) {
    logger.error("Failed to send request closed notification", {
      to,
      requestId,
      error: err.message,
    });
  }
}

async function sendRequestInvalidNotification(to, requestId, subject) {
  const brandName = "BizClear";

  const html = buildNotificationEmailBody({
    greeting: "Hello",
    intro:
      "Your help request has been reviewed and marked as invalid by our team. If you believe this is an error, please submit a new request with more details.",
    fields: {
      fields: [
        {
          label: "Reference",
          value: requestId,
          color: EMAIL_COLORS.primary,
          fontSize: "14px",
          fontWeight: "700",
        },
        { label: "Subject", value: subject },
        {
          label: "Status",
          value: "Invalid",
          color: EMAIL_COLORS.antWarning,
          fontSize: "14px",
          fontWeight: "700",
        },
      ],
      bgColor: EMAIL_COLORS.bgWarning,
      borderColor: EMAIL_COLORS.borderWarning,
      accentColor: EMAIL_COLORS.antWarning,
    },
    appUrl,
  });
  const text = `Help Request Invalid\n\nReference: ${requestId}\nSubject: ${subject}\nStatus: Invalid\n\nIf you believe this is an error, please submit a new request.\n\n${brandName}`;

  try {
    const sendEmail = getSendEmail();
    await sendEmail({
      to,
      subject: `Help Request Invalid - ${requestId}`,
      text,
      html,
    });
    logger.info("Request invalid notification sent", { to, requestId });
  } catch (err) {
    logger.error("Failed to send request invalid notification", {
      to,
      requestId,
      error: err.message,
    });
  }
}

module.exports = {
  sendHelpRequestConfirmation,
  sendOfficerReplyNotification,
  sendRequestClosedNotification,
  sendRequestInvalidNotification,
};
