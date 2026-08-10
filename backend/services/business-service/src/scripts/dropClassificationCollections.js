const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config({
  path: require("path").join(__dirname, "..", "..", "..", "..", ".env"),
});

const MONGO_URI =
  process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MONGO_URL;

async function dropCollections() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    // Drop classificationfees collection
    const classificationFeesExists = await mongoose.connection.db
      .listCollections({ name: "classificationfees" })
      .toArray();
    if (classificationFeesExists.length > 0) {
      await mongoose.connection.db.collection("classificationfees").drop();
      console.log("✓ Dropped classificationfees collection");
    } else {
      console.log("ℹ classificationfees collection does not exist, skipping");
    }

    // Drop classifications collection
    const classificationsExists = await mongoose.connection.db
      .listCollections({ name: "classifications" })
      .toArray();
    if (classificationsExists.length > 0) {
      await mongoose.connection.db.collection("classifications").drop();
      console.log("✓ Dropped classifications collection");
    } else {
      console.log("ℹ classifications collection does not exist, skipping");
    }

    console.log("\n✓ Classification collections dropped successfully");
  } catch (error) {
    console.error("Error dropping collections:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

dropCollections();
