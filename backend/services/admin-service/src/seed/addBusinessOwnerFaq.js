/**
 * Add business-owner-application-faq slot to existing CMS FAQ collection.
 * This script adds the new FAQ entry without clearing existing data.
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

async function addBusinessOwnerFaq() {
  try {
    // Delete existing slot if it exists to allow reseeding
    const existing = await FaqSection.findOne({
      slotId: "business-owner-application-faq",
    });
    if (existing) {
      logger.info(
        "FAQ slot 'business-owner-application-faq' already exists. Deleting and reseeding.",
      );
      await FaqSection.deleteOne({ slotId: "business-owner-application-faq" });
    }

    const faqEntry = {
      slotId: "business-owner-application-faq",
      title: "Frequently Asked Questions",
      subtitle: "Quick answers about your pending application status.",
      items: [
        {
          key: "faq-1",
          question: "How long does the review process take?",
          answer:
            "The review process typically takes 3-5 business days after your application is assigned to an LGU officer. Submitted applications are usually assigned within 24 hours. Officer assessment takes 3-5 business days. If revisions are needed, additional time depends on how quickly you respond. Once approved, permit issuance happens within 1-2 business days after payment.",
        },
        {
          key: "faq-2",
          question: "What happens if revisions are needed?",
          answer:
            "You'll receive specific instructions about what needs to be updated. You'll get an email notification with required changes. Log in to your dashboard to see detailed feedback. Update the requested sections and resubmit. Your application returns to the review queue. No additional fees for resubmission.",
        },
        {
          key: "faq-3",
          question: "My application was rejected. What should I do?",
          answer:
            "If your application was rejected, you have several options: File an appeal if you believe the rejection was made in error (within 30 days), submit a new application addressing the issues, contact the LGU for clarification, or review requirements to ensure compliance. Common rejection reasons include incomplete documents, incorrect information, or non-compliance with zoning laws.",
        },
        {
          key: "faq-4",
          question: "How do I file an appeal for a rejected application?",
          answer:
            "The appeal process allows you to challenge a rejection decision. File within 30 days of rejection date. Types of appeals include rejection appeal, wrong assessment, or other grounds. Provide a detailed explanation of why you believe the decision was incorrect. Include supporting documents that support your appeal. Appeals are reviewed by a different officer or supervisor. Possible outcomes: appeal approved (application returned for review) or appeal rejected (final decision).",
        },
        {
          key: "faq-5",
          question: "What does 'Action Required' status mean?",
          answer:
            "'Action Required' means the LGU officer needs you to make corrections. Check your email for detailed feedback about required changes. Review the 'Issues Identified' section in your application. Update the specific fields or documents requested. Resubmit quickly for faster approval. Revisions are normal and don't affect your application negatively.",
        },
        {
          key: "faq-6",
          question: "Why was my document marked as 'Not uploaded'?",
          answer:
            "This usually happens due to technical issues during upload: upload interrupted (internet connection lost), file too large (exceeds 5MB limit), unsupported format (use PDF, JPG, PNG), or browser issues. Solution: re-upload the document in the required format.",
        },
        {
          key: "faq-7",
          question:
            "How can I contact the LGU officer reviewing my application?",
          answer:
            "Once your application is assigned to an officer, you have several options: email using the contact information shown in your application details, call the LGU office during business hours (8 AM - 5 PM, Mon-Fri), visit the Business Permit Office at City Hall, or use the messaging feature in your application dashboard.",
        },
        {
          key: "faq-8",
          question: "What documents are required for my application?",
          answer:
            "Required documents vary by business type. All businesses need valid government ID, Barangay Clearance, and DTI/SEC/CDA Registration. Rented spaces need a lease contract or proof of address. Owned property needs land title or tax declaration. Special permits may require health, fire, or environmental clearances.",
        },
        {
          key: "faq-9",
          question: "What happens after my application is approved?",
          answer:
            "Congratulations! You'll receive an approval notice via email. Payment instructions will be sent (online, bank, or in-person options). Payment must be completed within 15 days of approval. Once paid, your business permit will be issued. Display your permit prominently at your business location.",
        },
        {
          key: "faq-10",
          question:
            "My application shows 'Under Review' for a long time. Is this normal?",
          answer:
            "Review times can vary based on several factors. Normal timeframe is 3-5 business days. May take longer during peak periods or renewal seasons. Complex applications may require additional review. Delays can occur if documents need verification. Contact LGU after 7 business days if no update.",
        },
        {
          key: "faq-11",
          question: "Can I withdraw my application after submission?",
          answer:
            "Yes, you can withdraw your application under certain conditions. Before approval, you can withdraw anytime. After approval, withdrawal may require additional processing. Fees may be non-refundable depending on processing stage. Contact LGU office or use the withdrawal feature in your dashboard. You can submit a new application later if needed.",
        },
        {
          key: "faq-12",
          question:
            "What if I need to change my business information after submission?",
          answer:
            "Changes after submission require careful handling. Minor changes: wait for the review process to request corrections. Major changes: may require withdrawing and resubmitting. Business details like address, name, or type changes need new verification. Contact LGU to discuss significant changes with the reviewing officer. Be prepared to provide supporting documents for changes.",
        },
        {
          key: "faq-13",
          question:
            "Why was my application returned for additional information?",
          answer:
            "Applications are returned when clarification is needed: unclear information needs better explanation, missing documents not provided, inconsistent data across sections, documents require additional validation. Provide requested information promptly to avoid delays.",
        },
        {
          key: "faq-14",
          question: "What if I miss the payment deadline after approval?",
          answer:
            "Missing the payment deadline has consequences. Payment is required within 15 days of approval. Some LGUs offer a 3-day grace period. After the deadline, approval may be revoked. You may need to start the process again. Contact LGU immediately if you anticipate payment issues.",
        },
        {
          key: "faq-15",
          question: "How do I check the status of my appeal?",
          answer:
            "Appeal status tracking is available in your dashboard. Check the 'Appeal' section of your application. You'll receive email notifications for status changes. Appeal stages: Submitted → Under Review → Decision. Appeals typically take 5-7 business days. Follow up with LGU if no update after 10 business days.",
        },
      ],
      isPublished: true,
      draftData: {
        subtitle: "Quick answers about your pending application status.",
        items: [
          {
            key: "faq-1",
            question: "How long does the review process take?",
            answer:
              "The review process typically takes 3-5 business days after your application is assigned to an LGU officer. Submitted applications are usually assigned within 24 hours. Officer assessment takes 3-5 business days. If revisions are needed, additional time depends on how quickly you respond. Once approved, permit issuance happens within 1-2 business days after payment.",
          },
          {
            key: "faq-2",
            question: "What happens if revisions are needed?",
            answer:
              "You'll receive specific instructions about what needs to be updated. You'll get an email notification with required changes. Log in to your dashboard to see detailed feedback. Update the requested sections and resubmit. Your application returns to the review queue. No additional fees for resubmission.",
          },
          {
            key: "faq-3",
            question: "My application was rejected. What should I do?",
            answer:
              "If your application was rejected, you have several options: File an appeal if you believe the rejection was made in error (within 30 days), submit a new application addressing the issues, contact the LGU for clarification, or review requirements to ensure compliance. Common rejection reasons include incomplete documents, incorrect information, or non-compliance with zoning laws.",
          },
          {
            key: "faq-4",
            question: "How do I file an appeal for a rejected application?",
            answer:
              "The appeal process allows you to challenge a rejection decision. File within 30 days of rejection date. Types of appeals include rejection appeal, wrong assessment, or other grounds. Provide a detailed explanation of why you believe the decision was incorrect. Include supporting documents that support your appeal. Appeals are reviewed by a different officer or supervisor. Possible outcomes: appeal approved (application returned for review) or appeal rejected (final decision).",
          },
          {
            key: "faq-5",
            question: "What does 'Action Required' status mean?",
            answer:
              "'Action Required' means the LGU officer needs you to make corrections. Check your email for detailed feedback about required changes. Review the 'Issues Identified' section in your application. Update the specific fields or documents requested. Resubmit quickly for faster approval. Revisions are normal and don't affect your application negatively.",
          },
          {
            key: "faq-6",
            question: "Why was my document marked as 'Not uploaded'?",
            answer:
              "This usually happens due to technical issues during upload: upload interrupted (internet connection lost), file too large (exceeds 5MB limit), unsupported format (use PDF, JPG, PNG), or browser issues. Solution: re-upload the document in the required format.",
          },
          {
            key: "faq-7",
            question:
              "How can I contact the LGU officer reviewing my application?",
            answer:
              "Once your application is assigned to an officer, you have several options: email using the contact information shown in your application details, call the LGU office during business hours (8 AM - 5 PM, Mon-Fri), visit the Business Permit Office at City Hall, or use the messaging feature in your application dashboard.",
          },
          {
            key: "faq-8",
            question: "What documents are required for my application?",
            answer:
              "Required documents vary by business type. All businesses need valid government ID, Barangay Clearance, and DTI/SEC/CDA Registration. Rented spaces need a lease contract or proof of address. Owned property needs land title or tax declaration. Special permits may require health, fire, or environmental clearances.",
          },
          {
            key: "faq-9",
            question: "What happens after my application is approved?",
            answer:
              "Congratulations! You'll receive an approval notice via email. Payment instructions will be sent (online, bank, or in-person options). Payment must be completed within 15 days of approval. Once paid, your business permit will be issued. Display your permit prominently at your business location.",
          },
          {
            key: "faq-10",
            question:
              "My application shows 'Under Review' for a long time. Is this normal?",
            answer:
              "Review times can vary based on several factors. Normal timeframe is 3-5 business days. May take longer during peak periods or renewal seasons. Complex applications may require additional review. Delays can occur if documents need verification. Contact LGU after 7 business days if no update.",
          },
          {
            key: "faq-11",
            question: "Can I withdraw my application after submission?",
            answer:
              "Yes, you can withdraw your application under certain conditions. Before approval, you can withdraw anytime. After approval, withdrawal may require additional processing. Fees may be non-refundable depending on processing stage. Contact LGU office or use the withdrawal feature in your dashboard. You can submit a new application later if needed.",
          },
          {
            key: "faq-12",
            question:
              "What if I need to change my business information after submission?",
            answer:
              "Changes after submission require careful handling. Minor changes: wait for the review process to request corrections. Major changes: may require withdrawing and resubmitting. Business details like address, name, or type changes need new verification. Contact LGU to discuss significant changes with the reviewing officer. Be prepared to provide supporting documents for changes.",
          },
          {
            key: "faq-13",
            question:
              "Why was my application returned for additional information?",
            answer:
              "Applications are returned when clarification is needed: unclear information needs better explanation, missing documents not provided, inconsistent data across sections, documents require additional validation. Provide requested information promptly to avoid delays.",
          },
          {
            key: "faq-14",
            question: "What if I miss the payment deadline after approval?",
            answer:
              "Missing the payment deadline has consequences. Payment is required within 15 days of approval. Some LGUs offer a 3-day grace period. After the deadline, approval may be revoked. You may need to start the process again. Contact LGU immediately if you anticipate payment issues.",
          },
          {
            key: "faq-15",
            question: "How do I check the status of my appeal?",
            answer:
              "Appeal status tracking is available in your dashboard. Check the 'Appeal' section of your application. You'll receive email notifications for status changes. Appeal stages: Submitted → Under Review → Decision. Appeals typically take 5-7 business days. Follow up with LGU if no update after 10 business days.",
          },
        ],
      },
      publishedData: {
        subtitle: "Quick answers about your pending application status.",
        items: [
          {
            key: "faq-1",
            question: "How long does the review process take?",
            answer:
              "The review process typically takes 3-5 business days after your application is assigned to an LGU officer. Submitted applications are usually assigned within 24 hours. Officer assessment takes 3-5 business days. If revisions are needed, additional time depends on how quickly you respond. Once approved, permit issuance happens within 1-2 business days after payment.",
          },
          {
            key: "faq-2",
            question: "What happens if revisions are needed?",
            answer:
              "You'll receive specific instructions about what needs to be updated. You'll get an email notification with required changes. Log in to your dashboard to see detailed feedback. Update the requested sections and resubmit. Your application returns to the review queue. No additional fees for resubmission.",
          },
          {
            key: "faq-3",
            question: "My application was rejected. What should I do?",
            answer:
              "If your application was rejected, you have several options: File an appeal if you believe the rejection was made in error (within 30 days), submit a new application addressing the issues, contact the LGU for clarification, or review requirements to ensure compliance. Common rejection reasons include incomplete documents, incorrect information, or non-compliance with zoning laws.",
          },
          {
            key: "faq-4",
            question: "How do I file an appeal for a rejected application?",
            answer:
              "The appeal process allows you to challenge a rejection decision. File within 30 days of rejection date. Types of appeals include rejection appeal, wrong assessment, or other grounds. Provide a detailed explanation of why you believe the decision was incorrect. Include supporting documents that support your appeal. Appeals are reviewed by a different officer or supervisor. Possible outcomes: appeal approved (application returned for review) or appeal rejected (final decision).",
          },
          {
            key: "faq-5",
            question: "What does 'Action Required' status mean?",
            answer:
              "'Action Required' means the LGU officer needs you to make corrections. Check your email for detailed feedback about required changes. Review the 'Issues Identified' section in your application. Update the specific fields or documents requested. Resubmit quickly for faster approval. Revisions are normal and don't affect your application negatively.",
          },
          {
            key: "faq-6",
            question: "Why was my document marked as 'Not uploaded'?",
            answer:
              "This usually happens due to technical issues during upload: upload interrupted (internet connection lost), file too large (exceeds 5MB limit), unsupported format (use PDF, JPG, PNG), or browser issues. Solution: re-upload the document in the required format.",
          },
          {
            key: "faq-7",
            question:
              "How can I contact the LGU officer reviewing my application?",
            answer:
              "Once your application is assigned to an officer, you have several options: email using the contact information shown in your application details, call the LGU office during business hours (8 AM - 5 PM, Mon-Fri), visit the Business Permit Office at City Hall, or use the messaging feature in your application dashboard.",
          },
          {
            key: "faq-8",
            question: "What documents are required for my application?",
            answer:
              "Required documents vary by business type. All businesses need valid government ID, Barangay Clearance, and DTI/SEC/CDA Registration. Rented spaces need a lease contract or proof of address. Owned property needs land title or tax declaration. Special permits may require health, fire, or environmental clearances.",
          },
          {
            key: "faq-9",
            question: "What happens after my application is approved?",
            answer:
              "Congratulations! You'll receive an approval notice via email. Payment instructions will be sent (online, bank, or in-person options). Payment must be completed within 15 days of approval. Once paid, your business permit will be issued. Display your permit prominently at your business location.",
          },
          {
            key: "faq-10",
            question:
              "My application shows 'Under Review' for a long time. Is this normal?",
            answer:
              "Review times can vary based on several factors. Normal timeframe is 3-5 business days. May take longer during peak periods or renewal seasons. Complex applications may require additional review. Delays can occur if documents need verification. Contact LGU after 7 business days if no update.",
          },
          {
            key: "faq-11",
            question: "Can I withdraw my application after submission?",
            answer:
              "Yes, you can withdraw your application under certain conditions. Before approval, you can withdraw anytime. After approval, withdrawal may require additional processing. Fees may be non-refundable depending on processing stage. Contact LGU office or use the withdrawal feature in your dashboard. You can submit a new application later if needed.",
          },
          {
            key: "faq-12",
            question:
              "What if I need to change my business information after submission?",
            answer:
              "Changes after submission require careful handling. Minor changes: wait for the review process to request corrections. Major changes: may require withdrawing and resubmitting. Business details like address, name, or type changes need new verification. Contact LGU to discuss significant changes with the reviewing officer. Be prepared to provide supporting documents for changes.",
          },
          {
            key: "faq-13",
            question:
              "Why was my application returned for additional information?",
            answer:
              "Applications are returned when clarification is needed: unclear information needs better explanation, missing documents not provided, inconsistent data across sections, documents require additional validation. Provide requested information promptly to avoid delays.",
          },
          {
            key: "faq-14",
            question: "What if I miss the payment deadline after approval?",
            answer:
              "Missing the payment deadline has consequences. Payment is required within 15 days of approval. Some LGUs offer a 3-day grace period. After the deadline, approval may be revoked. You may need to start the process again. Contact LGU immediately if you anticipate payment issues.",
          },
          {
            key: "faq-15",
            question: "How do I check the status of my appeal?",
            answer:
              "Appeal status tracking is available in your dashboard. Check the 'Appeal' section of your application. You'll receive email notifications for status changes. Appeal stages: Submitted → Under Review → Decision. Appeals typically take 5-7 business days. Follow up with LGU if no update after 10 business days.",
          },
        ],
      },
    };

    await FaqSection.create(faqEntry);
    logger.info("Business owner application FAQ added successfully");
    return { added: true, slotId: "business-owner-application-faq" };
  } catch (err) {
    logger.error("Failed to add business owner FAQ", { error: err.message });
    throw err;
  }
}

// Run if called directly
if (require.main === module) {
  (async () => {
    try {
      await connectDB();
      const result = await addBusinessOwnerFaq();
      console.log("Result:", result);
      process.exit(0);
    } catch (err) {
      console.error("Error:", err.message);
      process.exit(1);
    }
  })();
}

module.exports = { addBusinessOwnerFaq };
