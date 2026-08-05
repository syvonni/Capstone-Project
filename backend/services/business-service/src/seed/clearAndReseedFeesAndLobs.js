/**
 * Clear Fees and LOBs, then Reseed
 * 
 * Usage:
 *   node backend/services/business-service/src/seed/clearAndReseedFeesAndLobs.js
 */

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Only load .env files if MONGO_URI is not already set as environment variable
if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
  dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });
  dotenv.config({
    path: path.resolve(__dirname, "..", "..", "..", "..", ".env"),
  });
}

// Use environment variable if set, otherwise use .env
// Default to Docker MongoDB without authentication (matches .env)
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/capstone_project";
// Override to use Docker MongoDB without authentication for local development
const finalMongoUri = "mongodb://localhost:27017/capstone_project";
console.log('Using MONGO_URI:', finalMongoUri);

const Fee = require("../models/Fee");
const Lob = require("../models/Lob");
const Variable = require("../models/Variable");
const TaxBracket = require("../models/TaxBracket");

async function clearAndReseed() {
  try {
    console.log("Connecting to MongoDB...");
    // Use the finalMongoUri we set above
    await mongoose.connect(finalMongoUri);
    console.log("Connected to MongoDB");

    // Clear collections
    console.log("Clearing fees collection...");
    const feeResult = await Fee.deleteMany({});
    console.log(`Deleted ${feeResult.deletedCount} fees`);

    console.log("Clearing LOBs collection...");
    const lobResult = await Lob.deleteMany({});
    console.log(`Deleted ${lobResult.deletedCount} LOBs`);

    console.log("Clearing variables collection...");
    const varResult = await Variable.deleteMany({});
    console.log(`Deleted ${varResult.deletedCount} variables`);

    console.log("Clearing tax brackets collection...");
    const taxResult = await TaxBracket.deleteMany({});
    console.log(`Deleted ${taxResult.deletedCount} tax brackets`);

    // Reseed
    console.log("\nReseeding fees...");
    const { seedIfEmpty: seedFees } = require("./seedFees");
    const feeSeedResult = await seedFees();
    console.log(`Fees seeded: ${feeSeedResult.count}`);

    console.log("Reseeding variables...");
    const { seedIfEmpty: seedVariables } = require("./seedVariables");
    const varSeedResult = await seedVariables();
    console.log(`Variables seeded: ${varSeedResult.count}`);

    console.log("Reseeding LOBs...");
    const { seedIfEmpty: seedLobs } = require("./seedLobs");
    const lobSeedResult = await seedLobs();
    console.log(`LOBs seeded: ${lobSeedResult.count}`);

    console.log("Reseeding tax brackets...");
    const { seedTaxBrackets } = require("./seedTaxBrackets");
    await seedTaxBrackets();
    console.log(`Tax brackets seeded`);
    // Reconnect since seedTaxBrackets disconnects
    await mongoose.connect(finalMongoUri);
    console.log("Reconnected to MongoDB");

    console.log("\nClear and reseed completed successfully!");
  } catch (error) {
    console.error("Error during clear and reseed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

clearAndReseed();
