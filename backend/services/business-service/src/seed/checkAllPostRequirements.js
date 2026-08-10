const mongoose = require("mongoose");
const PostRequirement = require("../models/PostRequirement");

async function checkAllPostRequirements() {
  try {
    const mongoUri =
      process.env.MONGO_URI ||
      "mongodb://capstone_app:g95fxnwa1wPDdyfA@mongodb:27017/capstone_project?authSource=admin";
    console.log(`Connecting to MongoDB: ${mongoUri}`);
    await mongoose.connect(mongoUri);

    const postRequirements = await PostRequirement.find({ isActive: true });

    console.log(`Found ${postRequirements.length} post requirements`);
    postRequirements.forEach((pr) => {
      console.log(`Code: ${pr.code}, checklistId: ${pr.checklistId}`);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error checking post requirements:", err);
    await mongoose.disconnect();
    throw err;
  }
}

module.exports = { checkAllPostRequirements };

if (require.main === module) {
  checkAllPostRequirements().catch(console.error);
}
