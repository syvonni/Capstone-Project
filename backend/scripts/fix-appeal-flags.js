const mongoose = require("mongoose");
require("dotenv").config({ path: "../../.env" });

const Application = require("../services/business-service/src/models/Application");
const BusinessProfile = require("../services/business-service/src/models/BusinessProfile");

async function fixAppealFlags(applicationId) {
  try {
    await mongoose.connect("mongodb://localhost:27017/capstone_project");
    console.log("Connected to MongoDB");

    // Find the application
    const application = await Application.findOne({ applicationId });
    if (!application) {
      console.log("Application not found");
      return;
    }

    console.log("Current application state:", {
      applicationStatus: application.applicationStatus,
      hadAppealGranted: application.hadAppealGranted,
      originalRejectionReason: application.originalRejectionReason,
      hasActiveAppeal: application.hasActiveAppeal,
      appealId: application.appealId,
      rejectionReason: application.rejectionReason,
    });

    // If approved and has appealId but no hadAppealGranted, fix it
    if (
      application.applicationStatus === "approved" &&
      application.appealId &&
      !application.hadAppealGranted
    ) {
      application.hadAppealGranted = true;
      application.hasActiveAppeal = false;
      application.appealId = "";

      // If rejectionReason exists, preserve it as originalRejectionReason
      if (application.rejectionReason && !application.originalRejectionReason) {
        application.originalRejectionReason = application.rejectionReason;
      }

      await application.save();
      console.log("Updated application:", {
        hadAppealGranted: application.hadAppealGranted,
        hasActiveAppeal: application.hasActiveAppeal,
        originalRejectionReason: application.originalRejectionReason,
      });
    }

    // Also update BusinessProfile businesses subdoc
    const businessId = application.businessId || application.applicationId;
    const profile = await BusinessProfile.findOne({
      $or: [
        { "businesses.businessId": businessId },
        {
          "businesses._id": mongoose.Types.ObjectId.isValid(businessId)
            ? new mongoose.Types.ObjectId(businessId)
            : null,
        },
      ].filter(Boolean),
    });

    if (profile) {
      const business = profile.businesses.find(
        (b) => b.businessId === businessId || String(b._id) === businessId,
      );

      if (business) {
        console.log("Current business subdoc state:", {
          applicationStatus: business.applicationStatus,
          hadAppealGranted: business.hadAppealGranted,
          originalRejectionReason: business.originalRejectionReason,
          hasActiveAppeal: business.hasActiveAppeal,
          appealId: business.appealId,
        });

        if (
          business.applicationStatus === "approved" &&
          business.appealId &&
          !business.hadAppealGranted
        ) {
          business.hadAppealGranted = true;
          business.hasActiveAppeal = false;
          business.appealId = "";

          if (business.rejectionReason && !business.originalRejectionReason) {
            business.originalRejectionReason = business.rejectionReason;
          }

          profile.markModified("businesses");
          await profile.save();
          console.log("Updated business subdoc:", {
            hadAppealGranted: business.hadAppealGranted,
            hasActiveAppeal: business.hasActiveAppeal,
            originalRejectionReason: business.originalRejectionReason,
          });
        }
      }
    }

    console.log("Done!");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

// Run with the application ID from the logs
fixAppealFlags("6a3fd8884a4bde6205ef244d");
