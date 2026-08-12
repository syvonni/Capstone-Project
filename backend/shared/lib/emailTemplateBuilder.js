/**
 * Shared Email Template Builder
 * Generates polished HTML emails matching the Storybook EmailTemplate design.
 * Used by auth-service mailer and business-service helpRequestMailer.
 */

const EMAIL_COLORS = {
  primary: "#0039AF",
  error: "#CE1126",
  warning: "#FED141",
  success: "#52c41a",
  textPrimary: "#1f1f1f",
  textSecondary: "rgba(0,0,0,0.88)",
  textTertiary: "rgba(0,0,0,0.65)",
  textQuaternary: "rgba(0,0,0,0.45)",
  border: "#e8e8e8",
  borderLight: "#f0f0f0",
  bgWhite: "#ffffff",
  bgWarning: "#fff7e6",
  borderWarning: "#ffd591",
  bgError: "#fff1f0",
  borderError: "#ffccc7",
  bgSuccess: "#f6ffed",
  borderSuccess: "#b7eb8f",
  antError: "#ff4d4f",
  antWarning: "#faad14",
  warningDark: "#d48806",
  logoYellow: "#FFCF00",
  logoRed: "#E10017",
};

function getEnvDefaults() {
  return {
    brandName: process.env.APP_BRAND_NAME || "BizClear",
    appUrl:
      process.env.FRONTEND_URL ||
      process.env.APP_URL ||
      "http://localhost:5173",
    supportEmail:
      process.env.SUPPORT_EMAIL ||
      process.env.EMAIL_HOST_USER ||
      "support@bizclear.com",
  };
}

function buildHeader(appUrl) {
  const url = appUrl || getEnvDefaults().appUrl;
  let logoUrl =
    process.env.EMAIL_LOGO_URL ||
    process.env.EMAIL_LOGO_RAW_URL;

  if (!logoUrl) {
    let localLogoUrl;
    try {
      localLogoUrl = new URL("/BizClear.png", url).href;
    } catch {
      localLogoUrl = "";
    }

    // For dev (localhost), fall back to the public raw GitHub URL so Resend/
    // email clients can fetch the asset. In production, the FRONTEND_URL logo
    // is preferred because it doesn't depend on the repo being public.
    const isLocalhost =
      localLogoUrl.includes("://localhost") ||
      localLogoUrl.includes("://127.0.0.1");
    logoUrl = isLocalhost
      ? "https://raw.githubusercontent.com/EnrWayneDev/Capstone/main/web/public/BizClear.png"
      : localLogoUrl;
  }

  return `<div style="background:${EMAIL_COLORS.bgWhite};padding:24px 32px;border-bottom:1px solid ${EMAIL_COLORS.border};display:flex;align-items:center;gap:32px;">
  <img src="${logoUrl}" alt="BizClear Logo" width="40" height="40" style="display:block;border:none;flex-shrink:0;">
  <h1 style="margin:0;color:${EMAIL_COLORS.textPrimary};font-size:24px;font-weight:600;letter-spacing:0.5px;font-family:'Urbanist', 'Raleway', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;line-height:40px;">BizClear</h1>
</div>`;
}

function buildFooter(appUrl) {
  const url = appUrl || getEnvDefaults().appUrl;
  return `<div style="background:${EMAIL_COLORS.bgWhite};padding:24px 32px;border-top:1px solid ${EMAIL_COLORS.borderLight};text-align:left;">
  <div style="margin-bottom:16px;">
    <a href="${url}/terms" style="color:${EMAIL_COLORS.textTertiary};font-size:13px;text-decoration:none;display:inline-block;margin-right:24px;margin-bottom:8px;">Terms of Service</a>
    <a href="${url}/privacy" style="color:${EMAIL_COLORS.textTertiary};font-size:13px;text-decoration:none;display:inline-block;margin-right:24px;margin-bottom:8px;">Privacy Policy</a>
    <a href="${url}/manual" style="color:${EMAIL_COLORS.textTertiary};font-size:13px;text-decoration:none;display:inline-block;margin-right:24px;margin-bottom:8px;">BizClear Manual</a>
    <a href="https://alaminoscity.gov.ph/public-service/city-services/City%20Government%20of%20Alaminos,%20Pangasinan%20Citizen's%20Charter.pdf" target="_blank" rel="noopener noreferrer" style="color:${EMAIL_COLORS.textTertiary};font-size:13px;text-decoration:none;display:inline-block;margin-right:24px;margin-bottom:8px;">Alaminos Citizen's Charter</a>
    <a href="https://www.alaminoscity.gov.ph/index.html" target="_blank" rel="noopener noreferrer" style="color:${EMAIL_COLORS.textTertiary};font-size:13px;text-decoration:none;display:inline-block;margin-bottom:8px;">Official City Website</a>
  </div>
  <p style="margin:0;color:${EMAIL_COLORS.textQuaternary};font-size:12px;">
    &copy; ${new Date().getFullYear()} BizClear. All Rights Reserved.
  </p>
</div>`;
}

function buildOtpBox(code) {
  return `<div style="background:${EMAIL_COLORS.bgWhite};padding:16px;border-radius:8px;border:1px dashed ${EMAIL_COLORS.primary};margin-bottom:24px;display:inline-block;">
  <div style="font-size:18px;letter-spacing:4px;color:${EMAIL_COLORS.primary};font-weight:600;font-family:monospace;">${code}</div>
</div>`;
}

function buildWarningBox({ title, message, bgColor, borderColor, titleColor }) {
  const bg = bgColor || EMAIL_COLORS.bgWarning;
  const border = borderColor || EMAIL_COLORS.borderWarning;
  const tColor = titleColor || EMAIL_COLORS.warningDark;
  return `<div style="background:${bg};border:1px solid ${border};padding:16px;border-radius:6px;margin-top:24px;text-align:left;">
  <p style="margin:0 0 4px;color:${tColor};font-weight:600;font-size:13px;">${title}</p>
  <p style="margin:0;color:${EMAIL_COLORS.textSecondary};font-size:13px;line-height:1.5;">${message}</p>
</div>`;
}

/**
 * Build an info field box with label/value pairs.
 * @param {object} options
 * @param {Array<{label:string, value:string, color?:string, fontSize?:string, fontWeight?:string}>} options.fields
 * @param {string} [options.bgColor] - Background color (contextual). Omit for default white + left-border.
 * @param {string} [options.borderColor] - Border color (contextual).
 * @param {string} [options.accentColor] - Left-border accent override.
 */
function buildInfoBox({ fields, bgColor, borderColor, accentColor }) {
  const isContextual = !!bgColor;
  const bg = bgColor || EMAIL_COLORS.bgWhite;
  const accent =
    accentColor ||
    (isContextual ? borderColor || EMAIL_COLORS.border : EMAIL_COLORS.primary);
  const borderStyle = isContextual
    ? `border:1px solid ${borderColor || EMAIL_COLORS.border};border-left:3px solid ${accent};`
    : `border-left:3px solid ${accent};`;
  const fieldHtml = fields
    .map((f) => {
      const labelHtml = f.label
        ? `<span style="color:${EMAIL_COLORS.textTertiary};font-size:12px;font-weight:600;">${f.label}</span><br>`
        : "";
      return `<div style="margin-bottom:12px;">
    ${labelHtml}<span style="color:${f.color || EMAIL_COLORS.textPrimary};font-size:${f.fontSize || "14px"};${f.fontWeight ? `font-weight:${f.fontWeight};` : ""}">${f.value}</span>
  </div>`;
    })
    .join("");
  return `<div style="background:${bg};padding:16px 16px 4px 20px;border-radius:6px;${borderStyle}margin-bottom:24px;">
  ${fieldHtml}
</div>`;
}

function buildStatusBox({
  label1,
  value1,
  label2,
  value2,
  extraLabel,
  extraValue,
  statusBg,
  statusBorder,
}) {
  const border = statusBorder || EMAIL_COLORS.border;
  let extra = "";
  if (extraLabel && extraValue) {
    extra = `<p style="margin:12px 0 4px;color:${EMAIL_COLORS.textTertiary};font-size:12px;font-weight:600;">${extraLabel}</p>
    <p style="margin:0;color:${EMAIL_COLORS.textSecondary};font-size:14px;">${extraValue}</p>`;
  }
  return `<div style="background:${statusBg || EMAIL_COLORS.bgWhite};border:1px solid ${border};border-left:3px solid ${border};border-radius:6px;padding:16px;margin:24px 0;">
  <p style="margin:0 0 4px;color:${EMAIL_COLORS.textTertiary};font-size:12px;font-weight:600;">${label1}</p>
  <p style="margin:0 0 12px;color:${EMAIL_COLORS.textPrimary};font-size:14px;font-weight:700;">${value1}</p>
  <p style="margin:0 0 4px;color:${EMAIL_COLORS.textTertiary};font-size:12px;font-weight:600;">${label2}</p>
  <p style="margin:0;color:${EMAIL_COLORS.textPrimary};font-size:14px;">${value2}</p>
  ${extra}
</div>`;
}

function buildButton({ text, href, bgColor, textColor }) {
  const bg = bgColor || EMAIL_COLORS.primary;
  const color = textColor || "#ffffff";
  return `<a href="${href}" style="display:inline-block;background:${bg};color:${color};text-decoration:none;padding:8px 20px;border-radius:6px;font-weight:600;font-size:14px;border:1px solid transparent;cursor:pointer;">${text}</a>`;
}

/**
 * Wrap body content in the full email HTML shell (header + body + footer).
 * @param {object} options
 * @param {string} options.bodyContent - Inner HTML for the email body.
 * @param {string} [options.appUrl] - Frontend URL for footer links.
 */
function buildEmailHtml({ bodyContent, appUrl }) {
  const url = appUrl || getEnvDefaults().appUrl;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="https://fonts.googleapis.com/css2?family=Urbanist:wght@400;500;600;700&family=Raleway:wght@400;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;font-family:'Urbanist', 'Raleway', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;">
  <div style="max-width:100%;margin:0 auto;background:${EMAIL_COLORS.bgWhite};box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden;">
    ${buildHeader(url)}
    ${bodyContent}
    ${buildFooter(url)}
  </div>
</body>
</html>`;
}

/**
 * Build OTP email body (for all OTP purposes: login, signup, password_reset, etc.)
 */
function buildOtpEmailBody({ greeting = "Hello", intro, code, appUrl }) {
  const url = appUrl || getEnvDefaults().appUrl;
  const bodyContent = `<div style="padding:40px 32px;text-align:left;">
  <p style="margin:0 0 24px;color:${EMAIL_COLORS.textPrimary};font-size:14px;">${greeting},</p>
  <p style="margin:0 0 24px;color:rgba(0,0,0,0.88);font-size:14px;line-height:1.5715;">${intro}</p>
  ${buildOtpBox(code)}
  <p style="margin:0 0 24px;color:rgba(0,0,0,0.88);font-size:14px;">
    Regards, BizClear Team
  </p>
</div>`;
  return buildEmailHtml({ bodyContent, appUrl: url });
}

/**
 * Build a generic notification email body with optional greeting, intro, and info box.
 */
function buildNotificationEmailBody({
  greeting = "Hello",
  intro,
  fields,
  appUrl,
}) {
  const url = appUrl || getEnvDefaults().appUrl;
  let content = `<div style="padding:40px 32px;text-align:left;">
  <p style="margin:0 0 24px;color:${EMAIL_COLORS.textPrimary};font-size:14px;">${greeting},</p>
  <p style="margin:0 0 24px;color:rgba(0,0,0,0.88);font-size:14px;line-height:1.5715;">${intro}</p>`;
  if (fields) {
    content += "\n  " + buildInfoBox(fields);
  }
  content += `\n  <p style="margin:0 0 24px;color:rgba(0,0,0,0.88);font-size:14px;">
    Regards, BizClear Team
  </p>`;
  content += "\n</div>";
  return buildEmailHtml({ bodyContent: content, appUrl: url });
}

module.exports = {
  EMAIL_COLORS,
  getEnvDefaults,
  buildHeader,
  buildFooter,
  buildOtpBox,
  buildWarningBox,
  buildInfoBox,
  buildStatusBox,
  buildButton,
  buildEmailHtml,
  buildOtpEmailBody,
  buildNotificationEmailBody,
};
