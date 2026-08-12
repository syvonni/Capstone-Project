const mongoose = require("mongoose");
const Violation = require("../models/Violation");
const Fee = require("../../../../shared/models/Fee");

/**
 * Violations Seeder
 *
 * Seeds violation definitions that can be referenced by inspection items.
 * Each violation can have an associated penalty fee.
 *
 * Structure:
 * - code: Unique identifier for the violation
 * - name: Display name of the violation
 * - description: User-facing description of the violation
 * - notes: Additional notes or comments
 * - severity: Severity level (minor, major, critical)
 * - legalBasis: Array of legal references (url, title, description)
 * - correctiveAction: Required action to fix the violation
 * - feeId: Reference to penalty fee (optional)
 */

const VIOLATIONS = [
  {
    code: "boxes-blocking-fire-exit",
    name: "Boxes Blocking Fire Exit",
    description:
      "Boxes, cartons, or storage items within 1 meter of fire exit doors",
    notes:
      "Check all fire exits on premises. Measure 1 meter clearance from door. Remove any obstructions found.",
    penaltyAmount: 10000,
    severity: "critical",
    legalBasis: [
      {
        url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=101",
        title: "NFPA 101 - Life Safety Code",
        description:
          "Section 7.2.1: Means of egress must be maintained free and unobstructed",
      },
      {
        url: "https://www.officialgazette.gov.ph/2019/08/12/republic-act-no-11259/",
        title: "Republic Act No. 11259 - Fire Code of the Philippines",
        description:
          "Section 10: Exit routes must be kept clear and unobstructed at all times",
      },
    ],
    correctiveAction: "Remove boxes from fire exit area",
  },
  {
    code: "furniture-blocking-fire-exit",
    name: "Furniture Blocking Fire Exit",
    description:
      "Furniture, chairs, tables, or equipment within 1 meter of fire exit doors",
    notes:
      "Check all fire exits. Furniture includes movable items. Fixed fixtures like handrails are acceptable.",
    penaltyAmount: 10000,
    severity: "critical",
    legalBasis: [
      {
        url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=101",
        title: "NFPA 101 - Life Safety Code",
        description:
          "Section 7.2.1: Means of egress must be maintained free and unobstructed",
      },
      {
        url: "https://www.officialgazette.gov.ph/2019/08/12/republic-act-no-11259/",
        title: "Republic Act No. 11259 - Fire Code of the Philippines",
        description:
          "Section 10: Exit routes must be kept clear and unobstructed at all times",
      },
    ],
    correctiveAction: "Move furniture away from fire exit",
  },
  {
    code: "equipment-blocking-fire-exit",
    name: "Equipment Blocking Fire Exit",
    description:
      "Equipment, machinery, or appliances within 1 meter of fire exit doors",
    notes:
      "Equipment includes refrigerators, display cases, POS systems. Must be movable for emergency access.",
    penaltyAmount: 10000,
    severity: "critical",
    legalBasis: [
      {
        url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=101",
        title: "NFPA 101 - Life Safety Code",
        description:
          "Section 7.2.1: Means of egress must be maintained free and unobstructed",
      },
      {
        url: "https://www.officialgazette.gov.ph/2019/08/12/republic-act-no-11259/",
        title: "Republic Act No. 11259 - Fire Code of the Philippines",
        description:
          "Section 10: Exit routes must be kept clear and unobstructed at all times",
      },
    ],
    correctiveAction: "Relocate equipment away from fire exit",
  },
  {
    code: "absence-fire-extinguisher-kitchen",
    name: "Absence of Fire Extinguisher in Kitchen",
    description:
      "No fire extinguisher present and accessible in the kitchen area",
    notes:
      "Check near cooking equipment and food prep areas. Must be ABC-rated and within 75 feet of cooking area.",
    penaltyAmount: 5000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=10",
        title: "NFPA 10 - Standard for Portable Fire Extinguishers",
        description:
          "Section 6.1.1: Fire extinguishers must be provided where required by applicable codes",
      },
      {
        url: "https://www.officialgazette.gov.ph/2019/08/12/republic-act-no-11259/",
        title: "Republic Act No. 11259 - Fire Code of the Philippines",
        description:
          "Section 11: Fire extinguishers must be provided in all commercial establishments",
      },
    ],
    correctiveAction: "Install fire extinguisher in kitchen area",
  },
  {
    code: "absence-fire-extinguisher-storage",
    name: "Absence of Fire Extinguisher in Storage",
    description:
      "No fire extinguisher present and accessible in the storage area",
    notes:
      "Check near flammable material storage. Must be ABC-rated and easily accessible.",
    penaltyAmount: 5000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=10",
        title: "NFPA 10 - Standard for Portable Fire Extinguishers",
        description:
          "Section 6.1.1: Fire extinguishers must be provided where required by applicable codes",
      },
      {
        url: "https://www.officialgazette.gov.ph/2019/08/12/republic-act-no-11259/",
        title: "Republic Act No. 11259 - Fire Code of the Philippines",
        description:
          "Section 11: Fire extinguishers must be provided in all commercial establishments",
      },
    ],
    correctiveAction: "Install fire extinguisher in storage area",
  },
  {
    code: "absence-fire-extinguisher-exits",
    name: "Absence of Fire Extinguisher Near Exits",
    description: "No fire extinguisher present and accessible near fire exits",
    notes:
      "Check within 10 feet of exit doors. Must be clearly visible and unobstructed.",
    penaltyAmount: 5000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=10",
        title: "NFPA 10 - Standard for Portable Fire Extinguishers",
        description:
          "Section 6.1.3.1: Fire extinguishers must be located along normal paths of travel and near exits",
      },
      {
        url: "https://www.officialgazette.gov.ph/2019/08/12/republic-act-no-11259/",
        title: "Republic Act No. 11259 - Fire Code of the Philippines",
        description:
          "Section 11: Fire extinguishers must be provided in all commercial establishments",
      },
    ],
    correctiveAction: "Install fire extinguisher near fire exits",
  },
  {
    code: "expired-fire-extinguisher-tag",
    name: "Expired Fire Extinguisher Inspection Tag",
    description: "Fire extinguisher does not have a valid inspection tag",
    notes:
      "Check the inspection tag date. Fire extinguishers need annual inspection by certified technician.",
    penaltyAmount: 3000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=10",
        title: "NFPA 10 - Standard for Portable Fire Extinguishers",
        description:
          "Section 7.3.1: Fire extinguishers must be inspected annually by certified fire protection professional",
      },
      {
        url: "https://www.officialgazette.gov.ph/2019/08/12/republic-act-no-11259/",
        title: "Republic Act No. 11259 - Fire Code of the Philippines",
        description:
          "Section 12: Fire extinguishers must undergo annual inspection and maintenance",
      },
    ],
    correctiveAction: "Schedule fire extinguisher inspection",
  },
  {
    code: "fire-extinguisher-low-pressure",
    name: "Fire Extinguisher Low Pressure",
    description: "Fire extinguisher pressure gauge is not in the green zone",
    notes:
      "Pressure gauge should be in green. Replace if gauge shows low pressure or if expired.",
    penaltyAmount: 3000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=10",
        title: "NFPA 10 - Standard for Portable Fire Extinguishers",
        description:
          "Section 7.2.1: Fire extinguishers must be maintained in fully charged and operable condition",
      },
      {
        url: "https://www.officialgazette.gov.ph/2019/08/12/republic-act-no-11259/",
        title: "Republic Act No. 11259 - Fire Code of the Philippines",
        description:
          "Section 12: Fire extinguishers must be maintained in fully charged and operable condition",
      },
    ],
    correctiveAction: "Replace or recharge fire extinguisher",
  },
  {
    code: "improper-waste-segregation",
    name: "Improper Waste Segregation",
    description:
      "Waste not properly segregated into biodegradable, non-biodegradable, and recyclable",
    notes:
      "Use color-coded bins (green for biodegradable, yellow for non-biodegradable, blue for recyclable).",
    penaltyAmount: 1000,
    severity: "minor",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2000/01/26/republic-act-no-9003/",
        title: "Republic Act No. 9003 - Ecological Solid Waste Management Act",
        description:
          "Section 21: Mandatory segregation of solid waste at source",
      },
    ],
    correctiveAction: "Implement proper waste segregation",
  },
  {
    code: "missing-waste-disposal-bins",
    name: "Missing Waste Disposal Bins",
    description: "Proper waste disposal bins not available or labeled",
    notes:
      "Bins should be clearly labeled and in good condition. Schedule regular pickup.",
    penaltyAmount: 1000,
    severity: "minor",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2000/01/26/republic-act-no-9003/",
        title: "Republic Act No. 9003 - Ecological Solid Waste Management Act",
        description:
          "Section 21: Establishments must provide appropriate waste containers",
      },
    ],
    correctiveAction: "Provide proper waste disposal bins",
  },
  {
    code: "sanitary-permit-not-displayed",
    name: "Sanitary Permit Not Displayed",
    description: "Sanitary permit not displayed in a visible location",
    notes:
      "Permit should be displayed in a prominent area visible to customers and inspectors.",
    penaltyAmount: 2000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2004/11/05/republic-act-no-9277/",
        title: "Republic Act No. 9277 - Sanitation Code of the Philippines",
        description:
          "Section 13: All establishments handling food must display valid sanitary permits",
      },
    ],
    correctiveAction: "Display sanitary permit in visible location",
  },
  {
    code: "building-structural-damage",
    name: "Building Structural Damage",
    description: "Building shows signs of structural damage or deterioration",
    notes:
      "Look for cracks in walls, sagging ceilings, water damage, or uneven floors.",
    penaltyAmount: 15000,
    severity: "critical",
    legalBasis: [
      {
        url: "https://www.nfpa.org/codes-and-standards/all-codes-and-standards/list-of-codes-and-standards/detail?code=101",
        title: "NFPA 101 - Life Safety Code",
        description:
          "Section 8.2: Buildings must be maintained in safe condition",
      },
      {
        url: "https://www.officialgazette.gov.ph/1977/08/24/presidential-decree-no-1185/",
        title: "Presidential Decree No. 1185 - National Building Code",
        description:
          "Section 301: Buildings must be maintained in safe condition",
      },
    ],
    correctiveAction: "Conduct structural assessment and repairs",
  },
  {
    code: "unauthorized-structural-modifications",
    name: "Unauthorized Structural Modifications",
    description:
      "Structural modifications made without proper building permits",
    notes:
      "Any structural changes require building permit from City Engineering Office.",
    penaltyAmount: 8000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1977/08/24/presidential-decree-no-1185/",
        title: "Presidential Decree No. 1185 - National Building Code",
        description:
          "Section 301: All structural modifications require building permits",
      },
    ],
    correctiveAction: "Apply for retroactive permit or revert modifications",
  },
  {
    code: "business-permit-not-displayed",
    name: "Business Permit Not Displayed",
    description: "Business permit not displayed in a visible location",
    notes:
      "Permit should be displayed in a prominent area visible to customers and inspectors.",
    penaltyAmount: 10000,
    severity: "critical",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2007/07/24/republic-act-no-9485/",
        title: "Republic Act No. 9485 - Business Permit and Licensing System",
        description:
          "Section 12: All business establishments must display valid business permits",
      },
    ],
    correctiveAction: "Display business permit in visible location",
  },
  {
    code: "expired-business-permit",
    name: "Expired Business Permit",
    description: "Business permit has expired",
    notes: "Business permits must be renewed annually during January.",
    penaltyAmount: 5000,
    severity: "major",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2007/07/24/republic-act-no-9485/",
        title: "Republic Act No. 9485 - Business Permit and Licensing System",
        description: "Section 13: Business permits must be renewed annually",
      },
    ],
    correctiveAction: "Renew business permit",
  },
  // Post requirement violations moved to seedPostRequirementViolations.js
  // FDA License to Operate, Fire Safety Inspection Certificate,
  // Environmental Compliance Certificate, BIR Authority to Print violations
];

async function seedIfEmpty() {
  try {
    const count = await Violation.countDocuments();
    if (count > 0) {
      return { seeded: false, violationCount: count };
    }

    const createdViolations = [];
    const linkedFees = [];

    for (const violationData of VIOLATIONS) {
      // Find matching penalty fee by customId
      const penaltyFeeCustomId = `penalty-${violationData.code}`;
      const penaltyFee = await Fee.findOne({
        customId: penaltyFeeCustomId,
        category: "penalty",
      });

      // Create violation
      const violation = await Violation.create({
        ...violationData,
        feeId: penaltyFee?._id || null,
      });
      createdViolations.push(violation);

      if (penaltyFee) {
        linkedFees.push(penaltyFee);
      }
    }

    return {
      seeded: true,
      count: createdViolations.length,
      feesLinked: linkedFees.length,
    };
  } catch (error) {
    console.error("Error seeding violations:", error);
    throw error;
  }
}

async function forceReseed() {
  try {
    const mongoUri =
      "mongodb://capstone_app:g95fxnwa1wPDdyfA@mongodb:27017/capstone_project?authSource=admin";
    console.log(`Connecting to MongoDB: ${mongoUri}`);
    await mongoose.connect(mongoUri);

    console.log("Clearing existing violations...");
    await Violation.deleteMany({});

    console.log("Clearing existing penalty fees...");
    await Fee.deleteMany({ category: "penalty" });

    const createdViolations = [];
    const createdFees = [];

    for (const violationData of VIOLATIONS) {
      // Create or find penalty fee for this violation
      const penaltyFeeName = `${violationData.name} Penalty`;
      const penaltyFeeCustomId = `penalty-${violationData.code}`;
      let penaltyFee = await Fee.findOne({
        customId: penaltyFeeCustomId,
        category: "penalty",
      });

      if (!penaltyFee && violationData.penaltyAmount) {
        // Create new penalty fee if it doesn't exist
        penaltyFee = await Fee.create({
          customId: penaltyFeeCustomId,
          name: penaltyFeeName,
          amount: violationData.penaltyAmount,
          category: "penalty",
          isActive: true,
          version: 1,
        });
        createdFees.push(penaltyFee);
        console.log(
          `  + Created penalty fee: ${penaltyFeeName} (₱${violationData.penaltyAmount})`,
        );
      }

      // Create violation (remove penaltyAmount from data before creating)
      const { penaltyAmount, ...violationFields } = violationData;
      const violation = await Violation.create({
        ...violationFields,
        feeId: penaltyFee?._id || null,
      });
      createdViolations.push(violation);
    }

    console.log(
      `Reseeded ${createdViolations.length} violations and created ${createdFees.length} penalty fees`,
    );
    await mongoose.disconnect();
    return {
      seeded: true,
      count: createdViolations.length,
      feesCreated: createdFees.length,
    };
  } catch (error) {
    console.error("Error reseeding violations:", error);
    await mongoose.disconnect();
    throw error;
  }
}

module.exports = { seedIfEmpty, forceReseed, VIOLATIONS };

// Run force reseed if called directly
if (require.main === module) {
  forceReseed().catch(console.error);
}
