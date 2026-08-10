const mongoose = require("mongoose");
const PostRequirement = require("../../models/PostRequirement");
const Violation = require("../../models/Violation");
const Fee = require("../../models/Fee");
const Lob = require("../../models/Lob");
const Checklist = require("../../models/Checklist");
const ClaimableDocument = require("../../models/ClaimableDocument");
const InspectionItem = require("../../models/InspectionItem");

class NameValidationService {
  /**
   * Validate if a name already exists across all entity types
   */
  async validateName(name, entityType, excludeId) {
    const conflicts = [];
    const trimmedName = name ? name.trim() : "";

    if (!trimmedName) {
      return {
        valid: true,
        conflicts: [],
      };
    }

    // Define all entity collections to check
    const entityCollections = [
      { model: PostRequirement, name: "PostRequirement" },
      { model: Violation, name: "Violation" },
      { model: Fee, name: "Fee" },
      { model: Lob, name: "LOB" },
      { model: Checklist, name: "Checklist" },
      { model: ClaimableDocument, name: "ClaimableDocument" },
      { model: InspectionItem, name: "InspectionItem" },
    ];

    // Check each collection for duplicate name
    for (const { model, name: entityName } of entityCollections) {
      const query = { name: trimmedName };

      // If excludeId is provided, exclude the current entity
      if (excludeId) {
        query._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
      }

      const existing = await model.findOne(query);
      if (existing) {
        conflicts.push({
          entityType: entityName,
          name: trimmedName,
          id: existing._id,
        });
      }
    }

    return {
      valid: conflicts.length === 0,
      conflicts,
    };
  }
}

module.exports = new NameValidationService();
