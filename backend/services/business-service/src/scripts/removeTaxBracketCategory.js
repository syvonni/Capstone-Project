const mongoose = require("mongoose");
const TaxBracket = require("../models/TaxBracket");

const mongoUri =
  process.env.MONGODB_URI ||
  "mongodb://capstone_app:g95fxnwa1wPDdyfA@mongodb:27017/capstone_project?authSource=admin";

mongoose
  .connect(mongoUri)
  .then(async () => {
    console.log("Connected to MongoDB");

    try {
      // Find all tax brackets that have a category field
      const bracketsWithCategory = await TaxBracket.find({
        category: { $exists: true },
      });

      console.log(
        `Found ${bracketsWithCategory.length} tax brackets with category field`,
      );

      if (bracketsWithCategory.length === 0) {
        console.log(
          "No tax brackets with category field found. Migration complete.",
        );
        await mongoose.disconnect();
        return;
      }

      // Remove the category field from each document
      const updatePromises = bracketsWithCategory.map((bracket) => {
        return TaxBracket.updateOne(
          { _id: bracket._id },
          { $unset: { category: 1 } },
        );
      });

      const results = await Promise.all(updatePromises);

      console.log(
        `Successfully removed category field from ${results.length} tax brackets`,
      );

      // Verify the changes
      const remainingWithCategory = await TaxBracket.countDocuments({
        category: { $exists: true },
      });
      console.log(
        `Tax brackets still with category field: ${remainingWithCategory}`,
      );

      if (remainingWithCategory === 0) {
        console.log("Migration completed successfully!");
      } else {
        console.log("Warning: Some tax brackets still have category field");
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
