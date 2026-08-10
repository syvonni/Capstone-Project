const axios = require("axios"); // External email service calls use axios directly
const logger = require("./logger");

let buildOtpEmailBody,
  buildNotificationEmailBody,
  buildInfoBox,
  buildWarningBox,
  buildButton,
  buildEmailHtml,
  EMAIL_COLORS;
try {
  const builder = require("../../../../shared/lib/emailTemplateBuilder");
  buildOtpEmailBody = builder.buildOtpEmailBody;
  buildNotificationEmailBody = builder.buildNotificationEmailBody;
  buildInfoBox = builder.buildInfoBox;
  buildWarningBox = builder.buildWarningBox;
  buildButton = builder.buildButton;
  buildEmailHtml = builder.buildEmailHtml;
  EMAIL_COLORS = builder.EMAIL_COLORS;
  console.log("✅ Email template builder loaded successfully");
  logger.info("Email template builder loaded successfully");
} catch (err) {
  console.error("❌ Failed to load email template builder:", err.message);
  logger.error("Failed to load email template builder", { error: err.message });
  throw new Error("Failed to load email template builder: " + err.message);
}

/**
 * Email API Service - REST API Implementation
 * Supports multiple providers: SendGrid, Mailgun, AWS SES, Resend, Postmark
 * Default: Resend
 */

// Helper function to create mock email sender (for development)
function createMockEmailSender() {
  return async (opts) => {
    const codeMatch =
      opts.html?.match(/(\d{6})/) || opts.text?.match(/(\d{6})/);
    logger.warn("Email: using mock sender (no API key). OTP in logs only.", {
      to: opts.to,
      subject: opts.subject,
      otpCode: codeMatch ? codeMatch[1] : undefined,
    });
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
 * @param {object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.from - Sender email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content
 * @returns {Promise<object>} Result with success, messageId, accepted, rejected
 */
async function sendEmailViaAPI({
  to,
  from,
  subject,
  text,
  html,
  headers = {},
}) {
  const provider = process.env.EMAIL_API_PROVIDER || "resend";
  const apiKey = process.env.EMAIL_API_KEY;
  const apiUrl = process.env.EMAIL_API_URL;

  // Dev redirect: send all emails to one address (e.g. your Resend account email) so you can
  // use Resend with onboarding@resend.dev and still receive OTPs for any dev user (Mailinator, etc.).
  const devRedirectTo = process.env.EMAIL_DEV_REDIRECT_TO;
  let actualTo = to;
  if (devRedirectTo && devRedirectTo.includes("@")) {
    logger.info("Email: dev redirect active", {
      originalTo: to,
      redirectTo: devRedirectTo,
    });
    actualTo = devRedirectTo.trim();
  }

  // No API key: use mock in all modes (dev, demo-ui, demo, production) so the app never breaks.
  // To receive real emails in any mode, set EMAIL_API_KEY in .env (e.g. Resend, SendGrid).
  const placeholderKeys = [
    "your-sendgrid-api-key-here",
    "your-email-api-key-here",
    "your-resend-api-key-here",
  ];
  if (!apiKey || placeholderKeys.some((p) => apiKey === p)) {
    logger.warn(
      "Email API key not set or placeholder. Using mock sender (code in logs/UI only).",
    );
    const mockSender = createMockEmailSender();
    return await mockSender({ to: actualTo, subject, text, html });
  }

  try {
    switch (provider.toLowerCase()) {
      case "sendgrid":
        return await sendViaSendGrid({
          to: actualTo,
          from,
          subject,
          text,
          html,
          headers,
          apiKey,
          apiUrl,
        });
      case "mailgun":
        return await sendViaMailgun({
          to: actualTo,
          from,
          subject,
          text,
          html,
          headers,
          apiKey,
          apiUrl,
        });
      case "ses":
      case "aws-ses":
        return await sendViaAWSSES({
          to: actualTo,
          from,
          subject,
          text,
          html,
          headers,
          apiKey,
          apiUrl,
        });
      case "resend":
        return await sendViaResend({
          to: actualTo,
          from,
          subject,
          text,
          html,
          headers,
          apiKey,
          apiUrl,
        });
      case "postmark":
        return await sendViaPostmark({
          to: actualTo,
          from,
          subject,
          text,
          html,
          headers,
          apiKey,
          apiUrl,
        });
      default:
        throw new Error(
          `Unsupported email provider: ${provider}. Supported: sendgrid, mailgun, ses, resend, postmark`,
        );
    }
  } catch (err) {
    if (err.response) {
      logger.error("Email API error", {
        status: err.response.status,
        statusText: err.response.statusText,
        data: err.response.data,
        provider,
      });
    } else {
      logger.error("Email API error", { error: err.message });
    }

    // In development mode, fall back to mock sender on quota errors (429)
    // This allows continued testing when email provider limits are hit
    const isDev = process.env.NODE_ENV !== "production";
    const isQuotaError = err.response?.status === 429;
    if (isDev && isQuotaError) {
      logger.warn(
        "Email: quota exceeded, falling back to mock sender (dev mode)",
        {
          provider,
          status: err.response.status,
        },
      );
      const mockSender = createMockEmailSender();
      return await mockSender({ to: actualTo, subject, text, html });
    }

    // Do not fall back to mock on other API errors: the user would see "verification sent"
    // but receive no email. Let the error propagate so the client gets a clear failure
    // (e.g. "Failed to send verification email") and can fix config (e.g. verify sender in SendGrid).
    throw err;
  }
}

/**
 * Send email via SendGrid API
 */
async function sendViaSendGrid({
  to,
  from,
  subject,
  text,
  html,
  headers,
  apiKey,
  apiUrl,
}) {
  // SendGrid API endpoint - always use the mail/send endpoint
  const url = "https://api.sendgrid.com/v3/mail/send";

  // Validate required fields
  if (!apiKey || !apiKey.startsWith("SG.")) {
    throw new Error('Invalid SendGrid API key. API key must start with "SG."');
  }

  if (!from || !to) {
    throw new Error("From and To email addresses are required");
  }

  const emailData = {
    personalizations: [
      {
        to: [{ email: to }],
        subject: subject,
      },
    ],
    from: { email: from },
    content: [
      { type: "text/plain", value: text },
      { type: "text/html", value: html },
    ],
  };

  // Add custom headers if provided
  if (headers && Object.keys(headers).length > 0) {
    emailData.headers = headers;
  }

  try {
    const response = await axios.post(url, emailData, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    // SendGrid returns 202 Accepted on success
    if (response.status === 202) {
      return {
        success: true,
        messageId: response.headers["x-message-id"] || `sg-${Date.now()}`,
        accepted: [to],
        rejected: [],
      };
    }

    throw new Error(
      `SendGrid API returned unexpected status: ${response.status}`,
    );
  } catch (error) {
    // Provide more detailed error information
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      if (status === 401) {
        throw new Error(
          "SendGrid API: Unauthorized - Invalid API key. Please check your EMAIL_API_KEY in .env file.",
        );
      } else if (status === 403) {
        throw new Error(
          "SendGrid API: Forbidden - API key does not have Mail Send permissions.",
        );
      } else if (status === 404) {
        throw new Error(
          "SendGrid API: Not Found - Invalid endpoint or API key. Ensure your API key is valid and has Mail Send permissions.",
        );
      } else if (status === 400) {
        const errorMsg = data?.errors?.[0]?.message || JSON.stringify(data);
        throw new Error(
          `SendGrid API: Bad Request - ${errorMsg}. Check that your sender email (${from}) is verified in SendGrid.`,
        );
      } else {
        throw new Error(
          `SendGrid API Error (${status}): ${JSON.stringify(data)}`,
        );
      }
    }
    throw error;
  }
}

/**
 * Send email via Mailgun API
 */
async function sendViaMailgun({
  to,
  from,
  subject,
  text,
  html,
  headers,
  apiKey,
  apiUrl,
}) {
  // Extract domain from apiUrl or use default
  const domain =
    process.env.MAILGUN_DOMAIN ||
    (apiUrl ? new URL(apiUrl).hostname.split(".")[0] : "");
  if (!domain) {
    throw new Error("MAILGUN_DOMAIN is required for Mailgun provider");
  }

  const url = apiUrl || `https://api.mailgun.net/v3/${domain}/messages`;

  const formData = new URLSearchParams();
  formData.append("from", from);
  formData.append("to", to);
  formData.append("subject", subject);
  formData.append("text", text);
  formData.append("html", html);

  // Add custom headers
  if (headers && Object.keys(headers).length > 0) {
    Object.entries(headers).forEach(([key, value]) => {
      formData.append(`h:${key}`, value);
    });
  }

  const response = await axios.post(url, formData, {
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (response.status === 200 && response.data) {
    return {
      success: true,
      messageId: response.data.id || `mg-${Date.now()}`,
      accepted: [to],
      rejected: [],
    };
  }

  throw new Error(`Mailgun API returned unexpected status: ${response.status}`);
}

/**
 * Send email via AWS SES API
 */
async function sendViaAWSSES({
  to,
  from,
  subject,
  text,
  html,
  headers,
  apiKey,
  apiUrl,
}) {
  // AWS SES requires AWS SDK, but for REST API we'll use SES API endpoint
  // Note: This is a simplified implementation. Full AWS SES requires AWS SDK or more complex REST calls
  const url = apiUrl || "https://email.us-east-1.amazonaws.com";

  // AWS SES REST API requires AWS Signature Version 4 signing
  // For capstone, recommend using AWS SDK instead, but keeping REST API pattern
  throw new Error(
    "AWS SES REST API requires AWS SDK. Use @aws-sdk/client-ses or switch to SendGrid/Mailgun for simpler REST API implementation.",
  );
}

/**
 * Send email via Resend API
 */
async function sendViaResend({
  to,
  from,
  subject,
  text,
  html,
  headers,
  apiKey,
  apiUrl,
}) {
  const url = apiUrl || "https://api.resend.com/emails";

  const emailData = {
    from: from,
    to: [to],
    subject: subject,
    text: text,
    html: html,
  };

  // Add custom headers
  if (headers && Object.keys(headers).length > 0) {
    emailData.headers = headers;
  }

  const response = await axios.post(url, emailData, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (response.status === 200 && response.data) {
    return {
      success: true,
      messageId: response.data.id || `resend-${Date.now()}`,
      accepted: [to],
      rejected: [],
    };
  }

  throw new Error(`Resend API returned unexpected status: ${response.status}`);
}

/**
 * Send email via Postmark API
 */
async function sendViaPostmark({
  to,
  from,
  subject,
  text,
  html,
  headers,
  apiKey,
  apiUrl,
}) {
  const url = apiUrl || "https://api.postmarkapp.com/email";

  const emailData = {
    From: from,
    To: to,
    Subject: subject,
    TextBody: text,
    HtmlBody: html,
  };

  // Add custom headers
  if (headers && Object.keys(headers).length > 0) {
    emailData.Headers = Object.entries(headers).map(([key, value]) => ({
      Name: key,
      Value: value,
    }));
  }

  const response = await axios.post(url, emailData, {
    headers: {
      "X-Postmark-Server-Token": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  if (response.status === 200 && response.data) {
    return {
      success: true,
      messageId: response.data.MessageID || `postmark-${Date.now()}`,
      accepted: [to],
      rejected: [],
    };
  }

  throw new Error(
    `Postmark API returned unexpected status: ${response.status}`,
  );
}

// Purpose-specific copy for OTP emails (greeting + intro). Intro may use {{brandName}}.
const OTP_PURPOSE_COPY = {
  login: {
    greeting: "Hello",
    intro: `You recently requested to sign in to your {{brandName}} account. Use the code below to complete your verification. Don't share this code with anyone. This code expires in {{expiry}} minutes. If this wasn't you, <a href="{{appUrl}}/support/security" style="color:#0039AF;text-decoration:underline;">report it immediately</a>.`,
  },
  signup: {
    greeting: "Hello",
    intro: `You're signing up for {{brandName}}. Use the code below to verify your email and complete registration. Don't share this code with anyone. This code expires in {{expiry}} minutes. If this wasn't you, <a href="{{appUrl}}/support/security" style="color:#0039AF;text-decoration:underline;">report it immediately</a>.`,
  },
  email_change: {
    greeting: "Hello",
    intro: `You requested to change the email address for your account. Use the code below to confirm this change. Don't share this code with anyone. This code expires in {{expiry}} minutes. If this wasn't you, <a href="{{appUrl}}/account/email/revert" style="color:#0039AF;text-decoration:underline;">revert this change</a> within 24 hours.`,
  },
  password_change: {
    greeting: "Hello",
    intro: `You requested to change your password. Use the code below to confirm your identity and complete the change. Don't share this code with anyone. This code expires in {{expiry}} minutes. If this wasn't you, <a href="{{appUrl}}/support/security" style="color:#0039AF;text-decoration:underline;">report it immediately</a>.`,
  },
  password_reset: {
    greeting: "Hello",
    intro: `You requested to reset your password. Use the code below to set a new password. If you didn't request this, you can safely ignore this email. Don't share this code with anyone. This code expires in {{expiry}} minutes.`,
  },
  account_deletion: {
    greeting: "Hello",
    intro: `You requested to permanently delete your account. Use the code below to confirm account deletion. This action cannot be undone after the grace period. Don't share this code with anyone. This code expires in {{expiry}} minutes. If this wasn't you, <a href="{{appUrl}}/support/security" style="color:#0039AF;text-decoration:underline;">report it immediately</a>.`,
  },
  mfa_setup: {
    greeting: "Hello",
    intro: `You're enabling fingerprint or additional verification. Use the code below to complete setup. Don't share this code with anyone. This code expires in {{expiry}} minutes. If this wasn't you, <a href="{{appUrl}}/support/security" style="color:#0039AF;text-decoration:underline;">report it immediately</a>.`,
  },
  generic: {
    greeting: "Hello",
    intro: `You requested a verification code. Use the code below to complete your request. Don't share this code with anyone. This code expires in {{expiry}} minutes. If this wasn't you, <a href="{{appUrl}}/support/security" style="color:#0039AF;text-decoration:underline;">report it immediately</a>.`,
  },
};

const VALID_OTP_PURPOSES = new Set(Object.keys(OTP_PURPOSE_COPY));

async function sendOtp({
  to,
  code,
  subject = "Your verification code",
  from = process.env.DEFAULT_FROM_EMAIL || process.env.EMAIL_HOST_USER,
  purpose = "login",
}) {
  const ttlMin = Number(process.env.VERIFICATION_CODE_TTL_MIN || 10);
  const brandName = "BizClear";
  const supportEmail =
    process.env.SUPPORT_EMAIL ||
    process.env.EMAIL_HOST_USER ||
    "support@bizclear.com";
  const appUrl =
    process.env.FRONTEND_URL || process.env.APP_URL || "http://localhost:5173";

  const purposeKey = VALID_OTP_PURPOSES.has(purpose) ? purpose : "generic";
  const { greeting, intro } = OTP_PURPOSE_COPY[purposeKey];
  const introText = intro
    .replace(/\{\{brandName\}\}/g, brandName)
    .replace(/\{\{expiry\}\}/g, ttlMin)
    .replace(/\{\{appUrl\}\}/g, appUrl);
  const introHtml = intro
    .replace(/\{\{brandName\}\}/g, `<strong>${brandName}</strong>`)
    .replace(/\{\{expiry\}\}/g, ttlMin)
    .replace(/\{\{appUrl\}\}/g, appUrl);

  const text = [
    "Hello,",
    "",
    introText,
    "",
    `Your verification code is: ${code}`,
    "",
    "Thank you,",
    brandName,
  ].join("\n");
  const html = buildOtpEmailBody({
    greeting,
    intro: introHtml,
    code,
    appUrl,
  });

  logger.info("Email: OTP HTML generated", {
    hasHeader: html.includes("BizClear"),
    hasFooter: html.includes("Terms of Service"),
    hasOldFooter: html.includes("Dagupan"),
    htmlLength: html.length,
    htmlSnippet: html.substring(0, 500),
  });

  const isDevelopment = process.env.NODE_ENV !== "production";

  try {
    // Validate email address first
    if (!to || !to.includes("@")) {
      throw new Error(`Invalid email address: ${to}`);
    }

    // Ensure 'from' is set
    const fromAddress =
      from || process.env.DEFAULT_FROM_EMAIL || "noreply@example.com";

    logger.info("Email: sending OTP", {
      to,
      provider: process.env.EMAIL_API_PROVIDER || "resend",
    });

    const result = await sendEmailViaAPI({
      to,
      from: fromAddress,
      subject,
      text,
      html,
      headers: {
        "X-Mailer": "BizClear",
        "List-Unsubscribe": `<${appUrl}/unsubscribe>`,
      },
    });

    logger.info("Email: OTP sent successfully", {
      to,
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
    });

    // Check if email was actually rejected
    if (result.rejected && result.rejected.length > 0) {
      const error = new Error(
        `Email rejected for: ${result.rejected.join(", ")}`,
      );
      logger.warn("Email: recipients rejected", {
        to,
        rejected: result.rejected,
      });
      throw error;
    }

    return {
      success: true,
      messageId: result.messageId,
      accepted: result.accepted,
    };
  } catch (err) {
    logger.error("Email: OTP send failed", {
      to,
      subject,
      error: err.message,
      apiStatus: err.response?.status,
      apiResponse: err.response?.data,
    });

    // Return failure result instead of silently swallowing
    return { success: false, error: err.message };
  }
}

/**
 * Send "forgot password not available" email for admin/staff (no verification code; user sees not-allowed screen immediately).
 * @param {object} options
 * @param {string} options.to - Recipient email
 * @param {string} [options.code] - Optional 6-digit code (omitted from email when not provided)
 * @param {string} options.roleSlug - User role slug (admin, staff, etc.)
 * @param {string} [options.subject] - Email subject
 * @param {string} [options.from] - From address
 */
async function sendForgotPasswordNotAvailableEmail({
  to,
  code,
  roleSlug,
  subject,
  from = process.env.DEFAULT_FROM_EMAIL || process.env.EMAIL_HOST_USER,
}) {
  const logger = require("./logger");
  const ttlMin = Number(process.env.VERIFICATION_CODE_TTL_MIN || 10);
  const brandName = "BizClear";
  const appUrl =
    process.env.FRONTEND_URL || process.env.APP_URL || "http://localhost:5173";
  const supportEmail =
    process.env.SUPPORT_EMAIL ||
    process.env.EMAIL_HOST_USER ||
    "support@bizclear.com";
  const { isStaffRole } = require("./roleHelpers");

  subject =
    subject ||
    `Password reset request – not available for your account - ${brandName}`;

  const isStaff = isStaffRole(roleSlug);
  const instructionText = isStaff
    ? "If you are staff, use Request Recovery from the staff portal."
    : "If you are an administrator, contact another administrator to change your password.";
  const instructionHtml = isStaff
    ? "If you are <strong>staff</strong>, use <strong>Request Recovery</strong> from the staff portal."
    : "If you are an <strong>administrator</strong>, contact another administrator to change your password.";

  const textLines = [
    "Hello,",
    "",
    "You requested a password reset, but password reset is not available for your account type.",
    "",
    instructionText,
    "",
    "This action has been logged and administrators have been alerted to this attempt.",
    "",
  ];
  if (code) {
    textLines.push("Your verification code (to confirm this request): " + code);
    textLines.push(`This code expires in ${ttlMin} minutes.`);
    textLines.push("");
  }
  textLines.push("Thank you,", brandName);
  const text = textLines.join("\n");

  const codeBlockHtml = code
    ? `<p style="margin:0 0 12px;color:${EMAIL_COLORS.textSecondary};font-size:14px;">Your verification code (to confirm this request):</p>
        <div style="background:${EMAIL_COLORS.bgWhite};padding:16px;border-radius:8px;border:1px dashed ${EMAIL_COLORS.primary};margin-bottom:16px;display:inline-block;">
          <div style="font-size:18px;letter-spacing:4px;color:${EMAIL_COLORS.primary};font-weight:600;font-family:monospace;">${code}</div>
        </div>
        <p style="margin:0;color:${EMAIL_COLORS.textTertiary};font-size:14px;">This code expires in ${ttlMin} minutes.</p>`
    : "";

  let html = buildNotificationEmailBody({
    greeting: "Hello",
    intro: `You requested a password reset, but password reset is <strong>not available</strong> for your account type. ${instructionHtml} This action has been logged and administrators have been alerted to this attempt.`,
    appUrl,
  });
  // Add code block if present
  if (code) {
    html = html.replace(/<\/div>\s*<\/body>/, `${codeBlockHtml}</div></body>`);
  }

  try {
    if (!to || !to.includes("@")) {
      throw new Error(`Invalid email address: ${to}`);
    }
    const fromAddress =
      from || process.env.DEFAULT_FROM_EMAIL || "noreply@example.com";
    logger.info("Email: sending forgot-password not available", { to });
    const result = await sendEmailViaAPI({
      to,
      from: fromAddress,
      subject,
      text,
      html,
      headers: {
        "X-Mailer": "BizClear",
        "List-Unsubscribe": `<${appUrl}/unsubscribe>`,
      },
    });
    if (result.rejected && result.rejected.length > 0) {
      const error = new Error(
        `Email rejected for: ${result.rejected.join(", ")}`,
      );
      logger.warn("Email: recipients rejected", {
        to,
        rejected: result.rejected,
      });
      throw error;
    }
    return {
      success: true,
      messageId: result.messageId,
      accepted: result.accepted,
    };
  } catch (err) {
    logger.error("Email: sendForgotPasswordNotAvailableEmail failed", {
      to,
      error: err.message,
    });
    return { success: false, error: err.message };
  }
}

async function sendStaffCredentialsEmail({
  to,
  username,
  tempPassword,
  office,
  roleLabel,
  subject = "Your Staff Account Credentials",
  from = process.env.DEFAULT_FROM_EMAIL || process.env.EMAIL_HOST_USER,
}) {
  const brandName = "BizClear";
  const appUrl =
    process.env.FRONTEND_URL || process.env.APP_URL || "http://localhost:5173";
  const supportEmail =
    process.env.SUPPORT_EMAIL ||
    process.env.EMAIL_HOST_USER ||
    "support@bizclear.com";

  const textLines = [
    `Welcome to ${brandName} Staff Portal`,
    "",
    "Your staff account has been created successfully.",
    "",
    "Here are your login credentials:",
  ];
  if (username) textLines.push(`Username: ${username}`);
  textLines.push(
    `Temporary Password: ${tempPassword}`,
    "",
    `Office: ${office}`,
    `Role: ${roleLabel}`,
    "",
    "Please log in and change your password immediately.",
    `Login here: ${appUrl}/auth/login`,
    "",
    "Thank you,",
    brandName,
  );
  const text = textLines.join("\n");

  const html = buildNotificationEmailBody({
    greeting: "Hello",
    intro:
      'Your staff account has been created. Use the credentials below to access the portal. Please <a href="http://localhost:5173/auth/login" style="color:#0039AF;text-decoration:underline;">log in</a> and change your password immediately.',
    fields: {
      fields: [
        ...(username
          ? [
              {
                label: "Username",
                value: username,
                color: EMAIL_COLORS.primary,
                fontSize: "14px",
                fontWeight: "700",
              },
            ]
          : []),
        {
          label: "Temporary password",
          value: tempPassword,
          color: EMAIL_COLORS.primary,
          fontSize: "14px",
          fontWeight: "700",
        },
        { label: "Office", value: office },
        { label: "Role", value: roleLabel },
      ],
    },
    appUrl,
  });

  try {
    const fromAddress =
      from || process.env.DEFAULT_FROM_EMAIL || "noreply@example.com";
    await sendEmailViaAPI({ to, from: fromAddress, subject, text, html });
  } catch (err) {
    console.log("--------------------------------------------------");
    console.log("⚠️  EMAIL API FAILED (Send Staff Credentials) ⚠️");
    console.log("To:", to);
    console.log("Username:", username);
    console.log("TempPass:", tempPassword);
    console.log("Error:", err.message);
    console.log("--------------------------------------------------");
  }
}

async function sendBusinessOwnerCredentialsEmail({
  to,
  firstName,
  lastName,
  tempPassword,
  subject = "Your Business Owner Account Credentials",
  from = process.env.DEFAULT_FROM_EMAIL || process.env.EMAIL_HOST_USER,
}) {
  const brandName = "BizClear";
  const appUrl =
    process.env.FRONTEND_URL || process.env.APP_URL || "http://localhost:5173";
  const supportEmail =
    process.env.SUPPORT_EMAIL ||
    process.env.EMAIL_HOST_USER ||
    "support@bizclear.com";

  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  const textLines = [
    `Welcome to ${brandName}`,
    "",
    "Your business owner account has been created successfully.",
    "",
    "Here are your login credentials:",
    `Email: ${to}`,
    `Temporary Password: ${tempPassword}`,
    "",
    "Please log in and change your password immediately.",
    `Login here: ${appUrl}/auth/login`,
    "",
    "Thank you,",
    brandName,
  ];
  const text = textLines.join("\n");

  const html = buildNotificationEmailBody({
    greeting: `Hello ${firstName}`,
    intro:
      'Your business owner account has been created. Use the credentials below to access the portal. Please <a href="http://localhost:5173/auth/login" style="color:#0039AF;text-decoration:underline;">log in</a> and change your password immediately.',
    fields: {
      fields: [
        { label: "Email", value: to },
        {
          label: "Temporary password",
          value: tempPassword,
          color: EMAIL_COLORS.primary,
          fontSize: "14px",
          fontWeight: "700",
        },
      ],
    },
    appUrl,
  });

  try {
    const fromAddress =
      from || process.env.DEFAULT_FROM_EMAIL || "noreply@example.com";
    await sendEmailViaAPI({ to, from: fromAddress, subject, text, html });
  } catch (err) {
    console.log("--------------------------------------------------");
    console.log("⚠️  EMAIL API FAILED (Send Business Owner Credentials) ⚠️");
    console.log("To:", to);
    console.log("Name:", fullName);
    console.log("TempPass:", tempPassword);
    console.log("Error:", err.message);
    console.log("--------------------------------------------------");
  }
}

/**
 * Send email change notification
 * @param {object} options - Notification options
 * @param {string} options.to - Recipient email
 * @param {string} options.oldEmail - Old email address
 * @param {string} options.newEmail - New email address
 * @param {number} options.gracePeriodHours - Grace period in hours (default: 24)
 * @param {string} options.revertUrl - URL to revert email change
 * @param {string} options.type - 'old_email' or 'new_email'
 */
async function sendEmailChangeNotification({
  to,
  oldEmail,
  newEmail,
  gracePeriodHours = 24,
  revertUrl,
  type = "old_email",
  subject,
  from = process.env.DEFAULT_FROM_EMAIL || process.env.EMAIL_HOST_USER,
}) {
  const brandName = "BizClear";
  const appUrl =
    process.env.FRONTEND_URL || process.env.APP_URL || "http://localhost:5173";
  const supportEmail =
    process.env.SUPPORT_EMAIL ||
    process.env.EMAIL_HOST_USER ||
    "support@bizclear.com";

  const defaultSubject =
    type === "old_email"
      ? `Email Change Requested - ${brandName}`
      : `Welcome to ${brandName} - Email Change Confirmation`;

  subject = subject || defaultSubject;

  const isOldEmail = type === "old_email";
  const text = [
    `Hello,`,
    "",
    isOldEmail
      ? `We received a request to change the email address associated with your ${brandName} account.`
      : `Your email address has been updated for your ${brandName} account.`,
    "",
    `Old Email: ${oldEmail}`,
    `New Email: ${newEmail}`,
    "",
    isOldEmail
      ? `You have ${gracePeriodHours} hours to revert this change if you didn't request it.`
      : `If you didn't request this change, please contact support immediately.`,
    "",
    isOldEmail && revertUrl ? `Revert this change: ${revertUrl}` : "",
    "",
    `If you have any concerns, please contact support: ${supportEmail}`,
    "",
    "Thank you,",
    brandName,
  ]
    .filter(Boolean)
    .join("\n");

  const introText = isOldEmail
    ? `We received a request to change the email address associated with your <strong>${brandName}</strong> account. You have a ${gracePeriodHours}-hour grace period to <a href="${appUrl}/account/email/revert" style="color:#0039AF;text-decoration:underline;">revert this change</a>.`
    : `Your email address has been successfully updated for your <strong>${brandName}</strong> account.`;

  const html = buildNotificationEmailBody({
    greeting: "Hello",
    intro: introText,
    fields: {
      fields: [
        { label: "Old email", value: oldEmail },
        {
          label: "New email",
          value: newEmail,
          color: EMAIL_COLORS.primary,
          fontSize: "14px",
          fontWeight: "700",
        },
      ],
    },
    appUrl,
  });

  try {
    const fromAddress =
      from || process.env.DEFAULT_FROM_EMAIL || "noreply@example.com";
    await sendEmailViaAPI({ to, from: fromAddress, subject, text, html });
  } catch (err) {
    console.log("--------------------------------------------------");
    console.log("⚠️  EMAIL API FAILED (Email Change Notification) ⚠️");
    console.log("To:", to);
    console.log("Type:", type);
    console.log("Error:", err.message);
    console.log("--------------------------------------------------");
  }
}

/**
 * Send password change notification
 * @param {object} options - Notification options
 * @param {string} options.to - Recipient email
 * @param {string} options.firstName - User's first name
 * @param {string} options.lastName - User's last name
 * @param {Date} options.timestamp - When password was changed
 */
async function sendPasswordChangeNotification({
  to,
  firstName,
  lastName,
  timestamp,
  subject,
  from = process.env.DEFAULT_FROM_EMAIL || process.env.EMAIL_HOST_USER,
}) {
  const brandName = "BizClear";
  const appUrl =
    process.env.FRONTEND_URL || process.env.APP_URL || "http://localhost:5173";
  const supportEmail =
    process.env.SUPPORT_EMAIL ||
    process.env.EMAIL_HOST_USER ||
    "support@bizclear.com";

  subject = subject || `Password Changed - ${brandName}`;

  const changeTime = timestamp
    ? new Date(timestamp).toLocaleString()
    : new Date().toLocaleString();

  const text = [
    `Hello ${firstName},`,
    "",
    `Your password for ${brandName} has been successfully changed.`,
    "",
    `Change Time: ${changeTime}`,
    "",
    "If you didn't make this change, please contact support immediately.",
    "",
    `Support: ${supportEmail}`,
    "",
    "Thank you,",
    brandName,
  ].join("\n");

  const html = buildNotificationEmailBody({
    greeting: `Hello ${firstName}`,
    intro: `Your password for <strong>${brandName}</strong> has been successfully changed. If you didn't make this change, please <a href="${appUrl}/support/security" style="color:#0039AF;text-decoration:underline;">contact support immediately</a>.`,
    appUrl,
  });

  try {
    const fromAddress =
      from || process.env.DEFAULT_FROM_EMAIL || "noreply@example.com";
    await sendEmailViaAPI({ to, from: fromAddress, subject, text, html });
  } catch (err) {
    console.log("--------------------------------------------------");
    console.log("⚠️  EMAIL API FAILED (Password Change Notification) ⚠️");
    console.log("To:", to);
    console.log("Error:", err.message);
    console.log("--------------------------------------------------");
  }
}

/**
 * Send MFA enabled notification (authenticator app or passkey)
 * @param {object} options - Notification options
 * @param {string} options.to - Recipient email
 * @param {string} options.firstName - User's first name
 * @param {string} options.lastName - User's last name
 * @param {string} options.method - 'authenticator' or 'passkey'
 */
async function sendMfaEnabledNotification({
  to,
  firstName,
  lastName,
  method = "authenticator",
  subject,
  from = process.env.DEFAULT_FROM_EMAIL || process.env.EMAIL_HOST_USER,
}) {
  const brandName = "BizClear";
  const supportEmail =
    process.env.SUPPORT_EMAIL ||
    process.env.EMAIL_HOST_USER ||
    "support@bizclear.com";

  subject = subject || `Two-Factor Authentication Enabled - ${brandName}`;
  const methodLabel =
    method === "passkey"
      ? "passkey (e.g. Face ID, Windows Hello)"
      : "authenticator app";

  const text = [
    `Hello ${firstName},`,
    "",
    `Two-factor authentication has been enabled for your ${brandName} account using ${methodLabel}.`,
    "",
    "You will need this method when signing in. If you didn't make this change, please contact support immediately.",
    "",
    `Support: ${supportEmail}`,
    "",
    "Thank you,",
    brandName,
  ].join("\n");

  const html = buildNotificationEmailBody({
    greeting: `Hello ${firstName}`,
    intro: `Two-factor authentication has been enabled for your <strong>${brandName}</strong> account using <strong>${methodLabel}</strong>. You will need this method when signing in. If you didn't make this change, please contact support immediately.`,
    appUrl,
  });

  try {
    const fromAddress =
      from || process.env.DEFAULT_FROM_EMAIL || "noreply@example.com";
    await sendEmailViaAPI({ to, from: fromAddress, subject, text, html });
  } catch (err) {
    console.log("--------------------------------------------------");
    console.log("⚠️  EMAIL API FAILED (MFA Enabled Notification) ⚠️");
    console.log("To:", to, "Error:", err.message);
    console.log("--------------------------------------------------");
  }
}

/**
 * Send MFA disable requested notification (24-hour delay)
 * @param {object} options - Notification options
 * @param {string} options.to - Recipient email
 * @param {string} options.firstName - User's first name
 * @param {string} options.lastName - User's last name
 * @param {Date} options.scheduledFor - When MFA will be disabled
 */
async function sendMfaDisableRequestedNotification({
  to,
  firstName,
  lastName,
  scheduledFor,
  subject,
  from = process.env.DEFAULT_FROM_EMAIL || process.env.EMAIL_HOST_USER,
}) {
  const brandName = "BizClear";
  const supportEmail =
    process.env.SUPPORT_EMAIL ||
    process.env.EMAIL_HOST_USER ||
    "support@bizclear.com";

  subject = subject || `MFA Disable Requested - ${brandName}`;
  const disableTime = scheduledFor
    ? new Date(scheduledFor).toLocaleString()
    : "in 24 hours";

  const text = [
    `Hello ${firstName},`,
    "",
    `A request to disable two-factor authentication for your ${brandName} account has been received.`,
    "",
    `MFA will be disabled on: ${disableTime}`,
    "",
    "You can cancel this request from your security settings before that time. If you didn't request this, please secure your account and contact support.",
    "",
    `Support: ${supportEmail}`,
    "",
    "Thank you,",
    brandName,
  ].join("\n");

  const html = buildNotificationEmailBody({
    greeting: `Hello ${firstName}`,
    intro: `A request to disable two-factor authentication for your <strong>${brandName}</strong> account has been received. MFA will be disabled on: ${disableTime}. You can cancel this request from your security settings before that time. If you didn't request this, please secure your account and contact support.`,
    appUrl,
  });

  try {
    const fromAddress =
      from || process.env.DEFAULT_FROM_EMAIL || "noreply@example.com";
    await sendEmailViaAPI({ to, from: fromAddress, subject, text, html });
  } catch (err) {
    console.log("--------------------------------------------------");
    console.log("⚠️  EMAIL API FAILED (MFA Disable Requested Notification) ⚠️");
    console.log("To:", to, "Error:", err.message);
    console.log("--------------------------------------------------");
  }
}

/**
 * Send MFA disabled notification (after disable completed)
 * @param {object} options - Notification options
 * @param {string} options.to - Recipient email
 * @param {string} options.firstName - User's first name
 * @param {string} options.lastName - User's last name
 */
async function sendMfaDisabledNotification({
  to,
  firstName,
  lastName,
  subject,
  from = process.env.DEFAULT_FROM_EMAIL || process.env.EMAIL_HOST_USER,
}) {
  const brandName = "BizClear";
  const supportEmail =
    process.env.SUPPORT_EMAIL ||
    process.env.EMAIL_HOST_USER ||
    "support@bizclear.com";

  subject = subject || `Two-Factor Authentication Disabled - ${brandName}`;

  const text = [
    `Hello ${firstName},`,
    "",
    `Two-factor authentication has been disabled for your ${brandName} account.`,
    "",
    "If you didn't make this change, please contact support immediately and re-enable MFA from your security settings.",
    "",
    `Support: ${supportEmail}`,
    "",
    "Thank you,",
    brandName,
  ].join("\n");

  const html = buildNotificationEmailBody({
    greeting: `Hello ${firstName}`,
    intro: `Two-factor authentication has been disabled for your <strong>${brandName}</strong> account. If you didn't make this change, please contact support immediately and re-enable MFA from your security settings.`,
    appUrl,
  });

  try {
    const fromAddress =
      from || process.env.DEFAULT_FROM_EMAIL || "noreply@example.com";
    await sendEmailViaAPI({ to, from: fromAddress, subject, text, html });
  } catch (err) {
    console.log("--------------------------------------------------");
    console.log("⚠️  EMAIL API FAILED (MFA Disabled Notification) ⚠️");
    console.log("To:", to, "Error:", err.message);
    console.log("--------------------------------------------------");
  }
}

/**
 * Send passkey added notification
 * @param {object} options - Notification options
 * @param {string} options.to - Recipient email
 * @param {string} options.firstName - User's first name
 * @param {string} options.lastName - User's last name
 */
async function sendPasskeyAddedNotification({
  to,
  firstName,
  lastName,
  subject,
  from = process.env.DEFAULT_FROM_EMAIL || process.env.EMAIL_HOST_USER,
}) {
  const brandName = "BizClear";
  const supportEmail =
    process.env.SUPPORT_EMAIL ||
    process.env.EMAIL_HOST_USER ||
    "support@bizclear.com";

  subject = subject || `Passkey Added - ${brandName}`;

  const text = [
    `Hello ${firstName},`,
    "",
    `A passkey has been added to your ${brandName} account. You can use it to sign in (e.g. Face ID, Windows Hello).`,
    "",
    "If you didn't add this passkey, please remove it from security settings and contact support.",
    "",
    `Support: ${supportEmail}`,
    "",
    "Thank you,",
    brandName,
  ].join("\n");

  const html = buildNotificationEmailBody({
    greeting: `Hello ${firstName}`,
    intro: `A passkey has been added to your <strong>${brandName}</strong> account. You can use it to sign in (e.g. Face ID, Windows Hello). If you didn't add this passkey, please remove it from security settings and contact support.`,
    appUrl,
  });

  try {
    const fromAddress =
      from || process.env.DEFAULT_FROM_EMAIL || "noreply@example.com";
    await sendEmailViaAPI({ to, from: fromAddress, subject, text, html });
  } catch (err) {
    console.log("--------------------------------------------------");
    console.log("⚠️  EMAIL API FAILED (Passkey Added Notification) ⚠️");
    console.log("To:", to, "Error:", err.message);
    console.log("--------------------------------------------------");
  }
}

/**
 * Send passkey removed notification
 * @param {object} options - Notification options
 * @param {string} options.to - Recipient email
 * @param {string} options.firstName - User's first name
 * @param {string} options.lastName - User's last name
 */
async function sendPasskeyRemovedNotification({
  to,
  firstName,
  lastName,
  subject,
  from = process.env.DEFAULT_FROM_EMAIL || process.env.EMAIL_HOST_USER,
}) {
  const brandName = "BizClear";
  const supportEmail =
    process.env.SUPPORT_EMAIL ||
    process.env.EMAIL_HOST_USER ||
    "support@bizclear.com";

  subject = subject || `Passkey Removed - ${brandName}`;

  const text = [
    `Hello ${firstName},`,
    "",
    `A passkey has been removed from your ${brandName} account.`,
    "",
    "If you didn't make this change, please contact support and consider re-adding a passkey or enabling an authenticator app from security settings.",
    "",
    `Support: ${supportEmail}`,
    "",
    "Thank you,",
    brandName,
  ].join("\n");

  const html = buildNotificationEmailBody({
    greeting: `Hello ${firstName}`,
    intro: `A passkey has been removed from your <strong>${brandName}</strong> account. If you didn't make this change, please <a href="${appUrl}/support/security" style="color:#0039AF;text-decoration:underline;">contact support</a>.`,
    appUrl,
  });

  try {
    const fromAddress =
      from || process.env.DEFAULT_FROM_EMAIL || "noreply@example.com";
    await sendEmailViaAPI({ to, from: fromAddress, subject, text, html });
  } catch (err) {
    console.log("--------------------------------------------------");
    console.log("⚠️  EMAIL API FAILED (Passkey Removed Notification) ⚠️");
    console.log("To:", to, "Error:", err.message);
    console.log("--------------------------------------------------");
  }
}

/**
 * Send admin alert email
 * @param {object} options - Alert options
 * @param {string} options.to - Admin email
 * @param {string} options.adminName - Admin name
 * @param {string} options.userId - User ID who attempted change
 * @param {string} options.userName - User name
 * @param {string} options.userEmail - User email
 * @param {string} options.field - Field attempted
 * @param {string} options.attemptedValue - Value attempted
 * @param {string} options.roleSlug - User role
 * @param {Date} options.timestamp - When attempt occurred
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
  from = process.env.DEFAULT_FROM_EMAIL || process.env.EMAIL_HOST_USER,
}) {
  const brandName = "BizClear";
  const appUrl =
    process.env.FRONTEND_URL || process.env.APP_URL || "http://localhost:5173";

  subject =
    subject || `Security Alert: Restricted Field Attempt - ${brandName}`;

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
        { label: "User", value: `${userName} (${userEmail})` },
        { label: "Role", value: roleSlug },
        {
          label: "Field attempted",
          value: field,
          color: EMAIL_COLORS.antError,
          fontSize: "14px",
          fontWeight: "700",
        },
        { label: "Attempted value", value: attemptedValue },
        { label: "Time", value: attemptTime },
      ],
      bgColor: EMAIL_COLORS.bgError,
      borderColor: EMAIL_COLORS.borderError,
      accentColor: EMAIL_COLORS.antError,
    },
    appUrl,
  });

  try {
    const fromAddress =
      from || process.env.DEFAULT_FROM_EMAIL || "noreply@example.com";
    await sendEmailViaAPI({ to, from: fromAddress, subject, text, html });
  } catch (err) {
    console.log("--------------------------------------------------");
    console.log("⚠️  EMAIL API FAILED (Admin Alert Email) ⚠️");
    console.log("To:", to);
    console.log("Error:", err.message);
    console.log("--------------------------------------------------");
  }
}

/**
 * Send admin alert for staff or admin forgot-password attempt (styled like other security alerts).
 * @param {object} options - { to, adminName, userId, userEmail, roleSlug, ipAddress, userAgent }
 */
async function sendStaffOrAdminForgotPasswordAlertEmail({
  to,
  adminName,
  userId,
  userEmail,
  roleSlug,
  ipAddress,
  userAgent,
  subject,
  from = process.env.DEFAULT_FROM_EMAIL || process.env.EMAIL_HOST_USER,
}) {
  const brandName = "BizClear";
  const appUrl =
    process.env.FRONTEND_URL || process.env.APP_URL || "http://localhost:5173";

  subject =
    subject ||
    `Security Alert: Forgot password attempt (staff/admin) - ${brandName}`;

  const attemptTime = new Date().toLocaleString();
  const roleLabel = (roleSlug || "unknown").replace(/_/g, " ");

  const text = [
    `Hello ${adminName},`,
    "",
    "SECURITY ALERT: A staff or admin account was used on the Forgot Password page. Password reset is not allowed for this account type; the attempt has been logged.",
    "",
    `Account: ${userEmail}`,
    `Role: ${roleLabel}`,
    `IP Address: ${ipAddress || "—"}`,
    `User-Agent: ${userAgent || "—"}`,
    `Time: ${attemptTime}`,
    "",
    "Please review this in the Security page if needed.",
    "",
    `Security page: ${appUrl}/admin/security`,
    "",
    brandName,
  ].join("\n");

  const html = buildNotificationEmailBody({
    greeting: `Hello ${adminName}`,
    intro:
      "A staff or admin account was used on the Forgot Password page. Password reset is not allowed for this account type. This action has been logged.",
    fields: {
      fields: [
        { label: "Account", value: userEmail || "—", fontWeight: "700" },
        { label: "Role", value: roleLabel },
        { label: "IP address", value: ipAddress || "—" },
        { label: "User-agent", value: userAgent || "—" },
        { label: "Time", value: attemptTime },
      ],
      bgColor: EMAIL_COLORS.bgError,
      borderColor: EMAIL_COLORS.borderError,
      accentColor: EMAIL_COLORS.antError,
    },
    appUrl,
  });

  try {
    const fromAddress =
      from || process.env.DEFAULT_FROM_EMAIL || "noreply@example.com";
    await sendEmailViaAPI({ to, from: fromAddress, subject, text, html });
  } catch (err) {
    console.log("--------------------------------------------------");
    console.log("⚠️  EMAIL API FAILED (Staff/Admin Forgot Password Alert) ⚠️");
    console.log("To:", to, "Error:", err.message);
    console.log("--------------------------------------------------");
  }
}

/**
 * Send generic admin alert (suspicious activity, recovery/deletion from unusual IP, etc.)
 * @param {object} options - { to, adminName, type, data }
 */
async function sendAdminAlert({ to, adminName, type, data = {} }) {
  // Use dedicated template for staff/admin forgot-password attempt
  if (type === "staff_or_admin_forgot_password_attempted") {
    return sendStaffOrAdminForgotPasswordAlertEmail({
      to,
      adminName,
      userId: data.userId,
      userEmail: data.userEmail,
      roleSlug: data.roleSlug,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });
  }

  const brandName = "BizClear";
  const appUrl =
    process.env.FRONTEND_URL || process.env.APP_URL || "http://localhost:5173";
  const subject = `Security Alert: ${type} - ${brandName}`;
  const dataStr =
    typeof data === "object" ? JSON.stringify(data, null, 2) : String(data);
  const text = [
    `Hello ${adminName},`,
    "",
    `Security alert (${type}):`,
    "",
    dataStr,
    "",
    `Dashboard: ${appUrl}/admin`,
    "",
    brandName,
  ].join("\n");
  const html = buildNotificationEmailBody({
    greeting: `Hello ${adminName}`,
    intro: `Security alert (${type}). Please review the details below.`,
    appUrl,
  });
  try {
    const from = process.env.DEFAULT_FROM_EMAIL || "noreply@example.com";
    await sendEmailViaAPI({ to, from, subject, text, html });
  } catch (err) {
    console.log("--------------------------------------------------");
    console.log("⚠️  EMAIL API FAILED (Admin Alert) ⚠️");
    console.log("To:", to, "Error:", err.message);
    console.log("--------------------------------------------------");
  }
}

/**
 * Send approval notification
 * @param {object} options - Notification options
 * @param {string} options.to - Admin email
 * @param {string} options.adminName - Admin name
 * @param {string} options.approvalId - Approval ID
 * @param {string} options.status - 'approved' or 'rejected'
 * @param {string} options.requestType - Type of request
 * @param {string} options.comment - Approver comment
 * @param {string} options.approverName - Name of approver
 * @param {Date} options.timestamp - When approval occurred
 */
async function sendApprovalNotification({
  to,
  adminName,
  approvalId,
  status,
  requestType,
  comment,
  approverName,
  timestamp,
  subject,
  from = process.env.DEFAULT_FROM_EMAIL || process.env.EMAIL_HOST_USER,
}) {
  const brandName = "BizClear";
  const appUrl =
    process.env.FRONTEND_URL || process.env.APP_URL || "http://localhost:5173";

  const statusText = status === "approved" ? "Approved" : "Rejected";
  subject = subject || `Approval Request ${statusText} - ${brandName}`;

  const approvalTime = timestamp
    ? new Date(timestamp).toLocaleString()
    : new Date().toLocaleString();

  const text = [
    `Hello ${adminName},`,
    "",
    `Your approval request has been ${statusText.toLowerCase()}.`,
    "",
    `Approval ID: ${approvalId}`,
    `Request Type: ${requestType}`,
    `Status: ${statusText}`,
    `Approved by: ${approverName}`,
    `Time: ${approvalTime}`,
    comment ? `Comment: ${comment}` : "",
    "",
    status === "approved"
      ? "Your requested changes have been applied."
      : "Your requested changes have been rejected.",
    "",
    `View details: ${appUrl}/admin/approvals/${approvalId}`,
    "",
    brandName,
  ]
    .filter(Boolean)
    .join("\n");

  const html = buildNotificationEmailBody({
    greeting: `Hello ${adminName}`,
    intro: `Your approval request has been <strong>${statusText.toLowerCase()}</strong>${status === "approved" ? " and your requested changes have been applied." : "."}`,
    fields: {
      fields: [
        { label: "Approval ID", value: approvalId },
        { label: "Request type", value: requestType },
        {
          label: "Status",
          value: statusText,
          color:
            status === "approved"
              ? EMAIL_COLORS.success
              : EMAIL_COLORS.antError,
          fontSize: "14px",
          fontWeight: "700",
        },
        { label: "Approved by", value: approverName },
        ...(comment ? [{ label: "Comment", value: comment }] : []),
        { label: "Time", value: approvalTime },
      ],
    },
    appUrl,
  });

  try {
    const fromAddress =
      from || process.env.DEFAULT_FROM_EMAIL || "noreply@example.com";
    await sendEmailViaAPI({ to, from: fromAddress, subject, text, html });
  } catch (err) {
    console.log("--------------------------------------------------");
    console.log("⚠️  EMAIL API FAILED (Approval Notification) ⚠️");
    console.log("To:", to);
    console.log("Error:", err.message);
    console.log("--------------------------------------------------");
  }
}

/**
 * Send application submitted email notification
 * @param {object} options - Notification options
 * @param {string} options.to - Recipient email
 * @param {string} options.firstName - User's first name
 * @param {string} options.lastName - User's last name
 * @param {string} options.businessName - Business name
 * @param {string} options.applicationId - Application ID
 * @param {string} options.applicationReferenceNumber - Application reference number
 * @param {string} options.subject - Email subject (optional)
 * @param {string} options.from - From email address (optional)
 */
async function sendApplicationSubmittedEmail({
  to,
  firstName,
  lastName,
  businessName,
  applicationId,
  applicationReferenceNumber,
  subject,
  from = process.env.DEFAULT_FROM_EMAIL || process.env.EMAIL_HOST_USER,
}) {
  const brandName = "BizClear";
  const appUrl =
    process.env.FRONTEND_URL || process.env.APP_URL || "http://localhost:5173";
  const supportEmail =
    process.env.SUPPORT_EMAIL ||
    process.env.EMAIL_HOST_USER ||
    "support@bizclear.com";

  subject = subject || `Application Submitted - ${brandName}`;

  const text = [
    `Hello ${firstName},`,
    "",
    `Your application for ${businessName} has been successfully submitted.`,
    "",
    `Application Reference: ${applicationReferenceNumber || applicationId}`,
    "",
    "Your application is now under review. You will be notified once a decision has been made.",
    "",
    `You can check your application status at: ${appUrl}/business-owner/applications`,
    "",
    `Support: ${supportEmail}`,
    "",
    "Thank you,",
    brandName,
  ].join("\n");

  const html = buildNotificationEmailBody({
    greeting: `Hello ${firstName}`,
    intro: `Your application for <strong>${businessName}</strong> has been successfully submitted. Your application is now under review and you will be notified once a decision has been made.`,
    details: [
      {
        label: "Application Reference",
        value: applicationReferenceNumber || applicationId,
      },
    ],
    actionUrl: `${appUrl}/business-owner/applications`,
    actionText: "View Application Status",
    appUrl,
  });

  try {
    const fromAddress =
      from || process.env.DEFAULT_FROM_EMAIL || "noreply@example.com";
    await sendEmailViaAPI({ to, from: fromAddress, subject, text, html });
  } catch (err) {
    console.log("--------------------------------------------------");
    console.log("⚠️  EMAIL API FAILED (Application Submitted) ⚠️");
    console.log("To:", to);
    console.log("Error:", err.message);
    console.log("--------------------------------------------------");
  }
}

/**
 * Send application resubmitted email notification
 * @param {object} options - Notification options
 * @param {string} options.to - Recipient email
 * @param {string} options.firstName - User's first name
 * @param {string} options.lastName - User's last name
 * @param {string} options.businessName - Business name
 * @param {string} options.applicationId - Application ID
 * @param {string} options.applicationReferenceNumber - Application reference number
 * @param {string} options.subject - Email subject (optional)
 * @param {string} options.from - From email address (optional)
 */
async function sendApplicationResubmittedEmail({
  to,
  firstName,
  lastName,
  businessName,
  applicationId,
  applicationReferenceNumber,
  subject,
  from = process.env.DEFAULT_FROM_EMAIL || process.env.EMAIL_HOST_USER,
}) {
  const brandName = "BizClear";
  const appUrl =
    process.env.FRONTEND_URL || process.env.APP_URL || "http://localhost:5173";
  const supportEmail =
    process.env.SUPPORT_EMAIL ||
    process.env.EMAIL_HOST_USER ||
    "support@bizclear.com";

  subject = subject || `Application Resubmitted - ${brandName}`;

  const text = [
    `Hello ${firstName},`,
    "",
    `Your updated application for ${businessName} has been successfully resubmitted.`,
    "",
    `Application Reference: ${applicationReferenceNumber || applicationId}`,
    "",
    "Your application is now back under review. You will be notified once a decision has been made.",
    "",
    `You can check your application status at: ${appUrl}/business-owner/applications`,
    "",
    `Support: ${supportEmail}`,
    "",
    "Thank you,",
    brandName,
  ].join("\n");

  const html = buildNotificationEmailBody({
    greeting: `Hello ${firstName}`,
    intro: `Your updated application for <strong>${businessName}</strong> has been successfully resubmitted. Your application is now back under review and you will be notified once a decision has been made.`,
    details: [
      {
        label: "Application Reference",
        value: applicationReferenceNumber || applicationId,
      },
    ],
    actionUrl: `${appUrl}/business-owner/applications`,
    actionText: "View Application Status",
    appUrl,
  });

  try {
    const fromAddress =
      from || process.env.DEFAULT_FROM_EMAIL || "noreply@example.com";
    await sendEmailViaAPI({ to, from: fromAddress, subject, text, html });
  } catch (err) {
    console.log("--------------------------------------------------");
    console.log("⚠️  EMAIL API FAILED (Application Resubmitted) ⚠️");
    console.log("To:", to);
    console.log("Error:", err.message);
    console.log("--------------------------------------------------");
  }
}

/**
 * Send application approved email notification
 * @param {object} options - Notification options
 * @param {string} options.to - Recipient email
 * @param {string} options.firstName - User's first name
 * @param {string} options.lastName - User's last name
 * @param {string} options.businessName - Business name
 * @param {string} options.applicationId - Application ID
 * @param {string} options.applicationReferenceNumber - Application reference number
 * @param {string} options.subject - Email subject (optional)
 * @param {string} options.from - From email address (optional)
 */
async function sendApplicationApprovedEmail({
  to,
  firstName,
  lastName,
  businessName,
  applicationId,
  applicationReferenceNumber,
  subject,
  from = process.env.DEFAULT_FROM_EMAIL || process.env.EMAIL_HOST_USER,
}) {
  const brandName = "BizClear";
  const appUrl =
    process.env.FRONTEND_URL || process.env.APP_URL || "http://localhost:5173";
  const supportEmail =
    process.env.SUPPORT_EMAIL ||
    process.env.EMAIL_HOST_USER ||
    "support@bizclear.com";

  subject = subject || `Application Approved - ${brandName}`;

  const text = [
    `Hello ${firstName},`,
    "",
    `Congratulations! Your permit application for ${businessName} has been successfully approved. Your business is now officially registered in the system. Please log in to your BizClear account to view your business details, download your permit, and proceed with any additional requirements.`,
    "",
    `Application Reference: ${applicationReferenceNumber || applicationId}`,
    "",
    `You can view your business details at: ${appUrl}/business-owner/business`,
    "",
    `Support: ${supportEmail}`,
    "",
    "Thank you,",
    brandName,
  ].join("\n");

  const html = buildNotificationEmailBody({
    greeting: `Hello ${firstName}`,
    intro: `Congratulations! Your permit application for <strong>${businessName}</strong> has been successfully approved. Your business is now officially registered in the system. Please log in to your BizClear account to view your business details, download your permit, and proceed with any additional requirements.`,
    details: [
      {
        label: "Application Reference",
        value: applicationReferenceNumber || applicationId,
      },
    ],
    actionUrl: `${appUrl}/business-owner/business`,
    actionText: "View Business Details",
    appUrl,
  });

  try {
    const fromAddress =
      from || process.env.DEFAULT_FROM_EMAIL || "noreply@example.com";
    await sendEmailViaAPI({ to, from: fromAddress, subject, text, html });
  } catch (err) {
    console.log("--------------------------------------------------");
    console.log("⚠️  EMAIL API FAILED (Application Approved) ⚠️");
    console.log("To:", to);
    console.log("Error:", err.message);
    console.log("--------------------------------------------------");
  }
}

/**
 * Send application rejected email notification
 * @param {object} options - Notification options
 * @param {string} options.to - Recipient email
 * @param {string} options.firstName - User's first name
 * @param {string} options.lastName - User's last name
 * @param {string} options.businessName - Business name
 * @param {string} options.applicationId - Application ID
 * @param {string} options.applicationReferenceNumber - Application reference number
 * @param {string} options.rejectionReason - Reason for rejection
 * @param {string} options.subject - Email subject (optional)
 * @param {string} options.from - From email address (optional)
 */
async function sendApplicationRejectedEmail({
  to,
  firstName,
  lastName,
  businessName,
  applicationId,
  applicationReferenceNumber,
  rejectionReason,
  subject,
  from = process.env.DEFAULT_FROM_EMAIL || process.env.EMAIL_HOST_USER,
}) {
  const brandName = "BizClear";
  const appUrl =
    process.env.FRONTEND_URL || process.env.APP_URL || "http://localhost:5173";
  const supportEmail =
    process.env.SUPPORT_EMAIL ||
    process.env.EMAIL_HOST_USER ||
    "support@bizclear.com";

  subject = subject || `Application Update - ${brandName}`;

  const text = [
    `Hello ${firstName},`,
    "",
    `After careful review, we regret to inform you that your permit application for ${businessName} has been declined. This decision was made based on the information provided and applicable requirements. Please log in to your BizClear account to review the specific reason for this decision and explore your options, including submitting an appeal if you believe this was made in error.`,
    "",
    `Application Reference: ${applicationReferenceNumber || applicationId}`,
    "",
    rejectionReason ? `Reason: ${rejectionReason}` : "",
    "",
    `You can view your application at: ${appUrl}/business-owner/applications`,
    "",
    `Support: ${supportEmail}`,
    "",
    "Thank you,",
    brandName,
  ].join("\n");

  const html = buildNotificationEmailBody({
    greeting: `Hello ${firstName}`,
    intro: `After careful review, we regret to inform you that your permit application for <strong>${businessName}</strong> has been declined. This decision was made based on the information provided and applicable requirements. Please log in to your BizClear account to review the specific reason for this decision and explore your options, including submitting an appeal if you believe this was made in error.`,
    details: [
      {
        label: "Application Reference",
        value: applicationReferenceNumber || applicationId,
      },
      ...(rejectionReason ? [{ label: "Reason", value: rejectionReason }] : []),
    ],
    actionUrl: `${appUrl}/business-owner/applications`,
    actionText: "View Application",
    appUrl,
  });

  try {
    const fromAddress =
      from || process.env.DEFAULT_FROM_EMAIL || "noreply@example.com";
    await sendEmailViaAPI({ to, from: fromAddress, subject, text, html });
  } catch (err) {
    console.log("--------------------------------------------------");
    console.log("⚠️  EMAIL API FAILED (Application Rejected) ⚠️");
    console.log("To:", to);
    console.log("Error:", err.message);
    console.log("--------------------------------------------------");
  }
}

/**
 * Send application returned email notification
 * @param {object} options - Notification options
 * @param {string} options.to - Recipient email
 * @param {string} options.firstName - User's first name
 * @param {string} options.lastName - User's last name
 * @param {string} options.businessName - Business name
 * @param {string} options.applicationId - Application ID
 * @param {string} options.applicationReferenceNumber - Application reference number
 * @param {string} options.reviewComments - Review comments
 * @param {string} options.subject - Email subject (optional)
 * @param {string} options.from - From email address (optional)
 */
async function sendApplicationReturnedEmail({
  to,
  firstName,
  lastName,
  businessName,
  applicationId,
  applicationReferenceNumber,
  reviewComments,
  subject,
  from = process.env.DEFAULT_FROM_EMAIL || process.env.EMAIL_HOST_USER,
}) {
  const brandName = "BizClear";
  const appUrl =
    process.env.FRONTEND_URL || process.env.APP_URL || "http://localhost:5173";
  const supportEmail =
    process.env.SUPPORT_EMAIL ||
    process.env.EMAIL_HOST_USER ||
    "support@bizclear.com";

  subject = subject || `Application Returned for Revision - ${brandName}`;

  const text = [
    `Hello ${firstName},`,
    "",
    `Your permit application for ${businessName} has been returned for revision. Our review team has identified areas that require attention before approval can be granted. Please log in to your BizClear account to review the specific comments and make the necessary corrections to your application.`,
    "",
    `Application Reference: ${applicationReferenceNumber || applicationId}`,
    "",
    reviewComments ? `Comments: ${reviewComments}` : "",
    "",
    `You can update your application at: ${appUrl}/business-owner/applications`,
    "",
    `Support: ${supportEmail}`,
    "",
    "Thank you,",
    brandName,
  ].join("\n");

  const html = buildNotificationEmailBody({
    greeting: `Hello ${firstName}`,
    intro: `Your permit application for <strong>${businessName}</strong> has been returned for revision. Our review team has identified areas that require attention before approval can be granted. Please log in to your BizClear account to review the specific comments and make the necessary corrections to your application.`,
    details: [
      {
        label: "Application Reference",
        value: applicationReferenceNumber || applicationId,
      },
      ...(reviewComments ? [{ label: "Comments", value: reviewComments }] : []),
    ],
    actionUrl: `${appUrl}/business-owner/applications`,
    actionText: "Update Application",
    appUrl,
  });

  try {
    const fromAddress =
      from || process.env.DEFAULT_FROM_EMAIL || "noreply@example.com";
    await sendEmailViaAPI({ to, from: fromAddress, subject, text, html });
  } catch (err) {
    console.log("--------------------------------------------------");
    console.log("⚠️  EMAIL API FAILED (Application Returned) ⚠️");
    console.log("To:", to);
    console.log("Error:", err.message);
    console.log("--------------------------------------------------");
  }
}

/**
 * Send appeal denied email notification
 * @param {object} options - Notification options
 * @param {string} options.to - Recipient email
 * @param {string} options.firstName - User's first name
 * @param {string} options.lastName - User's last name
 * @param {string} options.businessName - Business name
 * @param {string} options.appealId - Appeal ID
 * @param {string} options.resolution - Appeal resolution/reason
 * @param {string} options.subject - Email subject (optional)
 * @param {string} options.from - From email address (optional)
 */
async function sendAppealDeniedEmail({
  to,
  firstName,
  lastName,
  businessName,
  appealId,
  resolution,
  subject,
  from = process.env.DEFAULT_FROM_EMAIL || process.env.EMAIL_HOST_USER,
}) {
  const brandName = "BizClear";
  const appUrl =
    process.env.FRONTEND_URL || process.env.APP_URL || "http://localhost:5173";
  const supportEmail =
    process.env.SUPPORT_EMAIL ||
    process.env.EMAIL_HOST_USER ||
    "support@bizclear.com";

  subject = subject || `Appeal Denied - ${brandName}`;

  const text = [
    `Hello ${firstName},`,
    "",
    `After thorough review, we regret to inform you that your appeal for ${businessName} has been denied. This decision is final based on the information provided and applicable regulations. Please log in to your BizClear account to review the specific resolution details and explore any available options for your application.`,
    "",
    `Appeal ID: ${appealId}`,
    "",
    resolution ? `Resolution: ${resolution}` : "",
    "",
    `Support: ${supportEmail}`,
    "",
    "Thank you,",
    brandName,
  ].join("\n");

  const html = buildNotificationEmailBody({
    greeting: `Hello ${firstName}`,
    intro: `After thorough review, we regret to inform you that your appeal for <strong>${businessName}</strong> has been denied. This decision is final based on the information provided and applicable regulations. Please log in to your BizClear account to review the specific resolution details and explore any available options for your application.`,
    details: [
      { label: "Appeal ID", value: appealId },
      ...(resolution ? [{ label: "Resolution", value: resolution }] : []),
    ],
    appUrl,
  });

  try {
    const fromAddress =
      from || process.env.DEFAULT_FROM_EMAIL || "noreply@example.com";
    await sendEmailViaAPI({ to, from: fromAddress, subject, text, html });
  } catch (err) {
    console.log("--------------------------------------------------");
    console.log("⚠️  EMAIL API FAILED (Appeal Denied) ⚠️");
    console.log("To:", to);
    console.log("Error:", err.message);
    console.log("--------------------------------------------------");
  }
}

/**
 * Send appeal submitted email notification
 * @param {object} options - Notification options
 * @param {string} options.to - Recipient email
 * @param {string} options.firstName - User's first name
 * @param {string} options.lastName - User's last name
 * @param {string} options.businessName - Business name
 * @param {string} options.appealId - Appeal ID
 * @param {string} options.subject - Email subject (optional)
 * @param {string} options.from - From email address (optional)
 */
async function sendAppealSubmittedEmail({
  to,
  firstName,
  lastName,
  businessName,
  appealId,
  subject,
  from = process.env.DEFAULT_FROM_EMAIL || process.env.EMAIL_HOST_USER,
}) {
  const brandName = "BizClear";
  const appUrl =
    process.env.FRONTEND_URL || process.env.APP_URL || "http://localhost:5173";
  const supportEmail =
    process.env.SUPPORT_EMAIL ||
    process.env.EMAIL_HOST_USER ||
    "support@bizclear.com";

  subject = subject || `Appeal Submitted - ${brandName}`;

  const text = [
    `Hello ${firstName},`,
    "",
    `Your appeal for ${businessName} has been successfully submitted and is now under review. Our team will carefully evaluate your appeal and you will be notified once a decision has been made. Please log in to your BizClear account to monitor the status of your appeal.`,
    "",
    `Appeal ID: ${appealId}`,
    "",
    `You can check your appeal status at: ${appUrl}/business-owner/applications`,
    "",
    `Support: ${supportEmail}`,
    "",
    "Thank you,",
    brandName,
  ].join("\n");

  const html = buildNotificationEmailBody({
    greeting: `Hello ${firstName}`,
    intro: `Your appeal for <strong>${businessName}</strong> has been successfully submitted and is now under review. Our team will carefully evaluate your appeal and you will be notified once a decision has been made. Please log in to your BizClear account to monitor the status of your appeal.`,
    details: [{ label: "Appeal ID", value: appealId }],
    actionUrl: `${appUrl}/business-owner/applications`,
    actionText: "View Appeal Status",
    appUrl,
  });

  try {
    const fromAddress =
      from || process.env.DEFAULT_FROM_EMAIL || "noreply@example.com";
    await sendEmailViaAPI({ to, from: fromAddress, subject, text, html });
  } catch (err) {
    console.log("--------------------------------------------------");
    console.log("⚠️  EMAIL API FAILED (Appeal Submitted) ⚠️");
    console.log("To:", to);
    console.log("Error:", err.message);
    console.log("--------------------------------------------------");
  }
}

/**
 * Send appeal approved email notification
 * @param {object} options - Notification options
 * @param {string} options.to - Recipient email
 * @param {string} options.firstName - User's first name
 * @param {string} options.lastName - User's last name
 * @param {string} options.businessName - Business name
 * @param {string} options.appealId - Appeal ID
 * @param {string} options.subject - Email subject (optional)
 * @param {string} options.from - From email address (optional)
 */
async function sendAppealApprovedEmail({
  to,
  firstName,
  lastName,
  businessName,
  appealId,
  subject,
  from = process.env.DEFAULT_FROM_EMAIL || process.env.EMAIL_HOST_USER,
}) {
  const brandName = "BizClear";
  const appUrl =
    process.env.FRONTEND_URL || process.env.APP_URL || "http://localhost:5173";
  const supportEmail =
    process.env.SUPPORT_EMAIL ||
    process.env.EMAIL_HOST_USER ||
    "support@bizclear.com";

  subject = subject || `Appeal Granted - ${brandName}`;

  const text = [
    `Hello ${firstName},`,
    "",
    `Good news! Your appeal for ${businessName} has been granted. Your application has been returned for review and an LGU officer will re-evaluate your application. Please log in to your BizClear account to monitor the status of your application and respond to any additional requirements.`,
    "",
    `Appeal ID: ${appealId}`,
    "",
    `You can check your application status at: ${appUrl}/business-owner/applications`,
    "",
    `Support: ${supportEmail}`,
    "",
    "Thank you,",
    brandName,
  ].join("\n");

  const html = buildNotificationEmailBody({
    greeting: `Hello ${firstName}`,
    intro: `Good news! Your appeal for <strong>${businessName}</strong> has been granted. Your application has been returned for review and an LGU officer will re-evaluate your application. Please log in to your BizClear account to monitor the status of your application and respond to any additional requirements.`,
    details: [{ label: "Appeal ID", value: appealId }],
    actionUrl: `${appUrl}/business-owner/applications`,
    actionText: "View Application Status",
    appUrl,
  });

  try {
    const fromAddress =
      from || process.env.DEFAULT_FROM_EMAIL || "noreply@example.com";
    await sendEmailViaAPI({ to, from: fromAddress, subject, text, html });
  } catch (err) {
    console.log("--------------------------------------------------");
    console.log("⚠️  EMAIL API FAILED (Appeal Approved) ⚠️");
    console.log("To:", to);
    console.log("Error:", err.message);
    console.log("--------------------------------------------------");
  }
}

module.exports = {
  sendOtp,
  sendForgotPasswordNotAvailableEmail,
  sendStaffCredentialsEmail,
  sendBusinessOwnerCredentialsEmail,
  sendEmailChangeNotification,
  sendPasswordChangeNotification,
  sendMfaEnabledNotification,
  sendMfaDisableRequestedNotification,
  sendMfaDisabledNotification,
  sendPasskeyAddedNotification,
  sendPasskeyRemovedNotification,
  sendAdminAlertEmail,
  sendAdminAlert,
  sendApprovalNotification,
  sendApplicationSubmittedEmail,
  sendApplicationResubmittedEmail,
  sendApplicationApprovedEmail,
  sendApplicationRejectedEmail,
  sendApplicationReturnedEmail,
  sendAppealSubmittedEmail,
  sendAppealDeniedEmail,
  sendAppealApprovedEmail,
};
