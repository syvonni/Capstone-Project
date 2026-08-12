const mongoose = require("mongoose");
const ClaimableDocument = require("../../../../shared/models/ClaimableDocument");
const path = require("path");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });
dotenv.config({
  path: path.resolve(__dirname, "..", "..", "..", "..", ".env"),
});

async function verifyTemplateTexts() {
  try {
    const mongoUri =
      process.env.MONGO_URI ||
      "mongodb://capstone_app:devapppass@mongodb:27017/capstone_project?authSource=admin";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    const docs = await ClaimableDocument.find(
      {},
      { name: 1, templateTexts: 1, checklistId: 1 },
    ).sort({ name: 1 });

    console.log(`\nFound ${docs.length} claimable documents:\n`);

    for (const doc of docs) {
      const hasTemplateTexts =
        doc.templateTexts && doc.templateTexts.length > 0;
      const hasChecklist = doc.checklistId && doc.checklistId !== null;

      console.log(`${doc.name}:`);
      console.log(
        `  - templateTexts: ${hasTemplateTexts ? `${doc.templateTexts.length} items` : "NONE"}`,
      );
      console.log(`  - checklistId: ${hasChecklist ? "SET" : "NONE"}`);

      if (hasTemplateTexts) {
        console.log(
          `  - Sample attributes: ${doc.templateTexts
            .slice(0, 2)
            .map((t) => t.attributeName)
            .join(", ")}`,
        );
      }
      console.log("");
    }

    const withTemplateTexts = docs.filter(
      (d) => d.templateTexts && d.templateTexts.length > 0,
    ).length;
    const withChecklist = docs.filter(
      (d) => d.checklistId && d.checklistId !== null,
    ).length;

    console.log(`\nSummary:`);
    console.log(
      `  - Documents with templateTexts: ${withTemplateTexts}/${docs.length}`,
    );
    console.log(
      `  - Documents with checklistId: ${withChecklist}/${docs.length}`,
    );
  } catch (error) {
    console.error("Verification failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  }
}

verifyTemplateTexts();
