
// Email color constants (matching theme BRAND_COLORS, logo, and Ant Design)
const EMAIL_COLORS = {
  primary: '#0039AF', // Logo blue color
  error: '#CE1126', // BRAND_COLORS.red
  warning: '#FED141', // BRAND_COLORS.yellow
  success: '#52c41a', // Ant Design success
  textPrimary: '#1f1f1f',
  textSecondary: 'rgba(0,0,0,0.88)',
  textTertiary: 'rgba(0,0,0,0.65)',
  textQuaternary: 'rgba(0,0,0,0.45)',
  border: '#e8e8e8',
  borderLight: '#f0f0f0',
  bgLight: '#f8f9fa',
  bgWhite: '#ffffff',
  bgWrapper: '#fafafa',
  bgWarning: '#fff7e6',
  borderWarning: '#ffd591',
  bgError: '#fff1f0',
  borderError: '#ffccc7',
  bgSuccess: '#f6ffed',
  borderSuccess: '#b7eb8f',
  antError: '#ff4d4f', // Ant Design error
  antWarning: '#faad14', // Ant Design warning
  warningDark: '#d48806', // Dark warning for text
  logoYellow: '#FFCF00', // Logo yellow circle
  logoRed: '#E10017', // Logo red circle
}

export default function EmailTemplate(props) {
  const {
  greeting = 'Hello',
  intro,
  code,
  username,
  tempPassword,
  office,
  role,
  firstName,
  oldEmail,
  newEmail,
  requestId,
  subjectLine,
  preview,
  appUrl = 'http://localhost:5173',
  alertType,
  details,
  severity,
  verificationStatus,
  message,
  detectedAt,
  field,
  userName,
  userEmail,
  attemptedValue,
  roleSlug,
  timestamp,
  daysRemaining,
  scheduledFor,
  clearanceId,
  status,
  applicationReferenceNumber,
  rejectionReason,
  businessName,
  } = props
  const isOtp = code !== undefined
  const isStaffCredentials = tempPassword !== undefined
  const _isPasswordChange = firstName !== undefined && !code && !tempPassword
  const isEmailChange = oldEmail !== undefined
  const isHelpRequest = requestId !== undefined
  const isSystemAlert = alertType !== undefined
  const isTamperIncident = severity !== undefined && verificationStatus !== undefined
  const isAdminAlert = field !== undefined && userName !== undefined
  const isPermitDecision = applicationReferenceNumber !== undefined && !requestId
  const isDeletionReminder = daysRemaining !== undefined && !requestId
  const isClearanceNotification = clearanceId !== undefined && !requestId

  // Consistent header template (matches landing page style)
  const headerHtml = `
    <div style="background:${EMAIL_COLORS.bgWhite};padding:24px 32px;border-bottom:1px solid ${EMAIL_COLORS.border};display:flex;align-items:center;gap:12px;">
      <svg width="32" height="32" viewBox="0 0 348 326" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="173.5" cy="68.5" r="68.5" fill="${EMAIL_COLORS.primary}"/>
        <circle cx="68.5" cy="257.5" r="68.5" fill="${EMAIL_COLORS.logoYellow}"/>
        <circle cx="279.5" cy="257.5" r="68.5" fill="${EMAIL_COLORS.logoRed}"/>
      </svg>
      <h1 style="margin:0;color:${EMAIL_COLORS.textPrimary};font-size:20px;font-weight:600;letter-spacing:0.5px;font-family:'Raleway', sans-serif;">BizClear</h1>
    </div>
  `

  // Consistent footer template (matches HomeFooter style)
  const footerHtml = `
    <div style="background:${EMAIL_COLORS.bgWhite};padding:24px 32px;border-top:1px solid ${EMAIL_COLORS.borderLight};">
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div class="footer-links" style="display:flex;flex-wrap:wrap;gap:24px;align-items:center;">
          <a href="${appUrl}/terms" style="color:${EMAIL_COLORS.textTertiary};font-size:13px;text-decoration:none;">Terms of Service</a>
          <a href="${appUrl}/privacy" style="color:${EMAIL_COLORS.textTertiary};font-size:13px;text-decoration:none;">Privacy Policy</a>
          <a href="${appUrl}/manual" style="color:${EMAIL_COLORS.textTertiary};font-size:13px;text-decoration:none;">BizClear Manual</a>
          <a href="https://alaminoscity.gov.ph/public-service/city-services/City%20Government%20of%20Alaminos,%20Pangasinan%20Citizen's%20Charter.pdf" target="_blank" rel="noopener noreferrer" style="color:${EMAIL_COLORS.textTertiary};font-size:13px;text-decoration:none;">Alaminos Citizen's Charter</a>
          <a href="https://www.alaminoscity.gov.ph/index.html" target="_blank" rel="noopener noreferrer" style="color:${EMAIL_COLORS.textTertiary};font-size:13px;text-decoration:none;">Official City Website</a>
        </div>
        <p style="margin:0;color:${EMAIL_COLORS.textQuaternary};font-size:12px;">
          © ${new Date().getFullYear()} BizClear. All Rights Reserved.
        </p>
      </div>
    </div>
    <style>
      @media (max-width: 600px) {
        .footer-links {
          flex-direction: column !important;
          align-items: flex-start !important;
          gap: 12px !important;
        }
      }
    </style>
  `

  // Max width for email content (larger for Storybook preview)
  const emailMaxWidth = '1000px'

  // Helper for OTP code box
  const buildOtpBox = ({ code }) => `
    <div style="background:${EMAIL_COLORS.bgLight};padding:16px;border-radius:8px;border:1px dashed ${EMAIL_COLORS.primary};margin-bottom:24px;display:inline-block;">
      <div style="font-size:18px;letter-spacing:4px;color:${EMAIL_COLORS.primary};font-weight:600;font-family:monospace;">${code}</div>
    </div>
  `

  // Helper for permit decision status box
  const buildStatusBox = ({ applicationReferenceNumber, businessName, rejectionReason, statusBg, statusBorder }) => `
    <div style="background:${statusBg};border:1px solid ${statusBorder};border-left:3px solid ${statusBorder};border-radius:6px;padding:16px;margin:24px 0;">
      <p style="margin:0 0 4px;color:${EMAIL_COLORS.textTertiary};font-size:12px;font-weight:600;">Application reference</p>
      <p style="margin:0 0 12px;color:${EMAIL_COLORS.textPrimary};font-size:14px;font-weight:700;">${applicationReferenceNumber}</p>
      <p style="margin:0 0 4px;color:${EMAIL_COLORS.textTertiary};font-size:12px;font-weight:600;">Business name</p>
      <p style="margin:0;color:${EMAIL_COLORS.textPrimary};font-size:14px;">${businessName}</p>
      ${rejectionReason ? `<p style="margin:12px 0 4px;color:${EMAIL_COLORS.textTertiary};font-size:12px;font-weight:600;">Reason</p>
      <p style="margin:0;color:${EMAIL_COLORS.textSecondary};font-size:14px;">${rejectionReason}</p>` : ''}
    </div>
  `

  // Helper for JSON details box (system alerts)
  const buildJsonDetailsBox = ({ alertType, details }) => {
    const detailsStr = typeof details === 'object' ? JSON.stringify(details, null, 2) : String(details)
    return `
    <div style="background:${EMAIL_COLORS.bgWarning};border:1px solid ${EMAIL_COLORS.borderWarning};border-left:3px solid ${EMAIL_COLORS.antWarning};padding:16px;border-radius:6px;margin-bottom:24px;">
      <p style="margin:0 0 4px;color:${EMAIL_COLORS.textTertiary};font-size:12px;font-weight:600;">Alert type</p>
      <p style="margin:0 0 12px;color:${EMAIL_COLORS.textPrimary};font-size:14px;font-weight:700;">${alertType}</p>
      <p style="margin:0 0 4px;color:${EMAIL_COLORS.textTertiary};font-size:12px;font-weight:600;">Details</p>
      <pre style="margin:0;color:${EMAIL_COLORS.textPrimary};font-size:13px;font-family:monospace;white-space:pre-wrap;word-break:break-all;">${detailsStr.replace(/</g, '&lt;')}</pre>
    </div>
    `
  }

  // Helper for info field boxes (simple label/value pairs)
  const buildInfoBox = ({ fields, bgColor, borderColor, accentColor }) => {
    const isContextual = !!bgColor
    const bg = bgColor || EMAIL_COLORS.bgWhite
    const accent = accentColor || (isContextual ? (borderColor || EMAIL_COLORS.border) : EMAIL_COLORS.primary)
    const borderStyle = isContextual
      ? `border:1px solid ${borderColor || EMAIL_COLORS.border};border-left:3px solid ${accent};`
      : `border-left:3px solid ${accent};`
    const fieldHtml = fields.map(f => `
      <div style="margin-bottom:12px;">
        ${f.label ? `<span style="color:${EMAIL_COLORS.textTertiary};font-size:12px;font-weight:600;">${f.label}</span><br>` : ''}
        <span style="color:${f.color || EMAIL_COLORS.textPrimary};font-size:${f.fontSize || '14px'};${f.fontWeight ? `font-weight:${f.fontWeight};` : ''}">${f.value}</span>
      </div>
    `).join('')
    return `
    <div style="background:${bg};padding:16px 16px 4px 20px;border-radius:6px;${borderStyle}margin-bottom:24px;">
      ${fieldHtml}
    </div>
    `
  }

  // Base email HTML wrapper
  const buildEmailHtml = ({ bodyContent }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="https://fonts.googleapis.com/css2?family=Raleway:wght@400;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;font-family:'Raleway', sans-serif;">
  <div style="max-width:${emailMaxWidth};margin:0 auto;background:${EMAIL_COLORS.bgWhite};box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden;">
    ${headerHtml}
    ${bodyContent}
    ${footerHtml}
  </div>
</body>
</html>
`

  let html = ''

  if (isOtp) {
    const bodyContent = `
    <div style="padding:40px 32px;text-align:left;">
      <p style="margin:0 0 24px;color:${EMAIL_COLORS.textPrimary};font-size:14px;">${greeting},</p>
      <p style="margin:0 0 24px;color:rgba(0,0,0,0.88);font-size:14px;line-height:1.5715;">
        ${intro}
      </p>
      ${buildOtpBox({ code })}
      <p style="margin:0 0 24px;color:rgba(0,0,0,0.88);font-size:14px;">
        Regards, BizClear Team
      </p>
    </div>
    `
    html = buildEmailHtml({ bodyContent })
  } else if (isStaffCredentials) {
    const bodyContent = `
    <div style="padding:40px 32px;text-align:left;">
      <p style="margin:0 0 24px;color:${EMAIL_COLORS.textPrimary};font-size:14px;">${greeting},</p>
      <p style="margin:0 0 24px;color:rgba(0,0,0,0.88);font-size:14px;line-height:1.5715;">
        ${intro}
      </p>
      ${buildInfoBox({
        fields: [
          ...(username ? [{ label: 'Username', value: username, color: EMAIL_COLORS.primary, fontSize: '14px', fontWeight: '700' }] : []),
          { label: 'Temporary password', value: tempPassword, color: EMAIL_COLORS.primary, fontSize: '14px', fontWeight: '700' },
          { label: 'Office', value: office },
          { label: 'Role', value: role }
        ]
      })}
      <p style="margin:0 0 24px;color:rgba(0,0,0,0.88);font-size:14px;">
        Regards, BizClear Team
      </p>
    </div>
    `
    html = buildEmailHtml({ bodyContent })
  } else if (isEmailChange) {
    const bodyContent = `
    <div style="padding:40px 32px;text-align:left;">
      <p style="margin:0 0 24px;color:${EMAIL_COLORS.textPrimary};font-size:14px;">${greeting},</p>
      <p style="margin:0 0 24px;color:rgba(0,0,0,0.88);font-size:14px;line-height:1.5715;">
        ${intro}
      </p>
      ${buildInfoBox({
        fields: [
          { label: 'Old email', value: oldEmail },
          { label: 'New email', value: newEmail, color: EMAIL_COLORS.primary, fontSize: '14px', fontWeight: '700' }
        ]
      })}
      <p style="margin:0 0 24px;color:rgba(0,0,0,0.88);font-size:14px;">
        Regards, BizClear Team
      </p>
    </div>
    `
    html = buildEmailHtml({ bodyContent })
  } else if (isHelpRequest) {
    const bodyContent = `
    <div style="padding:40px 32px;text-align:left;">
      <p style="margin:0 0 24px;color:${EMAIL_COLORS.textPrimary};font-size:14px;">${greeting},</p>
      <p style="margin:0 0 24px;color:rgba(0,0,0,0.88);font-size:14px;line-height:1.5715;">
        ${intro}
      </p>
      ${buildInfoBox({
        fields: [
          { label: 'Request ID', value: requestId, color: EMAIL_COLORS.primary, fontSize: '14px', fontWeight: '700' },
          ...(subjectLine ? [{ label: 'Subject', value: subjectLine }] : []),
          ...(preview ? [{ label: 'Response preview', value: preview }] : [])
        ]
      })}
      <p style="margin:0 0 24px;color:rgba(0,0,0,0.88);font-size:14px;">
        Regards, BizClear Team
      </p>
    </div>
    `
    html = buildEmailHtml({ bodyContent })
  } else if (isSystemAlert) {
    const bodyContent = `
    <div style="padding:40px 32px;">
      <p style="margin:0 0 24px;color:${EMAIL_COLORS.textPrimary};font-size:14px;">${greeting},</p>
      <p style="margin:0 0 24px;color:rgba(0,0,0,0.88);font-size:14px;line-height:1.5715;">
        ${intro}
      </p>
      ${buildJsonDetailsBox({ alertType, details })}
      <p style="margin:0 0 24px;color:rgba(0,0,0,0.88);font-size:14px;">
        Regards, BizClear Team
      </p>
    </div>
    `
    html = buildEmailHtml({ bodyContent })
  } else if (isTamperIncident) {
    const detectedTime = detectedAt ? new Date(detectedAt).toLocaleString() : new Date().toLocaleString()
    const bodyContent = `
    <div style="padding:40px 32px;">
      <p style="margin:0 0 24px;color:${EMAIL_COLORS.textPrimary};font-size:14px;">${greeting},</p>
      <p style="margin:0 0 24px;color:rgba(0,0,0,0.88);font-size:14px;line-height:1.5715;">
        ${intro}
      </p>
      ${buildInfoBox({
        bgColor: EMAIL_COLORS.bgError,
        borderColor: EMAIL_COLORS.borderError,
        fields: [
          { label: 'Severity', value: severity, color: EMAIL_COLORS.antError, fontSize: '14px', fontWeight: '700' },
          { label: 'Status', value: verificationStatus },
          { label: 'Message', value: message || 'N/A' },
          { label: 'Detected', value: detectedTime }
        ]
      })}
      <p style="margin:0 0 24px;color:rgba(0,0,0,0.88);font-size:14px;">
        Regards, BizClear Team
      </p>
    </div>
    `
    html = buildEmailHtml({ bodyContent })
  } else if (isAdminAlert) {
    const attemptTime = timestamp ? new Date(timestamp).toLocaleString() : new Date().toLocaleString()
    const bodyContent = `
    <div style="padding:40px 32px;">
      <p style="margin:0 0 24px;color:${EMAIL_COLORS.textPrimary};font-size:14px;">${greeting},</p>
      <p style="margin:0 0 24px;color:rgba(0,0,0,0.88);font-size:14px;line-height:1.5715;">
        ${intro}
      </p>
      ${buildInfoBox({
        bgColor: EMAIL_COLORS.bgError,
        borderColor: EMAIL_COLORS.borderError,
        fields: [
          { label: 'User', value: userName, fontWeight: '600' },
          { label: '', value: userEmail },
          { label: 'Role', value: roleSlug },
          { label: 'Field attempted', value: field, color: EMAIL_COLORS.antError, fontWeight: '700' },
          { label: 'Attempted value', value: typeof attemptedValue === 'string' ? attemptedValue : JSON.stringify(attemptedValue) },
          { label: 'Time', value: attemptTime }
        ]
      })}
      <p style="margin:0 0 24px;color:rgba(0,0,0,0.88);font-size:14px;">
        Regards, BizClear Team
      </p>
    </div>
    `
    html = buildEmailHtml({ bodyContent })
  } else if (isPermitDecision) {
    const isApproved = intro.toLowerCase().includes('approved')
    const statusBg = isApproved ? EMAIL_COLORS.bgSuccess : EMAIL_COLORS.bgError
    const statusBorder = isApproved ? EMAIL_COLORS.borderSuccess : EMAIL_COLORS.borderError
    const bodyContent = `
    <div style="padding:40px 32px;">
      <p style="margin:0 0 24px;color:${EMAIL_COLORS.textPrimary};font-size:14px;">${greeting},</p>
      <p style="margin:0 0 24px;color:rgba(0,0,0,0.88);font-size:14px;line-height:1.5715;">
        ${intro}
      </p>
      ${buildStatusBox({ applicationReferenceNumber, businessName, rejectionReason, statusBg, statusBorder })}
      <p style="margin:0 0 24px;color:rgba(0,0,0,0.88);font-size:14px;">
        Regards, BizClear Team
      </p>
    </div>
    `
    html = buildEmailHtml({ bodyContent })
  } else if (isDeletionReminder) {
    const bodyContent = `
    <div style="padding:40px 32px;">
      <p style="margin:0 0 24px;color:${EMAIL_COLORS.textPrimary};font-size:14px;">${greeting},</p>
      <p style="margin:0 0 24px;color:rgba(0,0,0,0.88);font-size:14px;line-height:1.5715;">
        ${intro}
      </p>
      ${buildInfoBox({
        bgColor: EMAIL_COLORS.bgWarning,
        borderColor: EMAIL_COLORS.borderWarning,
        fields: [
          { label: 'Days remaining', value: daysRemaining, color: EMAIL_COLORS.antWarning, fontSize: '14px', fontWeight: '700' },
          { label: 'Scheduled for', value: scheduledFor }
        ]
      })}
      <p style="margin:0 0 24px;color:rgba(0,0,0,0.88);font-size:14px;">
        Regards, BizClear Team
      </p>
    </div>
    `
    html = buildEmailHtml({ bodyContent })
  } else if (isClearanceNotification) {
    const statusColor = status === 'Approved' ? EMAIL_COLORS.success : status === 'Rejected' ? EMAIL_COLORS.antError : EMAIL_COLORS.primary
    const bodyContent = `
    <div style="padding:40px 32px;">
      <p style="margin:0 0 24px;color:${EMAIL_COLORS.textPrimary};font-size:14px;">${greeting},</p>
      <p style="margin:0 0 24px;color:rgba(0,0,0,0.88);font-size:14px;line-height:1.5715;">
        ${intro}
      </p>
      ${buildInfoBox({
        fields: [
          { label: 'Clearance ID', value: clearanceId, fontWeight: '700' },
          { label: 'Business name', value: businessName },
          { label: 'Status', value: status, color: statusColor, fontSize: '14px', fontWeight: '700' }
        ]
      })}
      <p style="margin:0 0 24px;color:rgba(0,0,0,0.88);font-size:14px;">
        Regards, BizClear Team
      </p>
    </div>
    `
    html = buildEmailHtml({ bodyContent })
  } else {
    // Generic notification template
    const bodyContent = `
    <div style="padding:40px 32px;text-align:left;">
      <p style="margin:0 0 24px;color:${EMAIL_COLORS.textPrimary};font-size:14px;">${greeting},</p>
      <p style="margin:0 0 24px;color:rgba(0,0,0,0.88);font-size:14px;line-height:1.5715;">
        ${intro}
      </p>
      <p style="margin:0 0 24px;color:rgba(0,0,0,0.88);font-size:14px;">
        Regards, BizClear Team
      </p>
    </div>
    `
    html = buildEmailHtml({ bodyContent })
  }

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
      <div
        style={{
          overflow: 'hidden',
          backgroundColor: EMAIL_COLORS.bgWrapper,
        }}
      >
        <iframe
          title="Email Preview"
          srcDoc={html}
          style={{
            width: '100%',
            height: 'auto',
            border: 'none',
            minHeight: '400px',
          }}
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  )
}
