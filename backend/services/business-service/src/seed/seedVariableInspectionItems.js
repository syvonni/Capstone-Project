const mongoose = require("mongoose");
const InspectionItem = require("../models/InspectionItem");
const Violation = require("../models/Violation");

/**
 * Variable Inspection Items Seeder
 *
 * Seeds inspection items specific to variable compliance verification.
 * These items are used to check if businesses comply with variable calculation requirements.
 *
 * Structure:
 * - name: Display name of the inspection item
 * - question: Specific question to ask during inspection
 * - notes: Inspector guidance on what to check
 * - violationName: Name of the violation if this check fails
 * - legalBasis: Array of legal references (url, title, description)
 */

const VARIABLE_INSPECTION_ITEMS = [
  // Salon/Barber Chair Fee
  {
    customId: "var-inspection-salon-chair-count",
    name: "Salon/Barber Chair Count Verification",
    question:
      "Does the business have the correct number of barber chairs or salon stations as declared?",
    notes:
      "Verify the actual count of barber chairs or salon stations against the declared number. Check all service areas.",
    violationCode: "var-incorrect-salon-chair-count",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/",
        title: "Local Government Code of 1991",
        description:
          "Section 152: Authority to impose fees based on business capacity",
      },
    ],
  },
  {
    customId: "var-inspection-salon-chair-docs",
    name: "Salon/Barber Chair Documentation",
    question:
      "Does the business maintain proper documentation of chair/station count?",
    notes:
      "Check for business permit application forms, floor plans, or other documentation showing chair/station count.",
    violationCode: "var-missing-salon-chair-docs",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/",
        title: "Local Government Code of 1991",
        description:
          "Section 152: Documentation requirements for fee assessment",
      },
    ],
  },

  // Parking Space Fee
  {
    customId: "var-inspection-parking-area",
    name: "Parking Area Measurement Verification",
    question:
      "Does the business have the correct parking area in square meters as declared?",
    notes:
      "Verify the actual parking area measurement against the declared area. Use measuring tools if necessary.",
    violationCode: "var-incorrect-parking-area",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/",
        title: "Local Government Code of 1991",
        description:
          "Section 152: Authority to impose fees based on parking area",
      },
    ],
  },
  {
    customId: "var-inspection-parking-accessibility",
    name: "Parking Space Accessibility",
    question: "Is the parking space accessible and properly marked?",
    notes:
      "Check if parking spaces are accessible, properly marked, and comply with accessibility standards.",
    violationCode: "var-non-compliant-parking",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2010/03/24/republic-act-no-10070/",
        title: "RA 10070 - Magna Carta for Persons with Disability",
        description: "Section 5: Accessibility requirements for parking spaces",
      },
    ],
  },

  // Storage Area Fee
  {
    customId: "var-inspection-storage-area",
    name: "Storage Area Measurement Verification",
    question:
      "Does the business have the correct warehouse/storage area in square meters as declared?",
    notes:
      "Verify the actual storage area measurement against the declared area. Check all storage facilities.",
    violationCode: "var-incorrect-storage-area",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/",
        title: "Local Government Code of 1991",
        description:
          "Section 152: Authority to impose fees based on storage area",
      },
    ],
  },
  {
    customId: "var-inspection-storage-safety",
    name: "Storage Facility Safety Compliance",
    question: "Do the storage facilities comply with safety standards?",
    notes:
      "Check for fire safety, structural integrity, and proper ventilation in storage areas.",
    violationCode: "var-non-compliant-storage",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2008/03/04/republic-act-no-9497/",
        title: "RA 9497 - Fire Code of the Philippines",
        description: "Section 10: Safety requirements for storage facilities",
      },
    ],
  },

  // Boarding Capacity Fee
  {
    customId: "var-inspection-boarding-capacity",
    name: "Boarding Capacity Verification",
    question:
      "Does the boarding house/dormitory have the correct boarder capacity as declared?",
    notes:
      "Verify the actual number of boarders against the declared capacity. Check room assignments.",
    violationCode: "var-incorrect-boarding-capacity",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/",
        title: "Local Government Code of 1991",
        description:
          "Section 152: Authority to impose fees based on boarding capacity",
      },
    ],
  },
  {
    customId: "var-inspection-boarding-safety",
    name: "Boarding House Safety Compliance",
    question:
      "Does the boarding house/dormitory comply with safety and occupancy standards?",
    notes:
      "Check for fire safety, emergency exits, and compliance with occupancy limits per room.",
    violationCode: "var-non-compliant-boarding",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2008/03/04/republic-act-no-9497/",
        title: "RA 9497 - Fire Code of the Philippines",
        description: "Section 10: Safety requirements for boarding houses",
      },
    ],
  },

  // PUV Unit Fee
  {
    customId: "var-inspection-puv-count",
    name: "PUV Vehicle Count Verification",
    question: "Does the business have the correct number of PUVs as declared?",
    notes:
      "Verify the actual count of PUVs (bus, jeepney, taxi) against the declared number. Check registration documents.",
    violationCode: "var-incorrect-puv-count",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2015/07/21/republic-act-no-10149/",
        title: "RA 10149 - Public Service Act",
        description: "Section 5: Registration requirements for PUVs",
      },
    ],
  },
  {
    customId: "var-inspection-puv-registration",
    name: "PUV Registration Validity",
    question: "Are all PUVs properly registered with valid franchises?",
    notes:
      "Check LTFRB franchise documents and registration validity for each vehicle.",
    violationCode: "var-invalid-puv-registration",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2015/07/21/republic-act-no-10149/",
        title: "RA 10149 - Public Service Act",
        description: "Section 5: Valid franchise requirement for PUV operation",
      },
    ],
  },

  // Trucking Unit Fee
  {
    customId: "var-inspection-trucking-count",
    name: "Trucking Vehicle Count Verification",
    question:
      "Does the business have the correct number of trucking vehicles as declared?",
    notes:
      "Verify the actual count of trucking/hauling vehicles against the declared number. Check registration documents.",
    violationCode: "var-incorrect-trucking-count",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/",
        title: "Local Government Code of 1991",
        description:
          "Section 152: Authority to impose fees on trucking operations",
      },
    ],
  },
  {
    customId: "var-inspection-trucking-registration",
    name: "Trucking Vehicle Registration Validity",
    question:
      "Are all trucking vehicles properly registered with valid permits?",
    notes: "Check LTO registration and any required permits for each vehicle.",
    violationCode: "var-invalid-trucking-registration",
    legalBasis: [
      {
        url: "https://www.lto.gov.ph/",
        title: "LTO Registration Requirements",
        description: "Valid registration required for all motor vehicles",
      },
    ],
  },

  // Mining Hectare Fee
  {
    customId: "var-inspection-mining-area",
    name: "Mining Area Verification",
    question:
      "Does the mining operation have the correct mining area in hectares as declared?",
    notes:
      "Verify the actual mining area against the declared area. Check survey documents and permits.",
    violationCode: "var-incorrect-mining-area",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1995/03/03/republic-act-no-7942/",
        title: "RA 7942 - Philippine Mining Act of 1995",
        description:
          "Section 26: Area verification requirements for mining permits",
      },
    ],
  },
  {
    customId: "var-inspection-mining-permit",
    name: "Mining Permit Validity",
    question: "Does the mining operation have valid mining permits?",
    notes: "Check MGB permits and ensure they are current and valid.",
    violationCode: "var-invalid-mining-permit",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1995/03/03/republic-act-no-7942/",
        title: "RA 7942 - Philippine Mining Act of 1995",
        description:
          "Section 26: Valid permit requirement for mining operations",
      },
    ],
  },

  // Subdivision Lot Fee
  {
    customId: "var-inspection-subdivision-lots",
    name: "Subdivision Lot Count Verification",
    question:
      "Does the subdivision have the correct number of saleable lots as declared?",
    notes:
      "Verify the actual number of saleable lots against the declared count. Check subdivision plans.",
    violationCode: "var-incorrect-subdivision-lots",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1976/07/12/presidential-decree-no-957/",
        title: "PD 957 - Subdivision and Condominium Buyer's Protective Decree",
        description:
          "Section 5: Registration requirements for subdivision projects",
      },
    ],
  },
  {
    customId: "var-inspection-subdivision-permit",
    name: "Subdivision Development Permit Validity",
    question: "Does the subdivision have valid development permits?",
    notes: "Check HLURB/DHSUD development permits and ensure they are current.",
    violationCode: "var-invalid-subdivision-permit",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1976/07/12/presidential-decree-no-957/",
        title: "PD 957 - Subdivision and Condominium Buyer's Protective Decree",
        description:
          "Section 5: Valid permit requirement for subdivision development",
      },
    ],
  },

  // Subdivision Area Fee
  {
    customId: "var-inspection-subdivision-area",
    name: "Subdivision Area Verification",
    question:
      "Does the subdivision have the correct total area in hectares as declared?",
    notes:
      "Verify the actual subdivision area against the declared area. Check survey documents.",
    violationCode: "var-incorrect-subdivision-area",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1976/07/12/presidential-decree-no-957/",
        title: "PD 957 - Subdivision and Condominium Buyer's Protective Decree",
        description:
          "Section 5: Area verification requirements for subdivision projects",
      },
    ],
  },

  // Subdivision Floor Area Fee
  {
    customId: "var-inspection-subdivision-floor-area",
    name: "Subdivision Floor Area Verification",
    question:
      "Does the subdivision have the correct housing component floor area as declared?",
    notes:
      "Verify the actual housing component floor area against the declared area. Check building plans.",
    violationCode: "var-incorrect-subdivision-floor-area",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1977/02/07/presidential-decree-no-1096/",
        title: "PD 1096 - National Building Code",
        description: "Section 301: Floor area verification requirements",
      },
    ],
  },

  // Hospital Bed Fee
  {
    customId: "var-inspection-hospital-beds",
    name: "Hospital Bed Capacity Verification",
    question: "Does the hospital have the correct bed capacity as declared?",
    notes:
      "Verify the actual bed capacity against the declared count. Check all wards and rooms.",
    violationCode: "var-incorrect-hospital-beds",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1965/06/19/republic-act-no-4226/",
        title: "RA 4226 - Hospital Licensure Act",
        description: "Section 3: Bed capacity reporting requirements",
      },
    ],
  },
  {
    customId: "var-inspection-hospital-lto",
    name: "Hospital LTO Validity",
    question: "Does the hospital have a valid License to Operate?",
    notes: "Check DOH LTO and ensure it is current and valid.",
    violationCode: "var-invalid-hospital-lto",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1965/06/19/republic-act-no-4226/",
        title: "RA 4226 - Hospital Licensure Act",
        description: "Section 3: Valid LTO requirement for hospital operation",
      },
    ],
  },

  // Printing Machine Fee
  {
    customId: "var-inspection-printing-machines",
    name: "Printing Machine Count Verification",
    question:
      "Does the business have the correct number of printing machines as declared?",
    notes:
      "Verify the actual count of printing machines against the declared number. Check all equipment.",
    violationCode: "var-incorrect-printing-machines",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/",
        title: "Local Government Code of 1991",
        description:
          "Section 152: Authority to impose fees on printing equipment",
      },
    ],
  },
  {
    customId: "var-inspection-printing-registration",
    name: "Printing Machine Registration",
    question: "Are all printing machines properly registered?",
    notes:
      "Check for any required registrations or permits for printing equipment.",
    violationCode: "var-unregistered-printing-machine",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2003/11/07/republic-act-no-8483/",
        title: "RA 8483 - Revised Consumer Act",
        description:
          "Section 15: Registration requirements for printing establishments",
      },
    ],
  },

  // Market Stall Fee
  {
    customId: "var-inspection-market-stall-area",
    name: "Market Stall Area Verification",
    question:
      "Does the market stall have the correct floor area in square meters as declared?",
    notes:
      "Verify the actual stall floor area against the declared area. Use measuring tools if necessary.",
    violationCode: "var-incorrect-market-stall-area",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/",
        title: "Local Government Code of 1991",
        description:
          "Section 152: Authority to impose fees based on stall area",
      },
    ],
  },
  {
    customId: "var-inspection-market-stall-assignment",
    name: "Market Stall Assignment Validity",
    question: "Is the market stall assignment valid and current?",
    notes:
      "Check market stall assignment documents and ensure they are current.",
    violationCode: "var-invalid-market-stall-assignment",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/",
        title: "Local Government Code of 1991",
        description:
          "Section 152: Valid assignment requirement for market stalls",
      },
    ],
  },

  // Hotel Room Fee
  {
    customId: "var-inspection-hotel-rooms",
    name: "Hotel Room Count Verification",
    question: "Does the hotel have the correct number of rooms as declared?",
    notes:
      "Verify the actual room count against the declared number. Check all room types.",
    violationCode: "var-incorrect-hotel-rooms",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2009/05/12/republic-act-no-9593/",
        title: "RA 9593 - Tourism Act of 2009",
        description: "Section 38: Room capacity reporting requirements",
      },
    ],
  },
  {
    customId: "var-inspection-hotel-accreditation",
    name: "Hotel Accreditation Validity",
    question: "Does the hotel have valid DOT accreditation?",
    notes: "Check DOT accreditation and ensure it is current and valid.",
    violationCode: "var-invalid-hotel-accreditation",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/2009/05/12/republic-act-no-9593/",
        title: "RA 9593 - Tourism Act of 2009",
        description: "Section 38: Valid accreditation requirement for hotels",
      },
    ],
  },

  // Apartment Unit Fee
  {
    customId: "var-inspection-apartment-units",
    name: "Apartment Unit Count Verification",
    question:
      "Does the apartment business have the correct number of rental units as declared?",
    notes:
      "Verify the actual number of rental units against the declared count. Check all units.",
    violationCode: "var-incorrect-apartment-units",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/",
        title: "Local Government Code of 1991",
        description: "Section 152: Authority to impose fees on rental units",
      },
    ],
  },
  {
    customId: "var-inspection-apartment-permit",
    name: "Apartment Building Permit Validity",
    question: "Does the apartment building have valid permits?",
    notes: "Check building permits and ensure they are current.",
    violationCode: "var-invalid-apartment-permit",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1977/02/07/presidential-decree-no-1096/",
        title: "PD 1096 - National Building Code",
        description:
          "Section 301: Valid permit requirement for apartment buildings",
      },
    ],
  },

  // Bank Classification Fee
  {
    customId: "var-inspection-bank-type",
    name: "Bank Type Verification",
    question: "Is the bank type correctly classified?",
    notes:
      "Verify the bank type (Rural/Thrift, Commercial/Industrial, Universal) against BSP records.",
    violationCode: "var-incorrect-bank-type",
    legalBasis: [
      {
        url: "https://www.bsp.gov.ph/",
        title: "BSP Circular No. 898",
        description: "Classification requirements for banks",
      },
    ],
  },
  {
    customId: "var-inspection-bank-registration",
    name: "Bank Registration Validity",
    question: "Does the bank have valid BSP registration?",
    notes: "Check BSP registration and ensure it is current and valid.",
    violationCode: "var-invalid-bank-registration",
    legalBasis: [
      {
        url: "https://www.bsp.gov.ph/",
        title: "RA 8791 - General Banking Law",
        description: "Section 11: Valid registration requirement for banks",
      },
    ],
  },

  // Lending Classification Fee
  {
    customId: "var-inspection-lending-type",
    name: "Lending Institution Type Verification",
    question: "Is the lending institution type correctly classified?",
    notes:
      "Verify the lending institution type (Lending Investor, Money Shop, Investment Company) against SEC records.",
    violationCode: "var-incorrect-lending-type",
    legalBasis: [
      {
        url: "https://www.sec.gov.ph/",
        title: "SEC Memorandum Circular No. 12",
        description: "Classification requirements for lending institutions",
      },
    ],
  },
  {
    customId: "var-inspection-lending-registration",
    name: "Lending Registration Validity",
    question: "Does the lending institution have valid SEC registration?",
    notes: "Check SEC registration and ensure it is current and valid.",
    violationCode: "var-invalid-lending-registration",
    legalBasis: [
      {
        url: "https://www.sec.gov.ph/",
        title: "RA 8791 - General Banking Law",
        description:
          "Section 34: Valid registration requirement for lending institutions",
      },
    ],
  },

  // Pawnshop Classification Fee
  {
    customId: "var-inspection-pawnshop-type",
    name: "Pawnshop Type Verification",
    question: "Is the pawnshop type correctly classified?",
    notes: "Verify the pawnshop type against BSP records.",
    violationCode: "var-incorrect-pawnshop-type",
    legalBasis: [
      {
        url: "https://www.bsp.gov.ph/",
        title: "BSP Circular No. 522",
        description: "Classification requirements for pawnshops",
      },
    ],
  },
  {
    customId: "var-inspection-pawnshop-registration",
    name: "Pawnshop Registration Validity",
    question: "Does the pawnshop have valid BSP registration?",
    notes: "Check BSP registration and ensure it is current and valid.",
    violationCode: "var-invalid-pawnshop-registration",
    legalBasis: [
      {
        url: "https://www.bsp.gov.ph/",
        title: "PD 114 - Pawnshop Regulation Act",
        description: "Section 3: Valid registration requirement for pawnshops",
      },
    ],
  },

  // Parking Available (Yes/No)
  {
    customId: "var-inspection-parking-availability",
    name: "Parking Space Availability Verification",
    question: "Does the establishment actually have parking space as declared?",
    notes:
      "Verify the presence of parking space. Check if it meets local requirements.",
    violationCode: "var-false-parking-declaration",
    legalBasis: [
      {
        url: "https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/",
        title: "Local Government Code of 1991",
        description: "Section 152: Truthful declaration requirements",
      },
    ],
  },
];

async function seedVariableInspectionItems() {
  const mongoUri =
    "mongodb://capstone_app:g95fxnwa1wPDdyfA@mongodb:27017/capstone_project?authSource=admin";
  console.log(`Connecting to MongoDB: ${mongoUri}`);
  await mongoose.connect(mongoUri);

  let totalCreated = 0;
  let totalUpdated = 0;

  console.log("\nSeeding Variable Inspection Items...");

  // Create a map of violations by code for efficient lookup
  const violations = await Violation.find({ code: { $exists: true } });
  const violationMap = new Map();
  for (const violation of violations) {
    violationMap.set(violation.code, violation._id);
  }

  for (const itemData of VARIABLE_INSPECTION_ITEMS) {
    const { violationCode, ...itemFields } = itemData;
    const existing = await InspectionItem.findOne({ name: itemData.name });

    // Find violation by code from map
    const violationId = violationMap.get(violationCode);
    if (!violationId) {
      console.warn(
        `  ! Warning: Violation not found: ${violationCode} - skipping inspection item: ${itemData.name}`,
      );
      continue;
    }

    if (!existing) {
      await InspectionItem.create({
        ...itemFields,
        violationId: violationId,
      });
      totalCreated++;
      console.log(
        `  + Created: ${itemData.name} (linked to violation: ${violationCode})`,
      );
    } else {
      await InspectionItem.updateOne(
        { name: itemData.name },
        {
          ...itemFields,
          violationId: violationId,
        },
      );
      totalUpdated++;
      console.log(
        `  ~ Updated: ${itemData.name} (linked to violation: ${violationCode})`,
      );
    }
  }

  console.log(
    `\nVariable Inspection Items seeded: ${totalCreated} created, ${totalUpdated} updated`,
  );
  await mongoose.disconnect();
}

// Run if called directly
if (require.main === module) {
  seedVariableInspectionItems().catch(console.error);
}

module.exports = { seedVariableInspectionItems, VARIABLE_INSPECTION_ITEMS };
