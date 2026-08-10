const mongoose = require("mongoose");
const Checklist = require("../models/Checklist");
const InspectionItem = require("../models/InspectionItem");

/**
 * Checklists Seeder
 *
 * Seeds checklist definitions composed of inspection items.
 * Each checklist is composed of reusable inspection items with order.
 *
 * Structure:
 * - name: Display name of the checklist
 * - description: User-facing description
 * - notes: Additional notes or comments
 * - items: Array of inspection items with order
 *   - inspectionItemName: Used to find inspection item by name (names are deterministically encrypted)
 *   - order: Display order in checklist
 */

const CHECKLISTS = [
  {
    name: "Fire Safety Inspection",
    description:
      "Comprehensive fire safety checklist for commercial establishments",
    notes: "Covers fire exits, extinguishers, and electrical fire hazards",
    legalBasis: [
      {
        url: "https://www.bfp.gov.ph/fire-code",
        title: "Republic Act 9514 - Fire Code of the Philippines",
        description:
          "The Fire Code of the Philippines mandates regular fire safety inspections for commercial establishments",
      },
    ],
    items: [
      { inspectionItemName: "Presence of Boxes Blocking Fire Exit", order: 1 },
      {
        inspectionItemName: "Presence of Furniture Blocking Fire Exit",
        order: 2,
      },
      {
        inspectionItemName: "Presence of Equipment Blocking Fire Exit",
        order: 3,
      },
      {
        inspectionItemName: "Presence of Fire Extinguisher in Kitchen",
        order: 4,
      },
      {
        inspectionItemName: "Presence of Fire Extinguisher in Storage",
        order: 5,
      },
      {
        inspectionItemName: "Presence of Fire Extinguisher Near Exits",
        order: 6,
      },
    ],
  },
  {
    name: "Sanitary Inspection",
    description: "Sanitary requirements checklist for food establishments",
    notes: "Covers waste disposal, sanitary permits, and hygiene standards",
    legalBasis: [
      {
        url: "https://www.doh.gov.ph/food-safety",
        title: "Sanitation Code of the Philippines",
        description:
          "Prescribes minimum requirements for sanitation in food establishments",
      },
    ],
    items: [
      { inspectionItemName: "Waste Segregation", order: 1 },
      { inspectionItemName: "Availability of Waste Disposal Bins", order: 2 },
      { inspectionItemName: "Display of Sanitary Permit", order: 3 },
    ],
  },
  {
    name: "Structural Safety Inspection",
    description:
      "Building structural integrity and permit compliance checklist",
    notes: "Covers structural integrity and building permits",
    legalBasis: [
      {
        url: "https://www.dilg.gov.ph/building-code",
        title: "National Building Code of the Philippines",
        description:
          "Sets standards for building construction and structural safety",
      },
    ],
    items: [
      { inspectionItemName: "Building Structural Integrity", order: 1 },
      { inspectionItemName: "Unauthorized Structural Modifications", order: 2 },
    ],
  },
  {
    name: "Business Permit Compliance",
    description: "Business permit validity and display checklist",
    notes: "Covers business permit requirements",
    legalBasis: [
      {
        url: "https://www.dilg.gov.ph/lgu-codes",
        title: "Local Government Code",
        description:
          "Mandates business permit requirements and display for all commercial establishments",
      },
    ],
    items: [
      { inspectionItemName: "Display of Business Permit", order: 1 },
      { inspectionItemName: "Business Permit Validity", order: 2 },
    ],
  },
  // Post requirement checklists moved to seedPostRequirementChecklists.js
  // FDA License to Operate Compliance, Fire Safety Inspection Certificate Compliance,
  // Environmental Compliance Certificate Compliance, BIR Authority to Print Compliance
];

async function seedIfEmpty() {
  try {
    const count = await Checklist.countDocuments();
    if (count > 0) {
      return { seeded: false, checklistCount: count };
    }

    // Load all active inspection items and create a name-to-id map
    const inspectionItems = await InspectionItem.find({ isActive: true });
    const inspectionItemMap = new Map();
    inspectionItems.forEach((i) => inspectionItemMap.set(i.name, i._id));

    const createdChecklists = [];
    const linkedInspectionItems = [];

    for (const checklistData of CHECKLISTS) {
      const itemsWithIds = [];

      for (const item of checklistData.items) {
        // Find matching inspection item by name using the map
        const inspectionItemId = inspectionItemMap.get(item.inspectionItemName);

        if (!inspectionItemId) {
          console.log(
            `Warning: No active inspection item found with name: ${item.inspectionItemName}`,
          );
          continue;
        }

        itemsWithIds.push({
          inspectionItemId: inspectionItemId,
          order: item.order,
        });
        linkedInspectionItems.push(inspectionItemId);
      }

      if (itemsWithIds.length === 0) {
        console.log(
          `Warning: No valid inspection items found for checklist: ${checklistData.name}`,
        );
        continue;
      }

      // Create checklist (remove items from data before creating)
      const { items: _items, ...checklistFields } = checklistData;
      const checklist = await Checklist.create({
        ...checklistFields,
        items: itemsWithIds,
      });
      createdChecklists.push(checklist);
    }

    return {
      seeded: true,
      count: createdChecklists.length,
      inspectionItemsLinked: linkedInspectionItems.length,
    };
  } catch (error) {
    console.error("Error seeding checklists:", error);
    throw error;
  }
}

async function forceReseed() {
  try {
    const mongoUri =
      process.env.MONGO_URI ||
      "mongodb://capstone_app:g95fxnwa1wPDdyfA@mongodb:27017/capstone_project?authSource=admin";
    console.log(`Connecting to MongoDB: ${mongoUri}`);
    await mongoose.connect(mongoUri);

    console.log("Clearing existing checklists...");
    await Checklist.deleteMany({});

    // Load all active inspection items and create a name-to-id map
    const inspectionItems = await InspectionItem.find({ isActive: true });
    const inspectionItemMap = new Map();
    inspectionItems.forEach((i) => inspectionItemMap.set(i.name, i._id));

    const createdChecklists = [];
    const linkedInspectionItems = [];

    for (const checklistData of CHECKLISTS) {
      const itemsWithIds = [];

      for (const item of checklistData.items) {
        // Find matching inspection item by name using the map
        const inspectionItemId = inspectionItemMap.get(item.inspectionItemName);

        if (!inspectionItemId) {
          console.log(
            `Warning: No active inspection item found with name: ${item.inspectionItemName}`,
          );
          continue;
        }

        itemsWithIds.push({
          inspectionItemId: inspectionItemId,
          order: item.order,
        });
        linkedInspectionItems.push(inspectionItemId);
      }

      if (itemsWithIds.length === 0) {
        console.log(
          `Warning: No valid inspection items found for checklist: ${checklistData.name}`,
        );
        continue;
      }

      // Create checklist (remove items from data before creating)
      const { items: _items, ...checklistFields } = checklistData;
      const checklist = await Checklist.create({
        ...checklistFields,
        items: itemsWithIds,
      });
      createdChecklists.push(checklist);
    }

    console.log(
      `Reseeded ${createdChecklists.length} checklists with ${linkedInspectionItems.length} linked inspection items`,
    );
    await mongoose.disconnect();
    return {
      seeded: true,
      count: createdChecklists.length,
      inspectionItemsLinked: linkedInspectionItems.length,
    };
  } catch (error) {
    console.error("Error reseeding checklists:", error);
    await mongoose.disconnect();
    throw error;
  }
}

module.exports = { seedIfEmpty, forceReseed, CHECKLISTS };

// Run force reseed if called directly
if (require.main === module) {
  forceReseed().catch(console.error);
}
