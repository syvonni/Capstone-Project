const mongoose = require("mongoose");

const mongoUri =
  process.env.MONGODB_URI ||
  "mongodb://capstone_app:g95fxnwa1wPDdyfA@mongodb:27017/capstone_project?authSource=admin";

mongoose
  .connect(mongoUri)
  .then(async () => {
    console.log("Connected to MongoDB");

    try {
      // Drop postrequirements collection
      const postRequirementsExists = await mongoose.connection.db
        .listCollections({ name: "postrequirements" })
        .toArray();
      if (postRequirementsExists.length > 0) {
        await mongoose.connection.db.collection("postrequirements").drop();
        console.log("✓ Dropped postrequirements collection");
      } else {
        console.log("ℹ postrequirements collection does not exist, skipping");
      }

      console.log("\n✓ Post requirements collection dropped successfully");
    } catch (error) {
      console.error("Error dropping collection:", error);
      process.exit(1);
    } finally {
      await mongoose.disconnect();
      console.log("Disconnected from MongoDB");
    }
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  });
