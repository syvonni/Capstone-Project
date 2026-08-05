const mongoose = require("mongoose");

mongoose
  .connect(
    "mongodb://capstone_app:g95fxnwa1wPDdyfA@mongodb:27017/capstone_project?authSource=admin",
  )
  .then(async () => {
    console.log("Connected");
    const BusinessProfile = require("./services/business-service/src/models/BusinessProfile");
    const businessId = "6a3fd8884a4bde6205ef244d";
    const profiles = await BusinessProfile.find({});
    console.log("Total profiles:", profiles.length);

    for (const profile of profiles) {
      const business = profile.businesses.find(
        (b) => b.businessId === businessId || String(b._id) === businessId,
      );

      if (business) {
        console.log("Found business in profile:", profile.userId);
        console.log("Current state:", {
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
          console.log("Updated business subdoc");
        }
        break;
      }
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
