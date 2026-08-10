/**
 * Application Email Service
 *
 * PURPOSE: Handles email sending for permit applications with fire-and-forget pattern.
 * Email failures should not block status changes.
 *
 * USAGE EXAMPLE:
 * const applicationEmailService = require('../services/lgu-officer/applicationEmail.service');
 * await applicationEmailService.sendApplicationEmail(application, 'approved', { rejectionReason: '...' });
 */

const User = require("../../models/User");
const Application = require("../../models/Application");

class ApplicationEmailService {
  /**
   * Send application email (fire and forget, doesn't block status change)
   *
   * @param {object} application - Application document
   * @param {string} emailType - Email type: submitted, resubmitted, approved, rejected, returned
   * @param {object} metadata - Additional metadata for email (rejectionReason, reviewComments, etc.)
   */
  async sendApplicationEmail(application, emailType, metadata = {}) {
    console.log("[sendApplicationEmail] START", {
      applicationId: application.applicationId || application._id,
      emailType,
      userId: application.userId,
      businessName: application.businessName,
    });
    try {
      const user = await User.findById(application.userId).select(
        "firstName lastName email",
      );
      console.log("[sendApplicationEmail] User lookup result", {
        found: !!user,
        hasEmail: !!user?.email,
        email: user?.email,
      });
      if (!user || !user.email) {
        console.warn(
          `User or email not found for application ${application.applicationId}`,
        );
        return;
      }

      const emailData = {
        to: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        businessName: application.businessName || "Unnamed Business",
        applicationId: application.applicationId,
        applicationReferenceNumber: application.applicationReferenceNumber,
        ...metadata,
      };
      console.log("[sendApplicationEmail] Email data prepared", {
        to: emailData.to,
        firstName: emailData.firstName,
        businessName: emailData.businessName,
        applicationReferenceNumber: emailData.applicationReferenceNumber,
      });

      // Import mailer functions dynamically to avoid circular dependency
      const mailer = require("../../../../auth-service/src/lib/mailer");
      console.log("[sendApplicationEmail] Mailer imported");

      switch (emailType) {
        case "submitted":
          console.log(
            "[sendApplicationEmail] Calling sendApplicationSubmittedEmail",
          );
          await mailer.sendApplicationSubmittedEmail(emailData);
          console.log(
            "[sendApplicationEmail] sendApplicationSubmittedEmail completed",
          );
          break;
        case "resubmitted":
          console.log(
            "[sendApplicationEmail] Calling sendApplicationResubmittedEmail",
          );
          await mailer.sendApplicationResubmittedEmail(emailData);
          console.log(
            "[sendApplicationEmail] sendApplicationResubmittedEmail completed",
          );
          break;
        case "approved":
          await mailer.sendApplicationApprovedEmail(emailData);
          break;
        case "rejected":
          await mailer.sendApplicationRejectedEmail({
            ...emailData,
            rejectionReason: metadata.rejectionReason,
          });
          break;
        case "returned":
          await mailer.sendApplicationReturnedEmail({
            ...emailData,
            reviewComments: metadata.reviewComments,
          });
          break;
        default:
          console.warn(`Unknown email type: ${emailType}`);
          return;
      }

      // Update emailSendStatus to sent using direct updateOne to avoid document instance issues
      console.log(
        "[sendApplicationEmail] Attempting updateOne with _id:",
        application._id,
        "emailType:",
        emailType,
      );
      const updateResult = await Application.updateOne(
        { _id: application._id },
        {
          $set: {
            [`emailSendStatus.${emailType}`]: {
              status: "sent",
              retryCount: 0,
              lastAttempt: new Date(),
              lockUntil: null,
            },
          },
        },
      );
      console.log(
        "[sendApplicationEmail] Direct updateOne result:",
        JSON.stringify(updateResult),
      );
      console.log(
        "[sendApplicationEmail] SUCCESS - emailSendStatus updated via updateOne",
      );
    } catch (err) {
      console.error(
        `Failed to send ${emailType} email for application ${application.applicationId}:`,
        err.message,
      );
      // Update emailSendStatus to failed using direct updateOne
      const currentRetry =
        (application.emailSendStatus?.[emailType]?.retryCount || 0) + 1;
      await Application.updateOne(
        { _id: application._id },
        {
          $set: {
            [`emailSendStatus.${emailType}`]: {
              status: "failed",
              retryCount: currentRetry,
              lastAttempt: new Date(),
              lockUntil: null,
            },
          },
        },
      );
    }
  }

  /**
   * Update email send status directly
   *
   * @param {string} applicationId - Application ID
   * @param {string} emailType - Email type
   * @param {string} status - Status: sent, failed
   * @param {number} retryCount - Retry count
   */
  async updateEmailStatus(applicationId, emailType, status, retryCount = 0) {
    await Application.updateOne(
      { _id: applicationId },
      {
        $set: {
          [`emailSendStatus.${emailType}`]: {
            status,
            retryCount,
            lastAttempt: new Date(),
            lockUntil: null,
          },
        },
      },
    );
  }
}

module.exports = new ApplicationEmailService();
