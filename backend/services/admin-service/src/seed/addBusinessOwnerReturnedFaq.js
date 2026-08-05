/**
 * Add business-owner-returned-faq slot to existing CMS FAQ collection.
 * This script adds the new FAQ entry for returned applications without clearing existing data.
 */

const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("../config/db");
const FaqSection = require("../models/FaqSection");
const logger = require("../lib/logger");

// Load environment variables
dotenv.config();
const projectRootEnv = path.join(__dirname, "..", "..", "..", "..", ".env");
try {
  require("dotenv").config({ path: projectRootEnv });
} catch (_) {
  /* optional */
}

async function addBusinessOwnerReturnedFaq() {
  try {
    // Delete existing slot if it exists to allow reseeding
    const existing = await FaqSection.findOne({
      slotId: "business-owner-returned-faq",
    });
    if (existing) {
      logger.info(
        "FAQ slot 'business-owner-returned-faq' already exists. Deleting and reseeding.",
      );
      await FaqSection.deleteOne({ slotId: "business-owner-returned-faq" });
    }

    const faqEntry = {
      slotId: "business-owner-returned-faq",
      title: "Frequently Asked Questions",
      subtitle: "Quick answers about your returned application.",
      items: [
        {
          key: "returned-faq-1",
          question: "Why was my application returned?",
          answer:
            "Your application was returned because the LGU officer identified issues that need to be addressed. This could be due to missing documents, incorrect information, or incomplete sections. The specific reasons are listed in the 'Issues Identified' section of your application. This is a normal part of the review process and gives you a chance to correct any issues before final approval.",
        },
        {
          key: "returned-faq-2",
          question: "What fields are locked and why?",
          answer:
            "Fields that have already been approved by the LGU officer are locked to prevent accidental changes. These fields contain information that has been verified and accepted. You can only edit fields that were flagged for revision. This ensures that approved information remains consistent while allowing you to fix the specific issues identified.",
        },
        {
          key: "returned-faq-3",
          question: "How do I know which fields need to be updated?",
          answer:
            "The fields that need revision are clearly marked in your application. Check the 'Issues Identified' section for specific feedback. When you navigate to the form sections, locked fields will be disabled and you won't be able to edit them. Only the fields that require changes will be editable. Focus on updating these specific fields.",
        },
        {
          key: "returned-faq-4",
          question: "Do I need to pay again when resubmitting?",
          answer:
            "No, you do not need to pay again. Your initial payment covers the entire application process, including revisions. Once you make the required changes and resubmit, your application will go back to the review queue without any additional fees. Payment is only required for new applications.",
        },
        {
          key: "returned-faq-5",
          question:
            "How long will it take to review my resubmitted application?",
          answer:
            "Resubmitted applications are typically reviewed within 1-3 business days, faster than the initial review. Since only specific sections need to be checked, the process is quicker. The same officer who returned your application will review the changes. Respond promptly to avoid delays in approval.",
        },
        {
          key: "returned-faq-6",
          question: "What if I disagree with the officer's feedback?",
          answer:
            "If you believe the feedback is incorrect, you have options. First, contact the LGU officer directly to discuss the issue. If you still disagree, you can submit an appeal explaining why you believe the decision was incorrect. Include supporting documents that validate your position. Appeals are reviewed by a different officer or supervisor.",
        },
        {
          key: "returned-faq-7",
          question: "Can I add new information that wasn't requested?",
          answer:
            "You can update any field that is not locked. However, it's best to focus on the specific issues identified first. Adding unnecessary changes may delay the review process. If you have additional information that you believe is important, contact the officer first to discuss whether it should be included.",
        },
        {
          key: "returned-faq-8",
          question: "What happens if I don't resubmit within a certain time?",
          answer:
            "There is no strict deadline for resubmitting, but it's best to respond promptly. Applications left in returned status for extended periods may be archived. If your application is archived, you may need to contact the LGU to reactivate it. Quick response ensures faster approval and prevents your application from being set aside.",
        },
        {
          key: "returned-faq-9",
          question: "Will my application be returned again?",
          answer:
            "It's possible if the changes don't fully address the issues. The officer will review your resubmission and may return it again if problems persist. To avoid this, carefully read all feedback and make sure each issue is fully resolved. If you're unsure about any requirement, contact the officer for clarification before resubmitting.",
        },
        {
          key: "returned-faq-10",
          question: "How do I check the status of my returned application?",
          answer:
            "Your application status is visible in your dashboard. After resubmitting, it will show 'Under Review' or 'Resubmitted'. You'll receive email notifications for any status changes. Check the application details section for the most current status and any new feedback from the reviewing officer.",
        },
      ],
      isPublished: true,
      draftData: {
        subtitle: "Quick answers about your returned application.",
        items: [
          {
            key: "returned-faq-1",
            question: "Why was my application returned?",
            answer:
              "Your application was returned because the LGU officer identified issues that need to be addressed. This could be due to missing documents, incorrect information, or incomplete sections. The specific reasons are listed in the 'Issues Identified' section of your application. This is a normal part of the review process and gives you a chance to correct any issues before final approval.",
          },
          {
            key: "returned-faq-2",
            question: "What fields are locked and why?",
            answer:
              "Fields that have already been approved by the LGU officer are locked to prevent accidental changes. These fields contain information that has been verified and accepted. You can only edit fields that were flagged for revision. This ensures that approved information remains consistent while allowing you to fix the specific issues identified.",
          },
          {
            key: "returned-faq-3",
            question: "How do I know which fields need to be updated?",
            answer:
              "The fields that need revision are clearly marked in your application. Check the 'Issues Identified' section for specific feedback. When you navigate to the form sections, locked fields will be disabled and you won't be able to edit them. Only the fields that require changes will be editable. Focus on updating these specific fields.",
          },
          {
            key: "returned-faq-4",
            question: "Do I need to pay again when resubmitting?",
            answer:
              "No, you do not need to pay again. Your initial payment covers the entire application process, including revisions. Once you make the required changes and resubmit, your application will go back to the review queue without any additional fees. Payment is only required for new applications.",
          },
          {
            key: "returned-faq-5",
            question:
              "How long will it take to review my resubmitted application?",
            answer:
              "Resubmitted applications are typically reviewed within 1-3 business days, faster than the initial review. Since only specific sections need to be checked, the process is quicker. The same officer who returned your application will review the changes. Respond promptly to avoid delays in approval.",
          },
          {
            key: "returned-faq-6",
            question: "What if I disagree with the officer's feedback?",
            answer:
              "If you believe the feedback is incorrect, you have options. First, contact the LGU officer directly to discuss the issue. If you still disagree, you can submit an appeal explaining why you believe the decision was incorrect. Include supporting documents that validate your position. Appeals are reviewed by a different officer or supervisor.",
          },
          {
            key: "returned-faq-7",
            question: "Can I add new information that wasn't requested?",
            answer:
              "You can update any field that is not locked. However, it's best to focus on the specific issues identified first. Adding unnecessary changes may delay the review process. If you have additional information that you believe is important, contact the officer first to discuss whether it should be included.",
          },
          {
            key: "returned-faq-8",
            question: "What if I don't resubmit within a certain time?",
            answer:
              "There is no strict deadline for resubmitting, but it's best to respond promptly. Applications left in returned status for extended periods may be archived. If your application is archived, you may need to contact the LGU to reactivate it. Quick response ensures faster approval and prevents your application from being set aside.",
          },
          {
            key: "returned-faq-9",
            question: "Will my application be returned again?",
            answer:
              "It's possible if the changes don't fully address the issues. The officer will review your resubmission and may return it again if problems persist. To avoid this, carefully read all feedback and make sure each issue is fully resolved. If you're unsure about any requirement, contact the officer for clarification before resubmitting.",
          },
          {
            key: "returned-faq-10",
            question: "How do I check the status of my returned application?",
            answer:
              "Your application status is visible in your dashboard. After resubmitting, it will show 'Under Review' or 'Resubmitted'. You'll receive email notifications for any status changes. Check the application details section for the most current status and any new feedback from the reviewing officer.",
          },
        ],
      },
      publishedData: {
        subtitle: "Quick answers about your returned application.",
        items: [
          {
            key: "returned-faq-1",
            question: "Why was my application returned?",
            answer:
              "Your application was returned because the LGU officer identified issues that need to be addressed. This could be due to missing documents, incorrect information, or incomplete sections. The specific reasons are listed in the 'Issues Identified' section of your application. This is a normal part of the review process and gives you a chance to correct any issues before final approval.",
          },
          {
            key: "returned-faq-2",
            question: "What fields are locked and why?",
            answer:
              "Fields that have already been approved by the LGU officer are locked to prevent accidental changes. These fields contain information that has been verified and accepted. You can only edit fields that were flagged for revision. This ensures that approved information remains consistent while allowing you to fix the specific issues identified.",
          },
          {
            key: "returned-faq-3",
            question: "How do I know which fields need to be updated?",
            answer:
              "The fields that need revision are clearly marked in your application. Check the 'Issues Identified' section for specific feedback. When you navigate to the form sections, locked fields will be disabled and you won't be able to edit them. Only the fields that require changes will be editable. Focus on updating these specific fields.",
          },
          {
            key: "returned-faq-4",
            question: "Do I need to pay again when resubmitting?",
            answer:
              "No, you do not need to pay again. Your initial payment covers the entire application process, including revisions. Once you make the required changes and resubmit, your application will go back to the review queue without any additional fees. Payment is only required for new applications.",
          },
          {
            key: "returned-faq-5",
            question:
              "How long will it take to review my resubmitted application?",
            answer:
              "Resubmitted applications are typically reviewed within 1-3 business days, faster than the initial review. Since only specific sections need to be checked, the process is quicker. The same officer who returned your application will review the changes. Respond promptly to avoid delays in approval.",
          },
          {
            key: "returned-faq-6",
            question: "What if I disagree with the officer's feedback?",
            answer:
              "If you believe the feedback is incorrect, you have options. First, contact the LGU officer directly to discuss the issue. If you still disagree, you can submit an appeal explaining why you believe the decision was incorrect. Include supporting documents that validate your position. Appeals are reviewed by a different officer or supervisor.",
          },
          {
            key: "returned-faq-7",
            question: "Can I add new information that wasn't requested?",
            answer:
              "You can update any field that is not locked. However, it's best to focus on the specific issues identified first. Adding unnecessary changes may delay the review process. If you have additional information that you believe is important, contact the officer first to discuss whether it should be included.",
          },
          {
            key: "returned-faq-8",
            question: "What if I don't resubmit within a certain time?",
            answer:
              "There is no strict deadline for resubmitting, but it's best to respond promptly. Applications left in returned status for extended periods may be archived. If your application is archived, you may need to contact the LGU to reactivate it. Quick response ensures faster approval and prevents your application from being set aside.",
          },
          {
            key: "returned-faq-9",
            question: "Will my application be returned again?",
            answer:
              "It's possible if the changes don't fully address the issues. The officer will review your resubmission and may return it again if problems persist. To avoid this, carefully read all feedback and make sure each issue is fully resolved. If you're unsure about any requirement, contact the officer for clarification before resubmitting.",
          },
          {
            key: "returned-faq-10",
            question: "How do I check the status of my returned application?",
            answer:
              "Your application status is visible in your dashboard. After resubmitting, it will show 'Under Review' or 'Resubmitted'. You'll receive email notifications for any status changes. Check the application details section for the most current status and any new feedback from the reviewing officer.",
          },
        ],
      },
    };

    await FaqSection.create(faqEntry);
    logger.info("Business owner returned FAQ added successfully");
    return { added: true, slotId: "business-owner-returned-faq" };
  } catch (err) {
    logger.error("Failed to add business owner returned FAQ", {
      error: err.message,
    });
    throw err;
  }
}

// Run if called directly
if (require.main === module) {
  (async () => {
    try {
      await connectDB();
      const result = await addBusinessOwnerReturnedFaq();
      console.log("Result:", result);
      process.exit(0);
    } catch (err) {
      console.error("Error:", err.message);
      process.exit(1);
    }
  })();
}

module.exports = { addBusinessOwnerReturnedFaq };
