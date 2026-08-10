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
      // Find all post requirements that don't have a customFields field
      const requirementsWithoutCustomFields = await PostRequirement.find({
        customFields: { $exists: false },
      });

      console.log(
        `Found ${requirementsWithoutCustomFields.length} post requirements without customFields field`,
      );

      if (requirementsWithoutCustomFields.length === 0) {
        console.log(
          "No post requirements without customFields field found. Migration complete.",
        );
        await mongoose.disconnect();
        return;
      }

      // Add the customFields field with empty array to each document
      const updatePromises = requirementsWithoutCustomFields.map(
        (requirement) => {
          return PostRequirement.updateOne(
            { _id: requirement._id },
            { $set: { customFields: [] } },
          );
        },
      );

      const results = await Promise.all(updatePromises);

      console.log(
        `Successfully added customFields field to ${results.length} post requirements`,
      );

      // Verify the changes
      const remainingWithoutCustomFields = await PostRequirement.countDocuments(
        { customFields: { $exists: false } },
      );
      console.log(
        `Post requirements still without customFields field: ${remainingWithoutCustomFields}`,
      );

      if (remainingWithoutCustomFields === 0) {
        console.log("Migration completed successfully!");
      } else {
        console.log(
          "Warning: Some post requirements still don't have customFields field",
        );
      }
    } catch (error) {
      console.error("Error during migration:", error);
    } finally {
      await mongoose.disconnect();
    }
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  });
