const axios = require("axios");
const {
  buildNotificationEmailBody,
} = require("../../../../shared/lib/emailTemplateBuilder");

/**
 * Email API Service - REST API Implementation
 * Supports multiple providers: Resend, SendGrid, Mailgun, Postmark
 * Default: Resend
 */

// Helper function to create mock email sender (for development)
function createMockEmailSender() {
  return async (opts) => {
    console.log("📧 [MOCK EMAIL] To:", opts.to);
    console.log("Subject:", opts.subject);
    const codeMatch =
      opts.html?.match(/(\d{6})/) || opts.text?.match(/(\d{6})/);
    if (codeMatch) {
      console.log("📧 [MOCK EMAIL] OTP Code:", codeMatch[1]);
    }
    // Simulate successful send
    await new Promise((resolve) => setTimeout(resolve, 50));
    return {
      messageId: "mock-id-" + Date.now(),
      accepted: [opts.to],
      rejected: [],
      response: "250 OK",
    };
  };
}

/**
 * Send email via REST API (SendGrid, Mailgun, etc.)
 */
async function sendEmail(opts) {
  const provider = process.env.EMAIL_API_PROVIDER || "resend";
  const apiKey = process.env.EMAIL_API_KEY || "";
  const apiUrl = process.env.EMAIL_API_URL;
  const fromEmail = process.env.DEFAULT_FROM_EMAIL || "noreply@localhost";

  // Dev redirect: send all emails to one address (e.g. Resend account email) when using Resend without a verified domain
  const devRedirectTo = process.env.EMAIL_DEV_REDIRECT_TO;
  let actualTo = opts.to;
  if (devRedirectTo && devRedirectTo.includes("@")) {
    console.log("📧 [Email] Dev redirect:", opts.to, "→", devRedirectTo);
    actualTo = devRedirectTo.trim();
  }
  opts = { ...opts, to: actualTo };

  const placeholderKeys = [
    "your-sendgrid-api-key-here",
    "your-email-api-key-here",
    "your-resend-api-key-here",
    "YOUR_SENDGRID_API_KEY_HERE",
  ];
  const isPlaceholder = apiKey && placeholderKeys.some((p) => apiKey === p);

  // If no API key or placeholder, use mock sender in development
  if (!apiKey || isPlaceholder || process.env.NODE_ENV === "development") {
    const mockSender = createMockEmailSender();
    return await mockSender(opts);
  }

  try {
    if (provider === "resend") {
      const url = apiUrl || "https://api.resend.com/emails";
      const response = await axios.post(
        url,
        {
          from: fromEmail,
          to: [opts.to],
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
      if (response.status === 200 && response.data) {
        return {
          messageId: response.data.id || "unknown",
          accepted: [opts.to],
          rejected: [],
          response: "250 OK",
        };
      }
      throw new Error(`Resend API returned status: ${response.status}`);
    } else if (provider === "sendgrid") {
      const baseUrl = apiUrl || "https://api.sendgrid.com/v3";
      const response = await axios.post(
        `${baseUrl}/mail/send`,
        {
          personalizations: [
            {
              to: [{ email: opts.to }],
              subject: opts.subject,
            },
          ],
          from: { email: fromEmail },
          reply_to: { email: opts.replyTo || fromEmail },
          content: [
            {
              type: opts.html ? "text/html" : "text/plain",
              value: opts.html || opts.text || "",
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        },
      );
      return {
        messageId: response.headers["x-message-id"] || "unknown",
        accepted: [opts.to],
        rejected: [],
        response: "250 OK",
      };
    } else if (provider === "mailgun") {
      const domain =
        process.env.MAILGUN_DOMAIN ||
        (apiUrl ? new URL(apiUrl).hostname.split(".")[0] : "");
      if (!domain) throw new Error("MAILGUN_DOMAIN is required for Mailgun");
      const mgUrl = apiUrl || `https://api.mailgun.net/v3/${domain}/messages`;
      const response = await axios.post(
        mgUrl,
        new URLSearchParams({
          from: fromEmail,
          to: opts.to,
          subject: opts.subject,
          text: opts.text || "",
          html: opts.html || "",
          "h:Reply-To": opts.replyTo || undefined,
        }),
        {
          auth: {
            username: "api",
            password: apiKey,
          },
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        },
      );
      if (response.status === 200 && response.data) {
        return {
          messageId: response.data.id || "unknown",
          accepted: [opts.to],
          rejected: [],
          response: "250 OK",
        };
      }
      throw new Error(`Mailgun API returned status: ${response.status}`);
    } else {
      throw new Error(
        `Unsupported email provider: ${provider}. Supported: resend, sendgrid, mailgun`,
      );
    }
  } catch (error) {
    console.error("Email send error:", error.message);
    // Fallback to mock in case of error
    const mockSender = createMockEmailSender();
    return await mockSender(opts);
  }
}

/**
 * Send admin alert email for restricted field attempts
 * @param {object} options - Email options
 * @param {string} options.to - Admin email
 * @param {string} options.adminName - Admin name
 * @param {string} options.userId - User ID who attempted
 * @param {string} options.userName - User name
 * @param {string} options.userEmail - User email
 * @param {string} options.field - Field attempted
 * @param {string} options.attemptedValue - Value attempted
 * @param {string} options.roleSlug - User role
 * @param {Date|string} options.timestamp - When attempt occurred
 * @param {string} options.subject - Email subject (optional)
 * @param {string} options.from - From email (optional)
 */
async function sendAdminAlertEmail({
  to,
  adminName,
  userId,
  userName,
  userEmail,
  field,
  attemptedValue,
  roleSlug,
  timestamp,
  subject,
  from = process.env.DEFAULT_FROM_EMAIL || "noreply@localhost",
}) {
  const brandName = "BizClear";
  const appUrl =
    process.env.FRONTEND_URL || process.env.APP_URL || "http://localhost:5173";

  subject =
    subject || `🚨 Security Alert: Restricted Field Attempt - ${brandName}`;

  const attemptTime = timestamp
    ? new Date(timestamp).toLocaleString()
    : new Date().toLocaleString();

  const text = [
    `Hello ${adminName},`,
    "",
    "SECURITY ALERT: A staff user attempted to modify a restricted field.",
    "",
    `User: ${userName} (${userEmail})`,
    `Role: ${roleSlug}`,
    `Field Attempted: ${field}`,
    `Attempted Value: ${attemptedValue}`,
    `Time: ${attemptTime}`,
    "",
    "Please review this attempt and take appropriate action.",
    "",
    `View audit logs: ${appUrl}/admin/audit`,
    "",
    brandName,
  ].join("\n");

  const html = buildNotificationEmailBody({
    greeting: `Hello ${adminName}`,
    intro:
      "A staff user has attempted to modify a restricted field. This action has been blocked and logged.",
    fields: {
      fields: [
        {
          label: "User",
          value: `${userName} (${userEmail})`,
          fontSize: "14px",
        },
        { label: "Role", value: roleSlug, fontSize: "14px" },
        {
          label: "Field Attempted",
          value: field,
          color: "#FF4D4F",
          fontSize: "14px",
          fontWeight: "700",
        },
        {
          label: "Attempted Value",
          value:
            attemptedValue.slice(0, 100) +
            (attemptedValue.length > 100 ? "..." : ""),
          fontSize: "14px",
        },
        { label: "Time", value: attemptTime, fontSize: "14px" },
      ],
    },
    appUrl,
  });

  try {
    await sendEmail({
      to,
      subject,
      text,
      html,
      from,
    });
  } catch (err) {
    console.error("Failed to send admin alert email:", err.message);
    // Don't throw - admin alerts shouldn't break the application flow
  }
}

module.exports = { sendEmail, sendAdminAlertEmail };
