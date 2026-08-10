const mongoose = require("mongoose");
const PostRequirement = require("../models/PostRequirement");
const Checklist = require("../models/Checklist");

async function updatePostRequirementChecklists() {
  try {
    const mongoUri =
      process.env.MONGO_URI ||
      "mongodb://capstone_app:g95fxnwa1wPDdyfA@mongodb:27017/capstone_project?authSource=admin";
    console.log(`Connecting to MongoDB: ${mongoUri}`);
    await mongoose.connect(mongoUri);

    // Post requirement code to checklist ID mapping (from seeder output)
    // Only include post requirements that actually exist in the database
    const POST_REQUIREMENT_CHECKLIST_MAP = {
      "fda-lto": "6a67221dadb6fc4b46453b4e",
      ecc: "6a67221dadb6fc4b46453b52",
      "bir-authority-to-print": "6a67221dadb6fc4b46453b54",
    };

    // Load all post requirements
    const postRequirements = await PostRequirement.find({ isActive: true });
    let updatedCount = 0;

    for (const pr of postRequirements) {
      const checklistId = POST_REQUIREMENT_CHECKLIST_MAP[pr.code];

      if (checklistId && pr.checklistId?.toString() !== checklistId) {
        pr.checklistId = new mongoose.Types.ObjectId(checklistId);
        await pr.save();
        console.log(
          `Updated PostRequirement: ${pr.code} with checklistId: ${checklistId}`,
        );
        updatedCount++;
      }
    }

    console.log(
      `Updated ${updatedCount} post requirements with checklist associations`,
    );
    await mongoose.disconnect();
    return { updatedCount };
  } catch (err) {
    console.error("Error updating post requirement checklists:", err);
    await mongoose.disconnect();
    throw err;
  }
}

module.exports = { updatePostRequirementChecklists };

// Run if called directly
if (require.main === module) {
  updatePostRequirementChecklists().catch(console.error);
}
