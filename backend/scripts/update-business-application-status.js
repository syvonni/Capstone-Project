const mongoose = require("mongoose");
require("dotenv").config({ path: "../../.env" });

const Business = require("../services/business-service/src/models/Business");

async function updateBusinessApplicationStatus() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://mongodb:27017/capstone",
    );
    console.log("Connected to MongoDB");

    const result = await Business.updateMany(
      { applicationStatus: { $exists: false } },
      { $set: { applicationStatus: "approved" } },
    );

    console.log(
      `Updated ${result.modifiedCount} businesses to approved status`,
    );
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

updateBusinessApplicationStatus();
