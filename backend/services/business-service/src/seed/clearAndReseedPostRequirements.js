/**
 * Clear and Reseed PostRequirements
 *
 * This script clears the PostRequirement collection,
 * then reseeds it with fresh data including legal basis.
 *
 * Usage:
 *   node backend/services/business-service/src/seed/clearAndReseedPostRequirements.js
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });
dotenv.config({
  path: path.resolve(__dirname, "..", "..", "..", "..", ".env"),
});

const PostRequirement = require("../models/PostRequirement");

async function clearAndReseed() {
  try {
    console.log("Connecting to MongoDB...");
    const mongoUri =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      "mongodb://localhost:27017/capstone_project";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    console.log("Starting PostRequirement collection clear and reseed...");

    // Clear collection
    console.log("Clearing PostRequirement collection...");
    await PostRequirement.deleteMany({});
    console.log("PostRequirement collection cleared");

    // Import and run the seeder
    const { seedPostRequirements } = require("./seedPostRequirements");
    console.log("Running PostRequirement seeder...");
    await seedPostRequirements();

    console.log("PostRequirements seeded successfully");
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
