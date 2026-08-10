const mongoose = require("mongoose");
const { seedPostRequirements } = require("./seedPostRequirements");

// Connect to MongoDB - use environment variable from container
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI environment variable is not set");
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    return seedPostRequirements();
  })
  .then((result) => {
    console.log("Seed completed:", result);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
