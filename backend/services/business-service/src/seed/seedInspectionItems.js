const mongoose = require("mongoose");
const InspectionItem = require("../models/InspectionItem");
const Violation = require("../models/Violation");

/**
 * Inspection Items Seeder
 *
 * Seeds inspection item definitions that can be referenced by checklists.
 * Each inspection item maps 1:1 to a violation.
 *
 * Structure:
 * - name: Display name of the inspection item (extremely specific)
 * - question: User-facing question (serves as the inspection criteria)
 * - notes: Additional notes or comments
 * - legalBasis: Array of legal references (url, title, description)
 * - violationName: Used to find violation by name (names are deterministically encrypted)
 */

const INSPECTION_ITEMS = [
  {
    name: "Presence of Boxes Blocking Fire Exit",
    question:
      "Are there any boxes, cartons, or storage items within 1 meter of fire exit doors?",
    notes:
      "Check all fire exits on premises. Measure 1 meter clearance from door. Remove any obstructions found.",
    violationName: "Boxes Blocking Fire Exit",
    legalBasis: [
      {
        url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=101",
        title: "NFPA 101 - Life Safety Code",
        description:
          "Section 7.2.1: Means of egress must be maintained free and unobstructed. Exit access travel distance must not be impeded by storage or other obstructions.",
      },
      {
        url: "https://www.officialgazette.gov.ph/2019/08/12/republic-act-no-11259/",
        title: "Republic Act No. 11259 - Fire Code of the Philippines",
        description:
          "Section 10: Exit routes must be kept clear and unobstructed at all times during business operations.",
      },
    ],
  },
  {
    name: "Presence of Furniture Blocking Fire Exit",
    question:
      "Are there any furniture, chairs, tables, or equipment within 1 meter of fire exit doors?",
    notes:
      "Check all fire exits. Furniture includes movable items. Fixed fixtures like handrails are acceptable.",
    violationName: "Furniture Blocking Fire Exit",
    legalBasis: [
      {
        url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=101",
        title: "NFPA 101 - Life Safety Code",
        description:
          "Section 7.2.1: Means of egress must be maintained free and unobstructed. Furniture and equipment cannot block exit access.",
      },
      {
        url: "https://www.officialgazette.gov.ph/2019/08/12/republic-act-no-11259/",
        title: "Republic Act No. 11259 - Fire Code of the Philippines",
        description:
          "Section 10: Exit routes must be kept clear and unobstructed at all times during business operations.",
      },
    ],
  },
  {
    name: "Presence of Equipment Blocking Fire Exit",
    question:
      "Are there any equipment, machinery, or appliances within 1 meter of fire exit doors?",
    notes:
      "Equipment includes refrigerators, display cases, POS systems. Must be movable for emergency access.",
    violationName: "Equipment Blocking Fire Exit",
    legalBasis: [
      {
        url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=101",
        title: "NFPA 101 - Life Safety Code",
        description:
          "Section 7.2.1: Means of egress must be maintained free and unobstructed. Equipment and machinery cannot block exit access.",
      },
      {
        url: "https://www.officialgazette.gov.ph/2019/08/12/republic-act-no-11259/",
        title: "Republic Act No. 11259 - Fire Code of the Philippines",
        description:
          "Section 10: Exit routes must be kept clear and unobstructed at all times during business operations.",
      },
    ],
  },
  {
    name: "Presence of Fire Extinguisher in Kitchen",
    question:
      "Is there a fire extinguisher present and accessible in the kitchen area?",
    notes:
      "Check near cooking equipment and food prep areas. Must be ABC-rated and within 75 feet of cooking area.",
    violationName: "Absence of Fire Extinguisher in Kitchen",
    legalBasis: [
      {
        url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=10",
        title: "NFPA 10 - Standard for Portable Fire Extinguishers",
        description:
          "Section 6.1.1: Fire extinguishers must be provided where required by applicable codes and standards. Kitchen areas require Class K or ABC extinguishers.",
      },
      {
        url: "https://www.officialgazette.gov.ph/2019/08/12/republic-act-no-11259/",
        title: "Republic Act No. 11259 - Fire Code of the Philippines",
        description:
          "Section 11: Fire extinguishers must be provided in all commercial establishments and maintained in working condition.",
      },
    ],
  },
  {
    name: "Presence of Fire Extinguisher in Storage",
    question:
      "Is there a fire extinguisher present and accessible in the storage area?",
    notes:
      "Check near flammable material storage. Must be ABC-rated and easily accessible.",
    violationName: "Absence of Fire Extinguisher in Storage",
    legalBasis: [
      {
        url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=10",
        title: "NFPA 10 - Standard for Portable Fire Extinguishers",
        description:
          "Section 6.1.1: Fire extinguishers must be provided where required by applicable codes. Storage areas with flammable materials require ABC extinguishers.",
      },
      {
        url: "https://www.officialgazette.gov.ph/2019/08/12/republic-act-no-11259/",
        title: "Republic Act No. 11259 - Fire Code of the Philippines",
        description:
          "Section 11: Fire extinguishers must be provided in all commercial establishments and maintained in working condition.",
      },
    ],
  },
  {
    name: "Presence of Fire Extinguisher Near Exits",
    question:
      "Is there a fire extinguisher present and accessible near fire exits?",
    notes:
      "Check within 10 feet of exit doors. Must be clearly visible and unobstructed.",
    violationName: "Absence of Fire Extinguisher Near Exits",
    legalBasis: [
      {
        url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=10",
        title: "NFPA 10 - Standard for Portable Fire Extinguishers",
        description:
          "Section 6.1.3.1: Fire extinguishers must be located along normal paths of travel and near exits for easy access during emergencies.",
      },
      {
        url: "https://www.officialgazette.gov.ph/2019/08/12/republic-act-no-11259/",
        title: "Republic Act No. 11259 - Fire Code of the Philippines",
        description:
          "Section 11: Fire extinguishers must be provided in all commercial establishments and maintained in working condition.",
      },
    ],
  },
  {
    name: "Fire Extinguisher Inspection Tag Validity",
    question: "Does the fire extinguisher have a valid inspection tag?",
    notes:
      "Check the inspection tag date. Fire extinguishers need annual inspection by certified technician.",
    violationName: "Expired Fire Extinguisher Inspection Tag",
    legalBasis: [
      {
        url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=10",
        title: "NFPA 10 - Standard for Portable Fire Extinguishers",
        description:
          "Section 7.3.1: Fire extinguishers must be inspected annually by a certified fire protection professional. Inspection tags must be current.",
      },
      {
        url: "https://www.officialgazette.gov.ph/2019/08/12/republic-act-no-11259/",
        title: "Republic Act No. 11259 - Fire Code of the Philippines",
        description:
          "Section 12: Fire extinguishers must undergo annual inspection and maintenance by certified personnel.",
      },
    ],
  },
  {
    name: "Fire Extinguisher Pressure Gauge",
    question: "Is the fire extinguisher pressure gauge in the green zone?",
    notes:
      "Pressure gauge should be in green. Replace if gauge shows low pressure or if expired.",
    violationName: "Fire Extinguisher Low Pressure",
    legalBasis: [
      {
        url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=10",
        title: "NFPA 10 - Standard for Portable Fire Extinguishers",
        description:
          "Section 7.2.1: Fire extinguishers must be maintained in fully charged and operable condition. Pressure gauges must indicate proper charge.",
      },
      {
        url: "https://www.officialgazette.gov.ph/2019/08/12/republic-act-no-11259/",
        title: "Republic Act No. 11259 - Fire Code of the Philippines",
        description:
          "Section 12: Fire extinguishers must be maintained in fully charged and operable condition at all times.",
      },
    ],
  },
  {
    name: "Waste Segregation",
    question:
      "Is waste properly segregated into biodegradable, non-biodegradable, and recyclable?",
    notes:
      "Use color-coded bins (green for biodegradable, yellow for non-biodegradable, blue for recyclable).",
    violationName: "Improper Waste Segregation",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2000/01/26/republic-act-no-9003/",
        title: "Republic Act No. 9003 - Ecological Solid Waste Management Act",
        description:
          "Section 21: Mandatory segregation of solid waste at source into biodegradable, non-biodegradable, and recyclable categories.",
      },
      {
        url: "https://www.officialgazette.gov.ph/2016/07/18/republic-act-no-10863/",
        title:
          "Republic Act No. 10863 - Tax Reform for Acceleration and Inclusion",
        description:
          "Section 48: Environmental compliance includes proper waste segregation and disposal.",
      },
    ],
  },
  {
    name: "Availability of Waste Disposal Bins",
    question: "Are proper waste disposal bins available and labeled?",
    notes:
      "Bins should be clearly labeled and in good condition. Schedule regular pickup.",
    violationName: "Missing Waste Disposal Bins",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2000/01/26/republic-act-no-9003/",
        title: "Republic Act No. 9003 - Ecological Solid Waste Management Act",
        description:
          "Section 21: Establishments must provide appropriate waste containers for segregation and proper disposal.",
      },
      {
        url: "https://www.officialgazette.gov.ph/2000/01/26/republic-act-no-9003/",
        title: "Republic Act No. 9003 - Ecological Solid Waste Management Act",
        description:
          "Section 22: Local government units must establish collection systems for segregated waste.",
      },
    ],
  },
  {
    name: "Display of Sanitary Permit",
    question: "Is the sanitary permit displayed in a visible location?",
    notes:
      "Permit should be displayed in a prominent area visible to customers and inspectors.",
    violationName: "Sanitary Permit Not Displayed",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2004/11/05/republic-act-no-9277/",
        title: "Republic Act No. 9277 - Sanitation Code of the Philippines",
        description:
          "Section 13: All establishments handling food must display valid sanitary permits in conspicuous locations.",
      },
      {
        url: "https://www.doh.gov.ph/sanitation-code",
        title: "Department of Health Administrative Order No. 2017-0004",
        description:
          "Section 5: Food establishments must maintain and display current sanitary permits for public inspection.",
      },
    ],
  },
  {
    name: "Building Structural Integrity",
    question:
      "Does the building show any signs of structural damage or deterioration?",
    notes:
      "Look for cracks in walls, sagging ceilings, water damage, or uneven floors.",
    violationName: "Building Structural Damage",
    legalBasis: [
      {
        url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=101",
        title: "NFPA 101 - Life Safety Code",
        description:
          "Section 8.2: Buildings must be maintained in safe condition. Structural damage that affects egress or occupant safety must be addressed.",
      },
      {
        url: "https://www.officialgazette.gov.ph/1977/08/24/presidential-decree-no-1185/",
        title: "Presidential Decree No. 1185 - National Building Code",
        description:
          "Section 301: Buildings must be maintained in safe condition. Structural defects must be repaired to ensure occupant safety.",
      },
    ],
  },
  {
    name: "Unauthorized Structural Modifications",
    question: "Do all structural modifications have proper building permits?",
    notes:
      "Any structural changes require building permit from City Engineering Office.",
    violationName: "Unauthorized Structural Modifications",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1977/08/24/presidential-decree-no-1185/",
        title: "Presidential Decree No. 1185 - National Building Code",
        description:
          "Section 301: All structural modifications, alterations, or additions require building permits from the local building official.",
      },
      {
        url: "https://www.officialgazette.gov.ph/1977/08/24/presidential-decree-no-1185/",
        title: "Presidential Decree No. 1185 - National Building Code",
        description:
          "Section 302: Unauthorized structural modifications are prohibited and subject to penalties and demolition orders.",
      },
    ],
  },
  {
    name: "Display of Business Permit",
    question: "Is the business permit displayed in a visible location?",
    notes:
      "Permit should be displayed in a prominent area visible to customers and inspectors.",
    violationName: "Business Permit Not Displayed",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2007/07/24/republic-act-no-9485/",
        title: "Republic Act No. 9485 - Business Permit and Licensing System",
        description:
          "Section 12: All business establishments must display valid business permits in conspicuous locations for public inspection.",
      },
      {
        url: "https://www.dti.gov.ph/business-permits",
        title: "Department of Trade and Industry Circular No. 2020-001",
        description:
          "Section 3: Business permits must be displayed at the principal place of business.",
      },
    ],
  },
  {
    name: "Business Permit Validity",
    question: "Is the business permit current and not expired?",
    notes: "Business permits must be renewed annually during January.",
    violationName: "Expired Business Permit",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2007/07/24/republic-act-no-9485/",
        title: "Republic Act No. 9485 - Business Permit and Licensing System",
        description:
          "Section 13: Business permits must be renewed annually. Operating with expired permits is prohibited and subject to penalties.",
      },
      {
        url: "https://www.dti.gov.ph/business-permits",
        title: "Department of Trade and Industry Circular No. 2020-001",
        description:
          "Section 4: Business permits must be renewed before expiration. Grace periods may apply but vary by local government unit.",
      },
    ],
  },
  // Post requirement inspection items moved to seedPostRequirementInspectionItems.js
  // FDA License to Operate, Fire Safety Inspection Certificate,
  // Environmental Compliance Certificate, BIR Authority to Print items
];

async function seedIfEmpty() {
  try {
    const count = await InspectionItem.countDocuments();
    if (count > 0) {
      return { seeded: false, inspectionItemCount: count };
    }

    // Load all active violations and create a name-to-id map
    const violations = await Violation.find({ isActive: true });
    const violationMap = new Map();
    violations.forEach((v) => violationMap.set(v.name, v._id));

    const createdInspectionItems = [];
    const linkedViolations = [];

    for (const inspectionItemData of INSPECTION_ITEMS) {
      // Find matching violation by name using the map
      const violationId = violationMap.get(inspectionItemData.violationName);

      if (!violationId) {
        console.log(
          `Warning: No active violation found with name: ${inspectionItemData.violationName}`,
        );
        continue;
      }

      // Create inspection item (remove violationName from data before creating)
      const { violationName, ...inspectionItemFields } = inspectionItemData;
      const inspectionItem = await InspectionItem.create({
        ...inspectionItemFields,
        violationId: violationId,
      });
      createdInspectionItems.push(inspectionItem);
      linkedViolations.push(violationId);
    }

    return {
      seeded: true,
      count: createdInspectionItems.length,
      violationsLinked: linkedViolations.length,
    };
  } catch (error) {
    console.error("Error seeding inspection items:", error);
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

    console.log("Clearing existing inspection items...");
    await InspectionItem.deleteMany({});

    // Load all active violations and create a name-to-id map
    const violations = await Violation.find({ isActive: true });
    const violationMap = new Map();
    violations.forEach((v) => violationMap.set(v.name, v._id));

    const createdInspectionItems = [];
    const linkedViolations = [];

    for (const inspectionItemData of INSPECTION_ITEMS) {
      // Find matching violation by name using the map
      const violationId = violationMap.get(inspectionItemData.violationName);

      if (!violationId) {
        console.log(
          `Warning: No active violation found with name: ${inspectionItemData.violationName}`,
        );
        continue;
      }

      // Create inspection item (remove violationName from data before creating)
      const { violationName, ...inspectionItemFields } = inspectionItemData;
      const inspectionItem = await InspectionItem.create({
        ...inspectionItemFields,
        violationId: violationId,
      });
      createdInspectionItems.push(inspectionItem);
      linkedViolations.push(violationId);
    }

    console.log(
      `Reseeded ${createdInspectionItems.length} inspection items with ${linkedViolations.length} linked violations`,
    );
    await mongoose.disconnect();
    return {
      seeded: true,
      count: createdInspectionItems.length,
      violationsLinked: linkedViolations.length,
    };
  } catch (error) {
    console.error("Error reseeding inspection items:", error);
    await mongoose.disconnect();
    throw error;
  }
}

module.exports = { seedIfEmpty, forceReseed, INSPECTION_ITEMS };

// Run force reseed if called directly
if (require.main === module) {
  forceReseed().catch(console.error);
}
