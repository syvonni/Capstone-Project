const mongoose = require("mongoose");
const BusinessProfile = require("../services/business-service/src/models/BusinessProfile");
const User = require("../services/business-service/src/models/User");

async function migrate() {
  const MONGO_URI =
    process.env.MONGO_URI ||
    "mongodb://capstone_app:g95fxnwa1wPDdyfA@localhost:27017/capstone_project?authSource=admin";
  const FIELD_ENCRYPTION_KEY =
    process.env.FIELD_ENCRYPTION_KEY ||
    "f511ec5d84065eeae29eb66bc8cdca1d2b9bd5817baf6aa7cc0ec0012bf7e8e8";

  process.env.FIELD_ENCRYPTION_KEY = FIELD_ENCRYPTION_KEY;

  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 30000 });
  console.log("Connected");

  const cursor = BusinessProfile.find({}).cursor();
  let updatedCount = 0;
  let businessCount = 0;

  for await (const profile of cursor) {
    if (!profile.userId) continue;

    // Fetch owner user (NOT lean) to get decrypted names
    const ownerUser = await User.findById(profile.userId).select(
      "firstName lastName fullName",
    );
    const ownerName =
      ownerUser?.fullName ||
      (ownerUser?.firstName && ownerUser?.lastName
        ? `${ownerUser.firstName} ${ownerUser.lastName}`.trim()
        : null) ||
      ownerUser?.firstName ||
      "";

    if (!ownerName) {
      console.log(`Skipping profile ${profile._id} - no owner name found`);
      continue;
    }

    let needsUpdate = false;
    const updates = {};

    for (let i = 0; i < profile.businesses.length; i++) {
      const business = profile.businesses[i];
      businessCount++;

      // Set ownerName if missing
      if (!business.ownerName || business.ownerName === "") {
        updates[`businesses.${i}.ownerName`] = ownerName;
        needsUpdate = true;
      }

      // Set reviewedByName if reviewedBy exists but reviewedByName is missing
      if (
        business.reviewedBy &&
        (!business.reviewedByName || business.reviewedByName === "")
      ) {
        const reviewer = await User.findById(business.reviewedBy).select(
          "firstName lastName fullName",
        );
        const reviewerName =
          reviewer?.fullName ||
          (reviewer?.firstName && reviewer?.lastName
            ? `${reviewer.firstName} ${reviewer.lastName}`.trim()
            : null) ||
          reviewer?.firstName ||
          "";

        if (reviewerName) {
          updates[`businesses.${i}.reviewedByName`] = reviewerName;
          needsUpdate = true;
        }
      }
    }

    if (needsUpdate) {
      await BusinessProfile.updateOne({ _id: profile._id }, { $set: updates });
      updatedCount++;
      console.log(
        `Updated profile ${profile._id} with ownerName: ${ownerName}`,
      );
    }
  }

  console.log(`\nMigration complete:`);
  console.log(`- Updated ${updatedCount} profiles`);
  console.log(`- Processed ${businessCount} businesses`);

  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
