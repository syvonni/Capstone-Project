/**
 * Clear and Reseed Claimable Documents
 *
 * This script clears the ClaimableDocument and PostDocument collections,
 * then reseeds them with fresh data.
 *
 * Usage:
 *   node backend/services/business-service/src/seed/clearAndReseedClaimableDocuments.js
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });
dotenv.config({
  path: path.resolve(__dirname, "..", "..", "..", "..", ".env"),
});

const ClaimableDocument = require("../models/ClaimableDocument");
const PostDocument = require("../models/PostDocument");

async function clearAndReseed() {
  try {
    console.log("Connecting to MongoDB...");
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/capstone_project";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    console.log("Starting document collection clear and reseed...");

    // Clear collections
    console.log("Clearing ClaimableDocument collection...");
    await ClaimableDocument.deleteMany({});
    console.log("ClaimableDocument collection cleared");

    console.log("Clearing PostDocument collection...");
    await PostDocument.deleteMany({});
    console.log("PostDocument collection cleared");

    // Import and run the seeder
    const { seedIfEmpty } = require("./seedClaimableDocumentsClean");
    console.log("Running document seeder...");
    const result = await seedIfEmpty();

    if (result.seeded) {
      console.log("Documents seeded successfully");
    } else {
      console.error("Document seeding failed:", result.error);
    }

    console.log("Clear and reseed completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Clear and reseed failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

clearAndReseed();
