/**
 * Fix Claimable Document Names - Remove " Fee" suffix
 *
 * This script removes the " Fee" suffix from all claimable document names.
 * Uses the existing mongoose connection from business-service.
 */

const ClaimableDocument = require("../models/ClaimableDocument");

async function fixDocumentNames() {
  try {
    console.log("Fixing document names...");

    // Wait for mongoose to be connected
    if (mongoose.connection.readyState !== 1) {
      console.log("Waiting for mongoose connection...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    const documents = await ClaimableDocument.find({ name: / Fee$/ });

    console.log(`Found ${documents.length} documents with " Fee" suffix`);

    for (const doc of documents) {
      const newName = doc.name.substring(0, doc.name.length - 4);
      console.log(`Updating: ${doc.name} -> ${newName}`);
      await ClaimableDocument.updateOne(
        { _id: doc._id },
        { $set: { name: newName } },
      );
    }

    console.log("Document names fixed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Failed to fix document names:", error);
    process.exit(1);
  }
}

fixDocumentNames();
