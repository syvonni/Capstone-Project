const mongoose = require("mongoose");
const ClaimableDocument = require("../models/ClaimableDocument");
const path = require("path");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });
dotenv.config({
  path: path.resolve(__dirname, "..", "..", "..", "..", ".env"),
});

// Load the seed file and extract REQUIREMENTS_SEED_DATA
const seedFile = require("./seedClaimableDocumentsClean");
const REQUIREMENTS_SEED_DATA = seedFile.REQUIREMENTS_SEED_DATA;

async function backfillTemplateTexts() {
  try {
    // Connect to MongoDB
    const mongoUri =
      process.env.MONGO_URI ||
      "mongodb://capstone_app:devapppass@mongodb:27017/capstone_project?authSource=admin";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    let updatedCount = 0;
    let skippedCount = 0;

    for (const seedData of REQUIREMENTS_SEED_DATA) {
      const existingDoc = await ClaimableDocument.findOne({
        customId: seedData.customId,
      });

      if (!existingDoc) {
        console.log(`Document not found for customId: ${seedData.customId}`);
        skippedCount++;
        continue;
      }

      // Check if templateTexts exists and has data
      if (existingDoc.templateTexts && existingDoc.templateTexts.length > 0) {
        console.log(
          `Document ${seedData.name} already has templateTexts, skipping`,
        );
        skippedCount++;
        continue;
      }

      // Update with templateTexts from seed data
      await ClaimableDocument.updateOne(
        { _id: existingDoc._id },
        { $set: { templateTexts: seedData.templateTexts } },
      );

      console.log(
        `Updated ${seedData.name} with ${seedData.templateTexts.length} templateTexts`,
      );
      updatedCount++;
    }

    console.log(
      `\nBackfill complete: ${updatedCount} updated, ${skippedCount} skipped`,
    );
  } catch (error) {
    console.error("Backfill failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

async function forceUpdateAccountClearance() {
  try {
    // Connect to MongoDB
    const mongoUri =
      process.env.MONGO_URI ||
      "mongodb://capstone_app:devapppass@mongodb:27017/capstone_project?authSource=admin";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    const seedData = REQUIREMENTS_SEED_DATA.find(
      (d) => d.customId === "account-clearance",
    );
    if (!seedData) {
      console.log("Account Clearance seed data not found");
      process.exit(1);
    }

    const existingDoc = await ClaimableDocument.findOne({
      customId: "account-clearance",
    });
    if (!existingDoc) {
      console.log("Account Clearance document not found");
      process.exit(1);
    }

    // Force update with templateTexts from seed data
    await ClaimableDocument.updateOne(
      { _id: existingDoc._id },
      { $set: { templateTexts: seedData.templateTexts } },
    );

    console.log(
      `Force updated Account Clearance with ${seedData.templateTexts.length} templateTexts`,
    );
  } catch (error) {
    console.error("Force update failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

async function forceUpdateAllDocuments() {
  try {
    // Connect to MongoDB
    const mongoUri =
      process.env.MONGO_URI ||
      "mongodb://capstone_app:devapppass@mongodb:27017/capstone_project?authSource=admin";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    let updatedCount = 0;

    for (const seedData of REQUIREMENTS_SEED_DATA) {
      const existingDoc = await ClaimableDocument.findOne({
        customId: seedData.customId,
      });

      if (!existingDoc) {
        console.log(`Document not found for customId: ${seedData.customId}`);
        continue;
      }

      // Force update with templateTexts from seed data
      await ClaimableDocument.updateOne(
        { _id: existingDoc._id },
        { $set: { templateTexts: seedData.templateTexts } },
      );

      console.log(
        `Force updated ${seedData.name} with ${seedData.templateTexts.length} templateTexts`,
      );
      updatedCount++;
    }

    console.log(`\nForce update complete: ${updatedCount} documents updated`);
  } catch (error) {
    console.error("Force update failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
console.log("Command line args:", args);
if (args.includes("--force-all")) {
  console.log("Running force update for all documents");
  forceUpdateAllDocuments();
} else if (args.includes("--force-account-clearance")) {
  console.log("Running force update for Account Clearance");
  forceUpdateAccountClearance();
} else {
  console.log("Running regular backfill");
  backfillTemplateTexts();
}
