import EmailTemplate from './EmailTemplate'

export default {
  title: 'Email Templates',
  component: EmailTemplate,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
}

// OTP Email - Login
export const OtpLogin = {
  args: {
    subject: 'Your verification code',
    greeting: 'Hello',
    intro: 'You recently requested to sign in to your BizClear account. Use the code below to complete your verification. Don\'t share this code with anyone. This code expires in 10 minutes. If this wasn\'t you, <a href="http://localhost:5173/support/security" style="color:#0039AF;text-decoration:underline;">report it immediately</a>.',
    code: '123456',
  },
}

// OTP Email - Signup
export const OtpSignup = {
  args: {
    subject: 'Verify Your Email',
    greeting: 'Hello',
    intro: "You're signing up for BizClear. Use the code below to verify your email and complete registration. Don't share this code with anyone. This code expires in 10 minutes. If this wasn't you, <a href='http://localhost:5173/support/security' style='color:#0039AF;text-decoration:underline;'>report it immediately</a>.",
    code: '654321',
  },
}

// OTP Email - Password Reset
export const OtpPasswordReset = {
  args: {
    subject: 'Reset Your Password',
    greeting: 'Hello',
    intro: 'You requested to reset your password. Use the code below to set a new password. If you didn\'t request this, you can safely ignore this email. Don\'t share this code with anyone. This code expires in 10 minutes.',
    code: '789012',
  },
}

// OTP Email - Email Change
export const OtpEmailChange = {
  args: {
    subject: 'Confirm Email Change',
    greeting: 'Hello',
    intro: 'You requested to change the email address for your account. Use the code below to confirm this change. Don\'t share this code with anyone. This code expires in 10 minutes. If this wasn\'t you, <a href="http://localhost:5173/account/email/revert" style="color:#0039AF;text-decoration:underline;">revert this change</a> within 24 hours.',
    code: '345678',
  },
}

// OTP Email - Account Deletion
export const OtpAccountDeletion = {
  args: {
    subject: 'Confirm Account Deletion',
    greeting: 'Hello',
    intro: 'You requested to permanently delete your account. Use the code below to confirm account deletion. This action cannot be undone after the grace period. Don\'t share this code with anyone. This code expires in 10 minutes. If this wasn\'t you, <a href="http://localhost:5173/support/security" style="color:#0039AF;text-decoration:underline;">report it immediately</a>.',
    code: '901234',
  },
}

// OTP Email - MFA Setup
export const OtpMfaSetup = {
  args: {
    subject: 'Enable Verification',
    greeting: 'Hello',
    intro: "You're enabling fingerprint or additional verification. Use the code below to complete setup. Don't share this code with anyone. This code expires in 10 minutes. If this wasn't you, <a href='http://localhost:5173/support/security' style='color:#0039AF;text-decoration:underline;'>report it immediately</a>.",
    code: '567890',
  },
}

// Staff Credentials Email
export const StaffCredentials = {
  args: {
    subject: 'Your Staff Account Credentials',
    greeting: 'Hello',
    intro: 'Your staff account has been created. Use the credentials below to access the portal. Please <a href="http://localhost:5173/auth/login" style="color:#0039AF;text-decoration:underline;">log in</a> and change your password immediately.',
    username: 'john.doe',
    tempPassword: 'TempPass123!',
    office: 'Dagupan City LGU',
    role: 'LGU Officer',
  },
}

// Password Change Notification
export const PasswordChangeNotification = {
  args: {
    subject: 'Password Changed Successfully',
    greeting: 'Hello John',
    intro: 'Your password was successfully changed. If you didn\'t make this change, please <a href="http://localhost:5173/support/security" style="color:#0039AF;text-decoration:underline;">contact support immediately</a>.',
  },
}

// MFA Enabled Notification
export const MfaEnabledNotification = {
  args: {
    subject: 'Two-Factor Authentication Enabled',
    greeting: 'Hello John',
    intro: 'Two-factor authentication has been successfully enabled on your account. Your account is now more secure.',
  },
}

// MFA Disabled Notification
export const MfaDisabledNotification = {
  args: {
    subject: 'Two-Factor Authentication Disabled',
    greeting: 'Hello John',
    intro: 'Two-factor authentication has been disabled on your account. Consider re-enabling it for better security.',
  },
}

// MFA Disable Requested Notification (24-hour delay)
export const MfaDisableRequestedNotification = {
  args: {
    subject: 'Two-Factor Authentication Disable Requested',
    greeting: 'Hello John',
    intro: 'You requested to disable two-factor authentication. This action will be completed after a 24-hour security delay for your protection.',
  },
}

// Passkey Added Notification
export const PasskeyAddedNotification = {
  args: {
    subject: 'Passkey Added',
    greeting: 'Hello John',
    intro: 'A new passkey has been added to your account. You can now use it for passwordless authentication.',
  },
}

// Passkey Removed Notification
export const PasskeyRemovedNotification = {
  args: {
    subject: 'Passkey Removed',
    greeting: 'Hello John',
    intro: 'A passkey has been removed from your account. If you didn\'t make this change, please <a href="http://localhost:5173/support/security" style="color:#0039AF;text-decoration:underline;">contact support</a>.',
  },
}

// Email Change Notification (Old Email)
export const EmailChangeOldEmail = {
  args: {
    subject: 'Email Change Requested',
    greeting: 'Hello',
    intro: 'A request was made to change the email address associated with your account. You have a 24-hour grace period to <a href="http://localhost:5173/account/email/revert" style="color:#0039AF;text-decoration:underline;">revert this change</a>.',
    oldEmail: 'old.email@example.com',
    newEmail: 'new.email@example.com',
  },
}

// Email Change Notification (New Email)
export const EmailChangeNewEmail = {
  args: {
    subject: 'Email Changed Successfully',
    greeting: 'Hello',
    intro: 'Your email address has been successfully changed.',
    oldEmail: 'old.email@example.com',
    newEmail: 'new.email@example.com',
  },
}

// Help Request Confirmation
export const HelpRequestConfirmation = {
  args: {
    subject: 'Help Request Received',
    greeting: 'Hello',
    intro: 'Thank you for contacting us. We have received your help request and will get back to you as soon as possible.',
    requestId: 'HR-ABC123',
    subjectLine: 'Issue with Business Permit Application',
  },
}

// Officer Reply Notification
export const OfficerReplyNotification = {
  args: {
    subject: 'New Response to Your Help Request',
    greeting: 'Hello',
    intro: 'An LGU officer has responded to your help request. Please review their response below.',
    requestId: 'HR-ABC123',
    preview: 'Thank you for your inquiry. We have reviewed your request and...',
  },
}

// Request Closed Notification
export const RequestClosedNotification = {
  args: {
    subject: 'Help Request Closed',
    greeting: 'Hello',
    intro: 'Your help request has been marked as resolved and closed. If you have any further questions, please submit a new request.',
    requestId: 'HR-ABC123',
    subjectLine: 'Issue with Business Permit Application',
  },
}

// Request Invalid Notification
export const RequestInvalidNotification = {
  args: {
    subject: 'Help Request Marked as Invalid',
    greeting: 'Hello',
    intro: 'Your help request has been marked as invalid. This may be due to insufficient information or being outside our scope.',
    requestId: 'HR-ABC123',
    subjectLine: 'Issue with Business Permit Application',
  },
}

// Staff/Admin Forgot Password Alert
export const StaffAdminForgotPasswordAlert = {
  args: {
    subject: 'Password Reset Attempt Detected',
    greeting: 'Hello John Doe',
    intro: 'A password reset was attempted for your staff/admin account. Password reset is not available for your account type. If you are staff, use Request Recovery from the staff portal.',
  },
}

// Admin Approval Notification
export const AdminApprovalNotification = {
  args: {
    subject: 'Account Approved',
    greeting: 'Hello John Doe',
    intro: 'Your admin account has been approved. You can now <a href="http://localhost:5173/auth/login" style="color:#0039AF;text-decoration:underline;">access the admin portal</a>.',
  },
}

// Admin Rejection Notification
export const AdminRejectionNotification = {
  args: {
    subject: 'Account Request Rejected',
    greeting: 'Hello John Doe',
    intro: 'Your admin account request has been rejected. Please contact another administrator for more information.',
  },
}

// System Alert
export const SystemAlert = {
  args: {
    subject: 'System alert: high_error_rate - BizClear',
    greeting: 'Hello',
    intro: 'A system alert has been triggered.',
    alertType: 'high_error_rate',
    details: {
      errorRate: '15%',
      threshold: '10%',
      timeWindow: '5 minutes',
      affectedServices: ['auth-service', 'business-service'],
    },
    appUrl: 'http://localhost:5173/admin',
  },
}

// Tamper Incident
export const TamperIncident = {
  args: {
    subject: 'Audit tamper incident (high) - BizClear',
    greeting: 'Hello',
    intro: 'An audit tamper or integrity issue was detected.',
    severity: 'high',
    verificationStatus: 'tamper_detected',
    message: 'Unexpected modification detected in audit log entry AR-12345',
    detectedAt: new Date().toISOString(),
    appUrl: 'http://localhost:5173/admin/security',
  },
}

// Admin Alert - Restricted Field Attempt
export const AdminAlertRestrictedField = {
  args: {
    subject: 'Security Alert: Restricted Field Attempt - BizClear',
    greeting: 'Hello Admin Smith',
    intro: 'A staff user has attempted to modify a restricted field. This action has been blocked and logged.',
    userName: 'John Doe',
    userEmail: 'john.doe@example.com',
    roleSlug: 'lgu_officer',
    field: 'businesses.applicationStatus',
    attemptedValue: 'approved',
    timestamp: new Date().toISOString(),
    appUrl: 'http://localhost:5173/admin/audit',
  },
}

// Account Deletion Reminder (TODO - Not yet implemented)
export const AccountDeletionReminder = {
  args: {
    subject: 'Account Deletion Reminder - 7 days remaining',
    greeting: 'Hello',
    intro: 'Your account is scheduled for deletion. You can cancel this action by using your undo token or contacting support.',
    daysRemaining: 7,
    scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
  },
}

// Clearance Notification (TODO - Not yet implemented)
export const ClearanceNotification = {
  args: {
    subject: 'Clearance Status Update',
    greeting: 'Hello',
    intro: 'There has been an update to your business clearance status.',
    clearanceId: 'CLR-54321',
    status: 'Approved',
    businessName: 'Sample Business',
  },
}

// Permit Decision Notification - Approved
export const PermitDecisionApproved = {
  args: {
    subject: 'Permit Application BP-2024-001234 - Approved',
    greeting: 'Hello John',
    intro: 'We are pleased to inform you that your permit application has been APPROVED. Your application has been reviewed and meets all requirements. <a href="http://localhost:5173/owner/permits" style="color:#0039AF;text-decoration:underline;">View your application</a> for details.',
    applicationReferenceNumber: 'BP-2024-001234',
    businessName: 'Sample Business',
    appUrl: 'http://localhost:5173/owner/permits',
  },
}

// Permit Decision Notification - Rejected
export const PermitDecisionRejected = {
  args: {
    subject: 'Permit Application BP-2024-001234 - Rejected',
    greeting: 'Hello John',
    intro: 'We regret to inform you that your permit application has been REJECTED. Please review the feedback and <a href="http://localhost:5173/owner/permits" style="color:#0039AF;text-decoration:underline;">submit a new application</a> if needed.',
    applicationReferenceNumber: 'BP-2024-001234',
    businessName: 'Sample Business',
    rejectionReason: 'Incomplete documentation: Missing business permit and valid ID.',
    appUrl: 'http://localhost:5173/owner/permits',
  },
}

// Permit Decision Notification - Corrections Required
export const PermitDecisionCorrectionsRequired = {
  args: {
    subject: 'Permit Application BP-2024-001234 - Corrections Required',
    greeting: 'Hello John',
    intro: 'Your permit application requires corrections before it can be approved. Please make the necessary corrections and <a href="http://localhost:5173/owner/permits" style="color:#0039AF;text-decoration:underline;">resubmit your application</a> for review.',
    applicationReferenceNumber: 'BP-2024-001234',
    businessName: 'Sample Business',
    rejectionReason: 'Please update your business address and upload a valid ID.',
    appUrl: 'http://localhost:5173/owner/permits',
  },
}

// Login OTP - Account Deletion Scheduled (special subject)
export const LoginOtpDeletionScheduled = {
  args: {
    subject: 'Your Login Verification Code - Account Deletion Scheduled',
    greeting: 'Hello John',
    intro: 'You recently requested to sign in to your BizClear account. Use the code below to complete your verification. Don\'t share this code with anyone. This code expires in 10 minutes.',
    code: '123456',
  },
}
