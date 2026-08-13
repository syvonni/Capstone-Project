/**
 * Add all business owner FAQ slots for different application statuses.
 * This script adds FAQ entries for draft, pending, approved, rejected, needs_revision, and returned statuses.
 */

const dotenv = require("dotenv");
const path = require("path");

// Load environment variables FIRST before importing connectDB
// When running in Docker, MONGO_URI is already set by docker-compose
// When running locally, load from .env
if (!process.env.MONGO_URI) {
  dotenv.config();
  const projectRootEnv = path.join(__dirname, "..", "..", "..", "..", ".env");
  try {
    require("dotenv").config({ path: projectRootEnv });
  } catch (_) {
    /* optional */
  }

  // If MONGO_URI is still not set, construct it from individual variables (for Docker local MongoDB)
  if (
    !process.env.MONGO_URI &&
    process.env.MONGO_APP_USER &&
    process.env.MONGO_APP_PASSWORD
  ) {
    const host = process.env.MONGO_HOST || "mongodb";
    process.env.MONGO_URI = `mongodb://${process.env.MONGO_APP_USER}:${process.env.MONGO_APP_PASSWORD}@${host}:27017/capstone_project?authSource=admin`;
  }
}

const connectDB = require("../config/db");
const FaqSection = require("../models/FaqSection");
const logger = require("../lib/logger");

const faqData = {
  "business-owner-draft-faq": {
    title: "Frequently Asked Questions",
    subtitle: "Quick answers about your draft application.",
    items: [
      {
        key: "draft-faq-1",
        question: "What is a draft application?",
        answer:
          "A draft application is a work-in-progress version of your business permit application. You can save your progress and return later to complete it. Drafts are not submitted for review until you click the submit button. This allows you to work at your own pace without losing your data.",
      },
      {
        key: "draft-faq-2",
        question: "How long are drafts saved?",
        answer:
          "Drafts are saved indefinitely as long as you have an active account. Your data is stored securely and can be accessed anytime you log in. We recommend completing and submitting your application within 30 days to ensure all information remains current.",
      },
      {
        key: "draft-faq-3",
        question: "Can I have multiple draft applications?",
        answer:
          "Yes, you can have multiple draft applications for different business types or locations. Each draft is independent and can be managed separately. However, we recommend focusing on completing one application at a time to avoid confusion.",
      },
      {
        key: "draft-faq-4",
        question: "What happens when I submit my draft?",
        answer:
          "When you submit your draft, it becomes a formal application and enters the review queue. An LGU officer will be assigned to review your application within 24 hours. You will no longer be able to edit most fields after submission.",
      },
      {
        key: "draft-faq-5",
        question: "Can I delete a draft?",
        answer:
          "Yes, you can delete any draft application at any time before submission. Simply click the delete button in your dashboard. Once deleted, the data cannot be recovered. Be sure you want to delete before confirming.",
      },
    ],
  },
  "business-owner-pending-faq": {
    title: "Frequently Asked Questions",
    subtitle: "Quick answers about your pending application.",
    items: [
      {
        key: "pending-faq-1",
        question: 'What does "pending" status mean?',
        answer:
          "Pending status means your application has been submitted and is waiting to be reviewed by an LGU officer. Your application is in the queue and will be assigned to an officer soon. This is a normal part of the application process.",
      },
      {
        key: "pending-faq-2",
        question: "How long does the review process take?",
        answer:
          "The review process typically takes 3-5 business days after your application is assigned to an LGU officer. Submitted applications are usually assigned within 24 hours. Peak periods may extend this timeframe slightly.",
      },
      {
        key: "pending-faq-3",
        question: "Can I make changes to a pending application?",
        answer:
          "No, once your application is submitted and in pending status, you cannot make changes. If you need to update information, wait for the officer to review it. If revisions are needed, you will be able to make changes then.",
      },
      {
        key: "pending-faq-4",
        question: "How will I know when my application is reviewed?",
        answer:
          "You will receive an email notification when your application status changes. You can also check your dashboard at any time to see the current status. The dashboard will show if your application is approved, returned for revision, or rejected.",
      },
      {
        key: "pending-faq-5",
        question: "What if my application is pending for a long time?",
        answer:
          "If your application has been pending for more than 7 business days without status change, contact the LGU office. There may be an issue that needs attention. Normal review time is 3-5 business days after assignment.",
      },
    ],
  },
  "business-owner-approved-faq": {
    title: "Frequently Asked Questions",
    subtitle: "Quick answers about your approved application.",
    items: [
      {
        key: "approved-faq-1",
        question: "What happens after my application is approved?",
        answer:
          "Congratulations! You will receive an approval notice via email. Payment instructions will be sent with options for online, bank, or in-person payment. Complete payment within 15 days to secure your permit.",
      },
      {
        key: "approved-faq-2",
        question: "How do I pay for my permit?",
        answer:
          "Payment can be made online through the payment portal, at designated banks, or in-person at the LGU office. Follow the instructions in your approval email. Keep your payment receipt as proof of payment.",
      },
      {
        key: "approved-faq-3",
        question: "What if I miss the payment deadline?",
        answer:
          "Payment is required within 15 days of approval. Some LGUs offer a 3-day grace period. After the deadline, approval may be revoked and you may need to restart the process. Contact LGU immediately if you anticipate payment issues.",
      },
      {
        key: "approved-faq-4",
        question: "When will I receive my permit?",
        answer:
          "Once payment is confirmed, your business permit will be issued within 1-2 business days. You can download it from your dashboard or pick it up at the LGU office. Display your permit prominently at your business location.",
      },
      {
        key: "approved-faq-5",
        question: "How long is my permit valid?",
        answer:
          "Business permits are typically valid for one calendar year, from January 1 to December 31. Renewal is required annually. You will receive renewal reminders before your permit expires.",
      },
    ],
  },
  "business-owner-rejected-faq": {
    title: "Frequently Asked Questions",
    subtitle: "Quick answers about your rejected application.",
    items: [
      {
        key: "rejected-faq-1",
        question: "Why was my application rejected?",
        answer:
          "Applications are rejected when they do not meet the requirements for a business permit. Common reasons include incomplete documents, incorrect information, non-compliance with zoning laws, or failure to meet business type requirements. The specific reason is provided in your rejection notice.",
      },
      {
        key: "rejected-faq-2",
        question: "Can I appeal a rejection?",
        answer:
          "Yes, you can file an appeal if you believe the rejection was made in error. Appeals must be filed within 30 days of the rejection date. Provide a detailed explanation and supporting documents to support your appeal. Appeals are reviewed by a different officer or supervisor.",
      },
      {
        key: "rejected-faq-3",
        question: "How do I file an appeal?",
        answer:
          'To file an appeal, go to your dashboard and click the "Appeal" button on your rejected application. Select the type of appeal (rejection appeal, wrong assessment, or other grounds), provide your explanation, and upload supporting documents. Submit and wait for the appeal decision.',
      },
      {
        key: "rejected-faq-4",
        question: "What if I don't want to appeal?",
        answer:
          "If you don't want to appeal, you can submit a new application addressing the issues that caused the rejection. Review the rejection reasons carefully and ensure your new application meets all requirements. You may also contact the LGU for clarification.",
      },
      {
        key: "rejected-faq-5",
        question: "How long does the appeal process take?",
        answer:
          "Appeals are typically reviewed within 5-7 business days. You will receive email notifications for status changes. Appeal stages are: Submitted → Under Review → Decision. Follow up with LGU if no update after 10 business days.",
      },
    ],
  },
  "business-owner-needs-revision-faq": {
    title: "Frequently Asked Questions",
    subtitle: "Quick answers about your application needing revision.",
    items: [
      {
        key: "revision-faq-1",
        question: 'What does "needs revision" mean?',
        answer:
          "Your application needs revision means the LGU officer identified issues that need to be addressed before approval. This is not a rejection - it's an opportunity to correct problems. You will receive specific feedback about what needs to be updated.",
      },
      {
        key: "revision-faq-2",
        question: "How do I make the required revisions?",
        answer:
          "Log in to your dashboard and open your application. The fields that need revision will be clearly marked. Update the requested information and resubmit. Follow the feedback provided by the officer to ensure all issues are addressed.",
      },
      {
        key: "revision-faq-3",
        question: "Do I need to pay again for revisions?",
        answer:
          "No, you do not need to pay again. Your initial payment covers the entire application process, including revisions. Once you make the required changes and resubmit, your application will go back to the review queue without additional fees.",
      },
      {
        key: "revision-faq-4",
        question: "How long do I have to make revisions?",
        answer:
          "There is no strict deadline, but it's best to respond promptly. Applications left in revision status for extended periods may be archived. Quick response ensures faster approval and prevents your application from being set aside.",
      },
      {
        key: "revision-faq-5",
        question: "What if I disagree with the revision request?",
        answer:
          "If you believe the revision request is incorrect, contact the LGU officer directly to discuss. If you still disagree, you can submit an appeal explaining why you believe the decision was incorrect. Include supporting documents that validate your position.",
      },
    ],
  },
  "business-owner-returned-faq": {
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
          "The fields that need revision are clearly marked in your application. Check the 'Issues Identified' section for specific feedback. When you navigate to the form sections, locked fields will be disabled and you won't be able to edit them. Only the fields that require changes will be editable.",
      },
      {
        key: "returned-faq-4",
        question: "Do I need to pay again when resubmitting?",
        answer:
          "No, you do not need to pay again. Your initial payment covers the entire application process, including revisions. Once you make the required changes and resubmit, your application will go back to the review queue without any additional fees.",
      },
      {
        key: "returned-faq-5",
        question: "How long will it take to review my resubmitted application?",
        answer:
          "Resubmitted applications are typically reviewed within 1-3 business days, faster than the initial review. Since only specific sections need to be checked, the process is quicker. Respond promptly to avoid delays in approval.",
      },
    ],
  },
  "business-owner-appeal-pending-faq": {
    title: "Frequently Asked Questions",
    subtitle: "Quick answers about your pending appeal.",
    items: [
      {
        key: "appeal-pending-faq-1",
        question: 'What does "appeal pending" mean?',
        answer:
          'Appeal pending means your appeal has been submitted and is now being reviewed by a different officer or supervisor. The original rejection is on hold while the appeal is evaluated. You will be notified when a decision is made.',
      },
      {
        key: "appeal-pending-faq-2",
        question: "How long does the appeal review take?",
        answer:
          "Appeals are typically reviewed within 5-7 business days. You will receive email notifications for status changes. Appeal stages are: Submitted → Under Review → Decision. Follow up with the LGU if no update after 10 business days.",
      },
      {
        key: "appeal-pending-faq-3",
        question: "Can I edit my application while an appeal is pending?",
        answer:
          "No, you cannot edit the original application while an appeal is under review. The reviewing officer will make a decision based on the appeal documents and the original application. If the appeal is approved, you may be asked to make specific changes.",
      },
      {
        key: "appeal-pending-faq-4",
        question: "What happens if my appeal is approved?",
        answer:
          "If your appeal is approved, your application may be returned to the review queue for further processing or directly approved, depending on the officer's decision. You will receive instructions on the next steps and any required actions.",
      },
      {
        key: "appeal-pending-faq-5",
        question: "Can I submit a new application while an appeal is pending?",
        answer:
          "It is best to wait for the appeal decision before submitting a new application for the same business. Submitting a new application while an appeal is pending may create confusion. If the appeal is rejected, you can then submit a new application.",
      },
    ],
  },
  "business-owner-appeal-rejected-faq": {
    title: "Frequently Asked Questions",
    subtitle: "Quick answers about your rejected appeal.",
    items: [
      {
        key: "appeal-rejected-faq-1",
        question: 'What does "appeal rejected" mean?',
        answer:
          'Appeal rejected means the reviewing officer or supervisor has decided that the original rejection of your application was correct and the appeal did not provide sufficient grounds to overturn it. The original rejection stands.',
      },
      {
        key: "appeal-rejected-faq-2",
        question: "Why was my appeal rejected?",
        answer:
          "Your appeal may have been rejected because the original rejection reasons were valid, the supporting evidence was insufficient, or the appeal did not meet the requirements. You can review the appeal decision notes for the specific reasons.",
      },
      {
        key: "appeal-rejected-faq-3",
        question: "Can I appeal the appeal decision?",
        answer:
          "No, appeal decisions are final and cannot be appealed again. However, you can submit a new application that addresses the issues that led to the original rejection and the appeal rejection.",
      },
      {
        key: "appeal-rejected-faq-4",
        question: "What are my options after an appeal is rejected?",
        answer:
          "You can submit a new application, contact the LGU for clarification on the decision, or consult with a business permit specialist. Make sure to address all the issues and provide complete, accurate information.",
      },
      {
        key: "appeal-rejected-faq-5",
        question: "Do I need to pay again to reapply?",
        answer:
          "A new application is treated as a new submission and may require payment of the applicable fees. Check the current fee schedule and payment instructions when you submit your new application.",
      },
    ],
  },
};

async function addAllBusinessOwnerFaqs() {
  try {
    const results = [];

    for (const [slotId, data] of Object.entries(faqData)) {
      // Delete existing slot if it exists
      const existing = await FaqSection.findOne({ slotId });
      if (existing) {
        logger.info(
          `FAQ slot '${slotId}' already exists. Deleting and reseeding.`,
        );
        await FaqSection.deleteOne({ slotId });
      }

      // Create new FAQ entry
      const faqEntry = {
        slotId,
        title: data.title,
        subtitle: data.subtitle,
        items: data.items,
        isPublished: true,
        draftData: {
          subtitle: data.subtitle,
          items: data.items,
        },
        publishedData: {
          subtitle: data.subtitle,
          items: data.items,
        },
      };

      await FaqSection.create(faqEntry);
      logger.info(`FAQ slot '${slotId}' added successfully`);
      results.push({ slotId, added: true });
    }

    return { results };
  } catch (err) {
    logger.error("Failed to add business owner FAQs", { error: err.message });
    throw err;
  }
}

// Run if called directly
if (require.main === module) {
  (async () => {
    try {
      await connectDB(process.env.MONGO_URI);
      const result = await addAllBusinessOwnerFaqs();
      console.log("Result:", result);
      process.exit(0);
    } catch (err) {
      console.error("Error:", err.message);
      process.exit(1);
    }
  })();
}

module.exports = { addAllBusinessOwnerFaqs };
