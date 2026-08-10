const mongoose = require("mongoose");
const PostRequirement = require("../models/PostRequirement");

const mongoUri =
  process.env.MONGODB_URI ||
  "mongodb://capstone_app:g95fxnwa1wPDdyfA@mongodb:27017/capstone_project?authSource=admin";

mongoose
  .connect(mongoUri)
  .then(async () => {
    console.log("Connected to MongoDB");

    try {
      const count = await PostRequirement.countDocuments();
      const withCustomFields = await PostRequirement.countDocuments({
        customFields: { $exists: true, $ne: [] },
      });

      console.log(`Total post requirements: ${count}`);
      console.log(`With custom fields: ${withCustomFields}`);

      // Show a few examples
      const examples = await PostRequirement.find({
        customFields: { $exists: true, $ne: [] },
      }).limit(3);
      console.log("\nExamples of post requirements with custom fields:");
      examples.forEach((req) => {
        console.log(`- ${req.name}: ${req.customFields.length} custom fields`);
      });
    } catch (error) {
      console.error("Error:", error);
    } finally {
      await mongoose.disconnect();
      console.log("Disconnected from MongoDB");
    }
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  });
