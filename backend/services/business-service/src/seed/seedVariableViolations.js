const mongoose = require("mongoose");
const Violation = require("../models/Violation");
const Fee = require("../models/Fee");
const { VARIABLE_INSPECTION_ITEMS } = require("./seedVariableInspectionItems");

/**
 * Variable Violations Seeder
 *
 * Seeds violations specific to variable non-compliance.
 * These violations are triggered when inspection items for variables fail.
 *
 * Structure:
 * - name: Display name of the violation
 * - description: Description of the violation
 * - notes: Inspector guidance on the violation
 * - penaltyAmount: Fine amount for the violation (in PHP)
 * - severity: Severity level (minor, major, critical)
 * - legalBasis: Array of legal references (url, title, description)
 * - correctiveAction: Required action to resolve the violation
 */

const VARIABLE_VIOLATIONS = [
  // Salon/Barber Chair Fee Violations
  {
    code: 'var-incorrect-salon-chair-count',
    name: 'Incorrect Salon/Barber Chair Count',
    description: 'Business declared incorrect number of barber chairs or salon stations',
    notes: 'Declared chair/station count does not match actual count. Verify all service areas.',
    penaltyAmount: 2000,
    severity: 'major',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/',
        title: 'Local Government Code of 1991',
        description: 'Section 152: Truthful declaration requirements for fee assessment'
      }
    ],
    correctiveAction: 'Update declaration to reflect actual chair/station count'
  },
  {
    code: 'var-missing-salon-chair-docs',
    name: 'Missing Salon/Barber Chair Documentation',
    description: 'Business lacks proper documentation of chair/station count',
    notes: 'No business permit application forms, floor plans, or other documentation showing chair/station count.',
    penaltyAmount: 1000,
    severity: 'minor',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/',
        title: 'Local Government Code of 1991',
        description: 'Section 152: Documentation requirements for fee assessment'
      }
    ],
    correctiveAction: 'Submit proper documentation showing chair/station count'
  },

  // Parking Space Fee Violations
  {
    code: 'var-incorrect-parking-area',
    name: 'Incorrect Parking Area Measurement',
    description: 'Business declared incorrect parking area in square meters',
    notes: 'Declared parking area does not match actual measurement.',
    penaltyAmount: 3000,
    severity: 'major',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/',
        title: 'Local Government Code of 1991',
        description: 'Section 152: Truthful declaration requirements for fee assessment'
      }
    ],
    correctiveAction: 'Update declaration to reflect actual parking area'
  },
  {
    code: 'var-non-compliant-parking',
    name: 'Non-Compliant Parking Space',
    description: 'Parking space does not meet accessibility or marking standards',
    notes: 'Parking spaces are not accessible, properly marked, or do not comply with accessibility standards.',
    penaltyAmount: 5000,
    severity: 'major',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2010/03/24/republic-act-no-10070/',
        title: 'RA 10070 - Magna Carta for Persons with Disability',
        description: 'Section 5: Accessibility requirements for parking spaces'
      }
    ],
    correctiveAction: 'Make parking spaces accessible and properly marked'
  },

  // Storage Area Fee Violations
  {
    code: 'var-incorrect-storage-area',
    name: 'Incorrect Storage Area Measurement',
    description: 'Business declared incorrect warehouse/storage area in square meters',
    notes: 'Declared storage area does not match actual measurement.',
    penaltyAmount: 3000,
    severity: 'major',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/',
        title: 'Local Government Code of 1991',
        description: 'Section 152: Truthful declaration requirements for fee assessment'
      }
    ],
    correctiveAction: 'Update declaration to reflect actual storage area'
  },
  {
    code: 'var-non-compliant-storage',
    name: 'Non-Compliant Storage Facility',
    description: 'Storage facilities do not comply with safety standards',
    notes: 'Storage areas lack fire safety, structural integrity, or proper ventilation.',
    penaltyAmount: 10000,
    severity: 'critical',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2008/03/04/republic-act-no-9497/',
        title: 'RA 9497 - Fire Code of the Philippines',
        description: 'Section 10: Safety requirements for storage facilities'
      }
    ],
    correctiveAction: 'Comply with safety standards for storage facilities'
  },

  // Boarding Capacity Fee Violations
  {
    code: 'var-incorrect-boarding-capacity',
    name: 'Incorrect Boarding Capacity',
    description: 'Boarding house/dormitory declared incorrect boarder capacity',
    notes: 'Declared boarder capacity does not match actual count.',
    penaltyAmount: 2000,
    severity: 'major',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/',
        title: 'Local Government Code of 1991',
        description: 'Section 152: Truthful declaration requirements for fee assessment'
      }
    ],
    correctiveAction: 'Update declaration to reflect actual boarder capacity'
  },
  {
    code: 'var-non-compliant-boarding',
    name: 'Non-Compliant Boarding House',
    description: 'Boarding house/dormitory does not comply with safety and occupancy standards',
    notes: 'Lacks fire safety, emergency exits, or exceeds occupancy limits per room.',
    penaltyAmount: 15000,
    severity: 'critical',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2008/03/04/republic-act-no-9497/',
        title: 'RA 9497 - Fire Code of the Philippines',
        description: 'Section 10: Safety requirements for boarding houses'
      }
    ],
    correctiveAction: 'Comply with safety and occupancy standards'
  },

  // PUV Unit Fee Violations
  {
    code: 'var-incorrect-puv-count',
    name: 'Incorrect PUV Vehicle Count',
    description: 'Business declared incorrect number of PUVs',
    notes: 'Declared PUV count does not match actual count.',
    penaltyAmount: 2000,
    severity: 'major',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2015/07/21/republic-act-no-10149/',
        title: 'RA 10149 - Public Service Act',
        description: 'Section 5: Registration requirements for PUVs'
      }
    ],
    correctiveAction: 'Update declaration to reflect actual PUV count'
  },
  {
    code: 'var-invalid-puv-registration',
    name: 'Invalid PUV Registration',
    description: 'PUVs lack valid franchises or registration',
    notes: 'One or more PUVs lack valid LTFRB franchise documents or registration.',
    penaltyAmount: 5000,
    severity: 'major',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2015/07/21/republic-act-no-10149/',
        title: 'RA 10149 - Public Service Act',
        description: 'Section 5: Valid franchise requirement for PUV operation'
      }
    ],
    correctiveAction: 'Obtain valid LTFRB franchise for all PUVs'
  },

  // Trucking Unit Fee Violations
  {
    code: 'var-incorrect-trucking-count',
    name: 'Incorrect Trucking Vehicle Count',
    description: 'Business declared incorrect number of trucking vehicles',
    notes: 'Declared trucking vehicle count does not match actual count.',
    penaltyAmount: 2000,
    severity: 'major',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/',
        title: 'Local Government Code of 1991',
        description: 'Section 152: Truthful declaration requirements for fee assessment'
      }
    ],
    correctiveAction: 'Update declaration to reflect actual trucking vehicle count'
  },
  {
    code: 'var-invalid-trucking-registration',
    name: 'Invalid Trucking Vehicle Registration',
    description: 'Trucking vehicles lack valid registration or permits',
    notes: 'One or more trucking vehicles lack valid LTO registration or required permits.',
    penaltyAmount: 3000,
    severity: 'major',
    legalBasis: [
      {
        url: 'https://www.lto.gov.ph/',
        title: 'LTO Registration Requirements',
        description: 'Valid registration required for all motor vehicles'
      }
    ],
    correctiveAction: 'Obtain valid LTO registration for all vehicles'
  },

  // Mining Hectare Fee Violations
  {
    code: 'var-incorrect-mining-area',
    name: 'Incorrect Mining Area',
    description: 'Mining operation declared incorrect mining area in hectares',
    notes: 'Declared mining area does not match actual area.',
    penaltyAmount: 50000,
    severity: 'critical',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1995/03/03/republic-act-no-7942/',
        title: 'RA 7942 - Philippine Mining Act of 1995',
        description: 'Section 26: Area verification requirements for mining permits'
      }
    ],
    correctiveAction: 'Update declaration to reflect actual mining area'
  },
  {
    code: 'var-invalid-mining-permit',
    name: 'Invalid Mining Permit',
    description: 'Mining operation lacks valid mining permits',
    notes: 'MGB permits are expired, invalid, or missing.',
    penaltyAmount: 100000,
    severity: 'critical',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1995/03/03/republic-act-no-7942/',
        title: 'RA 7942 - Philippine Mining Act of 1995',
        description: 'Section 26: Valid permit requirement for mining operations'
      }
    ],
    correctiveAction: 'Obtain valid MGB mining permits'
  },

  // Subdivision Lot Fee Violations
  {
    code: 'var-incorrect-subdivision-lots',
    name: 'Incorrect Subdivision Lot Count',
    description: 'Subdivision declared incorrect number of saleable lots',
    notes: 'Declared lot count does not match actual count.',
    penaltyAmount: 5000,
    severity: 'major',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1976/07/12/presidential-decree-no-957/',
        title: 'PD 957 - Subdivision and Condominium Buyer\'s Protective Decree',
        description: 'Section 5: Registration requirements for subdivision projects'
      }
    ],
    correctiveAction: 'Update declaration to reflect actual lot count'
  },
  {
    code: 'var-invalid-subdivision-permit',
    name: 'Invalid Subdivision Development Permit',
    description: 'Subdivision lacks valid development permits',
    notes: 'HLURB/DHSUD development permits are expired, invalid, or missing.',
    penaltyAmount: 20000,
    severity: 'critical',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1976/07/12/presidential-decree-no-957/',
        title: 'PD 957 - Subdivision and Condominium Buyer\'s Protective Decree',
        description: 'Section 5: Valid permit requirement for subdivision development'
      }
    ],
    correctiveAction: 'Obtain valid HLURB/DHSUD development permits'
  },

  // Subdivision Area Fee Violations
  {
    code: 'var-incorrect-subdivision-area',
    name: 'Incorrect Subdivision Area',
    description: 'Subdivision declared incorrect total area in hectares',
    notes: 'Declared subdivision area does not match actual area.',
    penaltyAmount: 5000,
    severity: 'major',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1976/07/12/presidential-decree-no-957/',
        title: 'PD 957 - Subdivision and Condominium Buyer\'s Protective Decree',
        description: 'Section 5: Area verification requirements for subdivision projects'
      }
    ],
    correctiveAction: 'Update declaration to reflect actual subdivision area'
  },

  // Subdivision Floor Area Fee Violations
  {
    code: 'var-incorrect-subdivision-floor-area',
    name: 'Incorrect Subdivision Floor Area',
    description: 'Subdivision declared incorrect housing component floor area',
    notes: 'Declared floor area does not match actual area.',
    penaltyAmount: 5000,
    severity: 'major',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1977/02/07/presidential-decree-no-1096/',
        title: 'PD 1096 - National Building Code',
        description: 'Section 301: Floor area verification requirements'
      }
    ],
    correctiveAction: 'Update declaration to reflect actual floor area'
  },

  // Hospital Bed Fee Violations
  {
    code: 'var-incorrect-hospital-beds',
    name: 'Incorrect Hospital Bed Capacity',
    description: 'Hospital declared incorrect bed capacity',
    notes: 'Declared bed capacity does not match actual count.',
    penaltyAmount: 5000,
    severity: 'major',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1965/06/19/republic-act-no-4226/',
        title: 'RA 4226 - Hospital Licensure Act',
        description: 'Section 3: Bed capacity reporting requirements'
      }
    ],
    correctiveAction: 'Update declaration to reflect actual bed capacity'
  },
  {
    code: 'var-invalid-hospital-lto',
    name: 'Invalid Hospital LTO',
    description: 'Hospital lacks valid License to Operate',
    notes: 'DOH LTO is expired, invalid, or missing.',
    penaltyAmount: 50000,
    severity: 'critical',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1965/06/19/republic-act-no-4226/',
        title: 'RA 4226 - Hospital Licensure Act',
        description: 'Section 3: Valid LTO requirement for hospital operation'
      }
    ],
    correctiveAction: 'Obtain valid DOH LTO'
  },

  // Printing Machine Fee Violations
  {
    code: 'var-incorrect-printing-machines',
    name: 'Incorrect Printing Machine Count',
    description: 'Business declared incorrect number of printing machines',
    notes: 'Declared machine count does not match actual count.',
    penaltyAmount: 2000,
    severity: 'major',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/',
        title: 'Local Government Code of 1991',
        description: 'Section 152: Truthful declaration requirements for fee assessment'
      }
    ],
    correctiveAction: 'Update declaration to reflect actual machine count'
  },
  {
    code: 'var-unregistered-printing-machine',
    name: 'Unregistered Printing Machine',
    description: 'Printing machines lack proper registration',
    notes: 'One or more printing machines lack required registrations or permits.',
    penaltyAmount: 3000,
    severity: 'major',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2003/11/07/republic-act-no-8483/',
        title: 'RA 8483 - Revised Consumer Act',
        description: 'Section 15: Registration requirements for printing establishments'
      }
    ],
    correctiveAction: 'Obtain required registrations for printing equipment'
  },

  // Market Stall Fee Violations
  {
    code: 'var-incorrect-market-stall-area',
    name: 'Incorrect Market Stall Area',
    description: 'Market stall declared incorrect floor area in square meters',
    notes: 'Declared stall area does not match actual measurement.',
    penaltyAmount: 1000,
    severity: 'minor',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/',
        title: 'Local Government Code of 1991',
        description: 'Section 152: Truthful declaration requirements for fee assessment'
      }
    ],
    correctiveAction: 'Update declaration to reflect actual stall area'
  },
  {
    code: 'var-invalid-market-stall-assignment',
    name: 'Invalid Market Stall Assignment',
    description: 'Market stall assignment is invalid or expired',
    notes: 'Market stall assignment documents are expired or invalid.',
    penaltyAmount: 1500,
    severity: 'minor',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/',
        title: 'Local Government Code of 1991',
        description: 'Section 152: Valid assignment requirement for market stalls'
      }
    ],
    correctiveAction: 'Obtain valid market stall assignment'
  },

  // Hotel Room Fee Violations
  {
    code: 'var-incorrect-hotel-rooms',
    name: 'Incorrect Hotel Room Count',
    description: 'Hotel declared incorrect number of rooms',
    notes: 'Declared room count does not match actual count.',
    penaltyAmount: 3000,
    severity: 'major',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2009/05/12/republic-act-no-9593/',
        title: 'RA 9593 - Tourism Act of 2009',
        description: 'Section 38: Room capacity reporting requirements'
      }
    ],
    correctiveAction: 'Update declaration to reflect actual room count'
  },
  {
    code: 'var-invalid-hotel-accreditation',
    name: 'Invalid Hotel Accreditation',
    description: 'Hotel lacks valid DOT accreditation',
    notes: 'DOT accreditation is expired, invalid, or missing.',
    penaltyAmount: 10000,
    severity: 'major',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/2009/05/12/republic-act-no-9593/',
        title: 'RA 9593 - Tourism Act of 2009',
        description: 'Section 38: Valid accreditation requirement for hotels'
      }
    ],
    correctiveAction: 'Obtain valid DOT accreditation'
  },

  // Apartment Unit Fee Violations
  {
    code: 'var-incorrect-apartment-units',
    name: 'Incorrect Apartment Unit Count',
    description: 'Apartment business declared incorrect number of rental units',
    notes: 'Declared unit count does not match actual count.',
    penaltyAmount: 2000,
    severity: 'major',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/',
        title: 'Local Government Code of 1991',
        description: 'Section 152: Truthful declaration requirements for fee assessment'
      }
    ],
    correctiveAction: 'Update declaration to reflect actual unit count'
  },
  {
    code: 'var-invalid-apartment-permit',
    name: 'Invalid Apartment Building Permit',
    description: 'Apartment building lacks valid permits',
    notes: 'Building permits are expired, invalid, or missing.',
    penaltyAmount: 10000,
    severity: 'major',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1977/02/07/presidential-decree-no-1096/',
        title: 'PD 1096 - National Building Code',
        description: 'Section 301: Valid permit requirement for apartment buildings'
      }
    ],
    correctiveAction: 'Obtain valid building permits'
  },

  // Bank Classification Fee Violations
  {
    code: 'var-incorrect-bank-type',
    name: 'Incorrect Bank Type Classification',
    description: 'Bank type is incorrectly classified',
    notes: 'Declared bank type does not match BSP records.',
    penaltyAmount: 10000,
    severity: 'major',
    legalBasis: [
      {
        url: 'https://www.bsp.gov.ph/',
        title: 'BSP Circular No. 898',
        description: 'Classification requirements for banks'
      }
    ],
    correctiveAction: 'Update bank type classification to match BSP records'
  },
  {
    code: 'var-invalid-bank-registration',
    name: 'Invalid Bank Registration',
    description: 'Bank lacks valid BSP registration',
    notes: 'BSP registration is expired, invalid, or missing.',
    penaltyAmount: 50000,
    severity: 'critical',
    legalBasis: [
      {
        url: 'https://www.bsp.gov.ph/',
        title: 'RA 8791 - General Banking Law',
        description: 'Section 11: Valid registration requirement for banks'
      }
    ],
    correctiveAction: 'Obtain valid BSP registration'
  },

  // Lending Classification Fee Violations
  {
    code: 'var-incorrect-lending-type',
    name: 'Incorrect Lending Institution Type',
    description: 'Lending institution type is incorrectly classified',
    notes: 'Declared lending institution type does not match SEC records.',
    penaltyAmount: 5000,
    severity: 'major',
    legalBasis: [
      {
        url: 'https://www.sec.gov.ph/',
        title: 'SEC Memorandum Circular No. 12',
        description: 'Classification requirements for lending institutions'
      }
    ],
    correctiveAction: 'Update lending institution type to match SEC records'
  },
  {
    code: 'var-invalid-lending-registration',
    name: 'Invalid Lending Registration',
    description: 'Lending institution lacks valid SEC registration',
    notes: 'SEC registration is expired, invalid, or missing.',
    penaltyAmount: 30000,
    severity: 'critical',
    legalBasis: [
      {
        url: 'https://www.sec.gov.ph/',
        title: 'RA 8791 - General Banking Law',
        description: 'Section 34: Valid registration requirement for lending institutions'
      }
    ],
    correctiveAction: 'Obtain valid SEC registration'
  },

  // Pawnshop Classification Fee Violations
  {
    code: 'var-incorrect-pawnshop-type',
    name: 'Incorrect Pawnshop Type',
    description: 'Pawnshop type is incorrectly classified',
    notes: 'Declared pawnshop type does not match BSP records.',
    penaltyAmount: 5000,
    severity: 'major',
    legalBasis: [
      {
        url: 'https://www.bsp.gov.ph/',
        title: 'BSP Circular No. 522',
        description: 'Classification requirements for pawnshops'
      }
    ],
    correctiveAction: 'Update pawnshop type to match BSP records'
  },
  {
    code: 'var-invalid-pawnshop-registration',
    name: 'Invalid Pawnshop Registration',
    description: 'Pawnshop lacks valid BSP registration',
    notes: 'BSP registration is expired, invalid, or missing.',
    penaltyAmount: 20000,
    severity: 'critical',
    legalBasis: [
      {
        url: 'https://www.bsp.gov.ph/',
        title: 'PD 114 - Pawnshop Regulation Act',
        description: 'Section 3: Valid registration requirement for pawnshops'
      }
    ],
    correctiveAction: 'Obtain valid BSP registration'
  },

  // Parking Available (Yes/No) Violations
  {
    code: 'var-false-parking-declaration',
    name: 'False Parking Space Declaration',
    description: 'Establishment falsely declared having parking space',
    notes: 'Declared having parking space but none exists or does not meet requirements.',
    penaltyAmount: 2000,
    severity: 'minor',
    legalBasis: [
      {
        url: 'https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/',
        title: 'Local Government Code of 1991',
        description: 'Section 152: Truthful declaration requirements'
      }
    ],
    correctiveAction: 'Update declaration to reflect actual parking space status'
  },
];

async function seedVariableViolations() {
  const mongoUri =
    "mongodb://capstone_app:g95fxnwa1wPDdyfA@mongodb:27017/capstone_project?authSource=admin";
  console.log(`Connecting to MongoDB: ${mongoUri}`);
  await mongoose.connect(mongoUri);

  let totalCreated = 0;
  let totalUpdated = 0;

  console.log("\nSeeding Variable Violations...");

  for (const violationData of VARIABLE_VIOLATIONS) {
    const existing = await Violation.findOne({ name: violationData.name });

    // Create or find penalty fee for this violation
    const penaltyFeeName = `${violationData.name} Penalty`;
    const penaltyFeeCustomId = `variable-penalty-${violationData.name.toLowerCase().replace(/\s+/g, '-')}`;
    let penaltyFee = await Fee.findOne({
      customId: penaltyFeeCustomId,
      category: 'penalty'
    });

    if (!penaltyFee) {
      // Create new penalty fee if it doesn't exist
      penaltyFee = await Fee.create({
        customId: penaltyFeeCustomId,
        name: penaltyFeeName,
        amount: violationData.penaltyAmount,
        category: 'penalty',
        isActive: true,
        version: 1,
        effectiveDate: new Date(),
      });
      console.log(`  + Created penalty fee: ${penaltyFeeName} (₱${violationData.penaltyAmount})`);
    }

    if (!existing) {
      await Violation.create({
        ...violationData,
        feeId: penaltyFee._id,
      });
      totalCreated++;
      console.log(`  + Created violation: ${violationData.name}`);
    } else {
      await Violation.updateOne(
        { name: violationData.name },
        {
          ...violationData,
          feeId: penaltyFee._id,
        }
      );
      totalUpdated++;
      console.log(`  ~ Updated violation: ${violationData.name}`);
    }
  }

  console.log(`\nVariable Violations seeded: ${totalCreated} created, ${totalUpdated} updated`);
  await mongoose.disconnect();
}

// Run if called directly
if (require.main === module) {
  seedVariableViolations().catch(console.error);
}

module.exports = { seedVariableViolations, VARIABLE_VIOLATIONS };
