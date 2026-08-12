const mongoose = require("mongoose");
const ClaimableDocument = require("../../../shared/models/ClaimableDocument");
const Checklist = require("../src/models/Checklist");
const InspectionItem = require("../src/models/InspectionItem");
const Violation = require("../src/models/Violation");
const Fee = require("../../../shared/models/Fee");

mongoose
  .connect(
    "mongodb://capstone_app:g95fxnwa1wPDdyfA@mongodb:27017/capstone_project?authSource=admin",
  )
  .then(async () => {
    // Cleanup: Clear invalid checklistId references before creating new ones
    const cleanupResult = await ClaimableDocument.updateMany(
      { checklistId: { $exists: true } },
      { $unset: { checklistId: "" } },
    );
    console.log(
      "Cleared checklistId from",
      cleanupResult.modifiedCount,
      "documents",
    );

    // Delete existing checklists to avoid duplicates
    const deletedChecklists = await Checklist.deleteMany({});
    console.log(
      "Deleted",
      deletedChecklists.deletedCount,
      "existing checklists",
    );

    const documents = await ClaimableDocument.find({}).lean();
    console.log(
      "Creating checklists for",
      documents.length,
      "claimable documents",
    );

    const documentConfig = {
      "Unified Business Permit": [
        {
          name: "DTI/SEC Registration Validity",
          question: "Is the DTI/SEC registration valid and current?",
          violations: [
            { name: "Expired Registration", severity: "major" },
            { name: "Invalid Registration Type", severity: "major" },
            { name: "Non-matching Business Name", severity: "minor" },
          ],
        },
        {
          name: "Barangay Clearance Validity",
          question: "Is the barangay clearance valid and current?",
          violations: [
            { name: "Expired Clearance", severity: "major" },
            { name: "Wrong Barangay", severity: "major" },
            { name: "Non-matching Address", severity: "minor" },
          ],
        },
        {
          name: "Business Address Verification",
          question: "Is the business address properly verified?",
          violations: [
            { name: "No Proof of Address", severity: "major" },
            { name: "Invalid Lease Contract", severity: "major" },
            { name: "Address Mismatch", severity: "minor" },
          ],
        },
        {
          name: "Tax Compliance",
          question: "Is the business tax compliant?",
          violations: [
            { name: "Unpaid Taxes", severity: "critical" },
            { name: "No Tax Clearance", severity: "major" },
            { name: "Incomplete Tax Documents", severity: "minor" },
          ],
        },
      ],
      "Real Property Tax Clearance": [
        {
          name: "Tax Declaration Verification",
          question: "Is the tax declaration valid and verified?",
          violations: [
            { name: "Invalid Tax Declaration", severity: "major" },
            { name: "Non-matching Property", severity: "major" },
            { name: "Outdated Declaration", severity: "minor" },
          ],
        },
        {
          name: "Payment Receipt Verification",
          question: "Are payment receipts verified?",
          violations: [
            { name: "No Payment Receipt", severity: "critical" },
            { name: "Insufficient Payment", severity: "major" },
            { name: "Wrong Tax Year", severity: "minor" },
          ],
        },
        {
          name: "Property Ownership Verification",
          question: "Is property ownership verified?",
          violations: [
            { name: "No Proof of Ownership", severity: "major" },
            { name: "Invalid Title", severity: "critical" },
            { name: "Ownership Dispute", severity: "major" },
          ],
        },
        {
          name: "Assessment Accuracy",
          question: "Is the property assessment accurate?",
          violations: [
            { name: "Incorrect Assessment", severity: "minor" },
            { name: "Under-assessed Property", severity: "major" },
            { name: "Over-assessed Property", severity: "minor" },
          ],
        },
      ],
      "Account Clearance": [
        {
          name: "Outstanding Balance Check",
          question: "Are there any outstanding balances?",
          violations: [
            { name: "Unpaid Balance", severity: "critical" },
            { name: "Disputed Charges", severity: "major" },
            { name: "Uncleared Transactions", severity: "minor" },
          ],
        },
        {
          name: "Payment History Review",
          question: "Is the payment history satisfactory?",
          violations: [
            { name: "Late Payments", severity: "minor" },
            { name: "Missed Payments", severity: "major" },
            { name: "Payment Discrepancies", severity: "minor" },
          ],
        },
        {
          name: "Account Status Verification",
          question: "Is the account status verified?",
          violations: [
            { name: "Inactive Account", severity: "major" },
            { name: "Frozen Account", severity: "critical" },
            { name: "Restricted Account", severity: "major" },
          ],
        },
        {
          name: "Document Completeness",
          question: "Are all required documents complete?",
          violations: [
            { name: "Missing Documents", severity: "major" },
            { name: "Invalid Documents", severity: "major" },
            { name: "Expired Documents", severity: "minor" },
          ],
        },
      ],
      "Cooperative Permit": [
        {
          name: "CDA Registration Validity",
          question: "Is the CDA registration valid?",
          violations: [
            { name: "Expired Registration", severity: "major" },
            { name: "Invalid CDA Certificate", severity: "critical" },
            { name: "Non-registered Cooperative", severity: "critical" },
          ],
        },
        {
          name: "Bylaws Compliance",
          question: "Are the bylaws compliant?",
          violations: [
            { name: "Non-compliant Bylaws", severity: "major" },
            { name: "Missing Bylaws", severity: "major" },
            { name: "Outdated Bylaws", severity: "minor" },
          ],
        },
        {
          name: "Membership Verification",
          question: "Is membership verified?",
          violations: [
            { name: "Insufficient Members", severity: "major" },
            { name: "Invalid Membership List", severity: "minor" },
            { name: "Non-qualified Members", severity: "minor" },
          ],
        },
        {
          name: "Financial Report Submission",
          question: "Is the financial report submitted?",
          violations: [
            { name: "Missing Financial Report", severity: "major" },
            { name: "Incomplete Report", severity: "minor" },
            { name: "Unaudited Report", severity: "minor" },
          ],
        },
      ],
      "Association/Foundation Permit": [
        {
          name: "SEC Registration Validity",
          question: "Is the SEC registration valid?",
          violations: [
            { name: "Expired Registration", severity: "major" },
            { name: "Invalid SEC Certificate", severity: "critical" },
            { name: "Non-registered Entity", severity: "critical" },
          ],
        },
        {
          name: "Articles of Incorporation Compliance",
          question: "Are the articles of incorporation compliant?",
          violations: [
            { name: "Non-compliant Articles", severity: "major" },
            { name: "Missing Articles", severity: "major" },
            { name: "Outdated Articles", severity: "minor" },
          ],
        },
        {
          name: "Board Verification",
          question: "Is the board composition verified?",
          violations: [
            { name: "Invalid Board Composition", severity: "major" },
            { name: "Missing Board Records", severity: "minor" },
            { name: "Unauthorized Board Members", severity: "major" },
          ],
        },
        {
          name: "Financial Report Submission",
          question: "Is the financial report submitted?",
          violations: [
            { name: "Missing Financial Report", severity: "major" },
            { name: "Incomplete Report", severity: "minor" },
            { name: "Unaudited Report", severity: "minor" },
          ],
        },
      ],
      "Chainsaw Permit": [
        {
          name: "Equipment Registration",
          question: "Is the equipment registered?",
          violations: [
            { name: "Unregistered Equipment", severity: "major" },
            { name: "Invalid Serial Number", severity: "minor" },
            { name: "Non-compliant Equipment", severity: "major" },
          ],
        },
        {
          name: "Safety Training Verification",
          question: "Is safety training verified?",
          violations: [
            { name: "No Safety Training", severity: "critical" },
            { name: "Expired Training Certificate", severity: "major" },
            { name: "Inadequate Training", severity: "minor" },
          ],
        },
        {
          name: "Storage Compliance",
          question: "Is storage compliant?",
          violations: [
            { name: "Improper Storage", severity: "major" },
            { name: "No Secure Storage", severity: "major" },
            { name: "Unsafe Storage Location", severity: "critical" },
          ],
        },
        {
          name: "Usage Authorization",
          question: "Is usage authorized?",
          violations: [
            { name: "Unauthorized Usage", severity: "critical" },
            { name: "Beyond Authorized Scope", severity: "major" },
            { name: "Invalid Authorization", severity: "major" },
          ],
        },
      ],
      "Firecrackers Stallholders Permit": [
        {
          name: "Storage Location Safety",
          question: "Is the storage location safe?",
          violations: [
            { name: "Unsafe Storage", severity: "critical" },
            { name: "Near Flammable Materials", severity: "critical" },
            { name: "No Fire Safety Measures", severity: "major" },
          ],
        },
        {
          name: "Fire Safety Compliance",
          question: "Is fire safety compliant?",
          violations: [
            { name: "No Fire Extinguisher", severity: "critical" },
            { name: "No Fire Exit", severity: "critical" },
            { name: "Blocked Emergency Exit", severity: "critical" },
          ],
        },
        {
          name: "Sales Area Verification",
          question: "Is the sales area verified?",
          violations: [
            { name: "Unauthorized Sales Area", severity: "major" },
            { name: "Crowded Sales Area", severity: "minor" },
            { name: "Unsafe Display", severity: "major" },
          ],
        },
        {
          name: "Permit Validity",
          question: "Is the permit valid?",
          violations: [
            { name: "Expired Permit", severity: "critical" },
            { name: "Invalid Permit Type", severity: "major" },
            { name: "Non-matching Permit", severity: "minor" },
          ],
        },
      ],
      "Bazaar/Festival Vendors Permit": [
        {
          name: "Event Permit Validity",
          question: "Is the event permit valid?",
          violations: [
            { name: "Expired Event Permit", severity: "critical" },
            { name: "Invalid Event Permit", severity: "major" },
            { name: "Non-matching Event", severity: "minor" },
          ],
        },
        {
          name: "Stall Location Verification",
          question: "Is the stall location verified?",
          violations: [
            { name: "Unauthorized Stall Location", severity: "major" },
            { name: "Blocked Pathway", severity: "major" },
            { name: "Unsafe Location", severity: "critical" },
          ],
        },
        {
          name: "Health Compliance",
          question: "Is health compliance met?",
          violations: [
            { name: "No Health Permit", severity: "critical" },
            { name: "Unsanitary Conditions", severity: "major" },
            { name: "Food Safety Violations", severity: "critical" },
          ],
        },
        {
          name: "Sales Authorization",
          question: "Is sales authorized?",
          violations: [
            { name: "Unauthorized Products", severity: "major" },
            { name: "Beyond Authorized Scope", severity: "minor" },
            { name: "Prohibited Items", severity: "critical" },
          ],
        },
      ],
      "Peddlers Permit": [
        {
          name: "Route Authorization",
          question: "Is the route authorized?",
          violations: [
            { name: "Unauthorized Route", severity: "major" },
            { name: "Beyond Authorized Route", severity: "minor" },
            { name: "Restricted Area", severity: "major" },
          ],
        },
        {
          name: "Health Certificate Validity",
          question: "Is the health certificate valid?",
          violations: [
            { name: "Expired Health Certificate", severity: "major" },
            { name: "No Health Certificate", severity: "critical" },
            { name: "Invalid Health Certificate", severity: "major" },
          ],
        },
        {
          name: "Identification Verification",
          question: "Is identification verified?",
          violations: [
            { name: "Invalid ID", severity: "minor" },
            { name: "No ID Presented", severity: "major" },
            { name: "Non-matching ID", severity: "minor" },
          ],
        },
        {
          name: "Vehicle/Equipment Compliance",
          question: "Is vehicle/equipment compliant?",
          violations: [
            { name: "Unregistered Vehicle", severity: "major" },
            { name: "Non-compliant Equipment", severity: "major" },
            { name: "Unsafe Vehicle", severity: "critical" },
          ],
        },
      ],
      "Promotions/Exhibitors Permit": [
        {
          name: "Event Permit Validity",
          question: "Is the event permit valid?",
          violations: [
            { name: "Expired Event Permit", severity: "critical" },
            { name: "Invalid Event Permit", severity: "major" },
            { name: "Non-matching Event", severity: "minor" },
          ],
        },
        {
          name: "Booth Location Verification",
          question: "Is the booth location verified?",
          violations: [
            { name: "Unauthorized Booth Location", severity: "major" },
            { name: "Blocked Pathway", severity: "major" },
            { name: "Unsafe Location", severity: "critical" },
          ],
        },
        {
          name: "Promotional Material Compliance",
          question: "Are promotional materials compliant?",
          violations: [
            { name: "Unauthorized Materials", severity: "minor" },
            { name: "Misleading Content", severity: "major" },
            { name: "Prohibited Content", severity: "critical" },
          ],
        },
        {
          name: "Sales Authorization",
          question: "Is sales authorized?",
          violations: [
            { name: "Unauthorized Products", severity: "major" },
            { name: "Beyond Authorized Scope", severity: "minor" },
            { name: "Prohibited Items", severity: "critical" },
          ],
        },
      ],
      "Cemetery Stallholders Permit": [
        {
          name: "Stall Location Verification",
          question: "Is the stall location verified?",
          violations: [
            { name: "Unauthorized Stall Location", severity: "major" },
            { name: "Blocked Pathway", severity: "major" },
            { name: "Unsafe Location", severity: "critical" },
          ],
        },
        {
          name: "Cemetery Permit Validity",
          question: "Is the cemetery permit valid?",
          violations: [
            { name: "Expired Cemetery Permit", severity: "critical" },
            { name: "Invalid Cemetery Permit", severity: "major" },
            { name: "Non-matching Permit", severity: "minor" },
          ],
        },
        {
          name: "Sales Authorization",
          question: "Is sales authorized?",
          violations: [
            { name: "Unauthorized Products", severity: "major" },
            { name: "Beyond Authorized Scope", severity: "minor" },
            { name: "Prohibited Items", severity: "critical" },
          ],
        },
        {
          name: "Maintenance Compliance",
          question: "Is maintenance compliant?",
          violations: [
            { name: "Unmaintained Stall", severity: "minor" },
            { name: "Sanitation Issues", severity: "major" },
            { name: "Safety Hazards", severity: "critical" },
          ],
        },
      ],
      "Fish Trap/Fish Pen Permit": [
        {
          name: "Location Verification",
          question: "Is the location verified?",
          violations: [
            { name: "Unauthorized Location", severity: "major" },
            { name: "Restricted Area", severity: "critical" },
            { name: "Protected Area", severity: "critical" },
          ],
        },
        {
          name: "BFAR Registration Validity",
          question: "Is the BFAR registration valid?",
          violations: [
            { name: "Expired BFAR Registration", severity: "major" },
            { name: "Invalid BFAR Registration", severity: "critical" },
            { name: "Non-registered Operation", severity: "critical" },
          ],
        },
        {
          name: "Environmental Compliance",
          question: "Is environmental compliance met?",
          violations: [
            { name: "Environmental Violation", severity: "critical" },
            { name: "Water Pollution", severity: "critical" },
            { name: "Habitat Destruction", severity: "critical" },
          ],
        },
        {
          name: "Size/Dimension Compliance",
          question: "Are size/dimensions compliant?",
          violations: [
            { name: "Exceeds Allowed Size", severity: "major" },
            { name: "Non-compliant Dimensions", severity: "major" },
            { name: "Unauthorized Expansion", severity: "major" },
          ],
        },
      ],
      "Fish Pond Permit": [
        {
          name: "Location Verification",
          question: "Is the location verified?",
          violations: [
            { name: "Unauthorized Location", severity: "major" },
            { name: "Restricted Area", severity: "critical" },
            { name: "Protected Area", severity: "critical" },
          ],
        },
        {
          name: "BFAR Registration Validity",
          question: "Is the BFAR registration valid?",
          violations: [
            { name: "Expired BFAR Registration", severity: "major" },
            { name: "Invalid BFAR Registration", severity: "critical" },
            { name: "Non-registered Operation", severity: "critical" },
          ],
        },
        {
          name: "Environmental Compliance",
          question: "Is environmental compliance met?",
          violations: [
            { name: "Environmental Violation", severity: "critical" },
            { name: "Water Pollution", severity: "critical" },
            { name: "Habitat Destruction", severity: "critical" },
          ],
        },
        {
          name: "Water Quality Compliance",
          question: "Is water quality compliant?",
          violations: [
            { name: "Poor Water Quality", severity: "major" },
            { name: "Contaminated Water", severity: "critical" },
            { name: "Insufficient Testing", severity: "minor" },
          ],
        },
      ],
      "Fire Safety Inspection Certificate": [
        {
          name: "Fire Extinguisher Availability",
          question: "Are fire extinguishers available?",
          violations: [
            { name: "No Fire Extinguisher", severity: "critical" },
            { name: "Expired Extinguisher", severity: "major" },
            { name: "Insufficient Extinguishers", severity: "major" },
          ],
        },
        {
          name: "Exit Signage Compliance",
          question: "Is exit signage compliant?",
          violations: [
            { name: "No Exit Signs", severity: "critical" },
            { name: "Blocked Exit Signs", severity: "critical" },
            { name: "Illegible Exit Signs", severity: "major" },
          ],
        },
        {
          name: "Electrical Safety",
          question: "Is electrical safety compliant?",
          violations: [
            { name: "Exposed Wiring", severity: "critical" },
            { name: "Overloaded Circuits", severity: "major" },
            { name: "Non-compliant Installation", severity: "major" },
          ],
        },
        {
          name: "Emergency Plan",
          question: "Is there an emergency plan?",
          violations: [
            { name: "No Emergency Plan", severity: "major" },
            { name: "Untrained Staff", severity: "minor" },
            { name: "Missing Emergency Equipment", severity: "major" },
          ],
        },
      ],
      "Sanitary Permit": [
        {
          name: "Waste Disposal Compliance",
          question: "Is waste disposal compliant?",
          violations: [
            { name: "Improper Waste Disposal", severity: "critical" },
            { name: "No Waste Management", severity: "major" },
            { name: "Illegal Dumping", severity: "critical" },
          ],
        },
        {
          name: "Food Handling Safety",
          question: "Is food handling safe?",
          violations: [
            { name: "Unsanitary Food Handling", severity: "critical" },
            { name: "No Food Safety Training", severity: "major" },
            { name: "Cross-contamination", severity: "critical" },
          ],
        },
        {
          name: "Staff Health Certificates",
          question: "Do staff have valid health certificates?",
          violations: [
            { name: "No Health Certificates", severity: "major" },
            { name: "Expired Certificates", severity: "major" },
            { name: "Incomplete Health Records", severity: "minor" },
          ],
        },
        {
          name: "Facility Cleanliness",
          question: "Is the facility clean?",
          violations: [
            { name: "Unsanitary Facility", severity: "major" },
            { name: "Pest Infestation", severity: "critical" },
            { name: "Poor Maintenance", severity: "minor" },
          ],
        },
      ],
      "Zoning Clearance": [
        {
          name: "Zoning Classification Verification",
          question: "Is the zoning classification verified?",
          violations: [
            { name: "Wrong Zoning Classification", severity: "major" },
            { name: "Non-conforming Use", severity: "major" },
            { name: "Prohibited Activity", severity: "critical" },
          ],
        },
        {
          name: "Land Use Compliance",
          question: "Is land use compliant?",
          violations: [
            { name: "Non-compliant Land Use", severity: "major" },
            { name: "Unauthorized Use", severity: "major" },
            { name: "Restricted Activity", severity: "critical" },
          ],
        },
        {
          name: "Setback Compliance",
          question: "Is setback compliant?",
          violations: [
            { name: "Setback Violation", severity: "minor" },
            { name: "No Setback", severity: "major" },
            { name: "Insufficient Setback", severity: "minor" },
          ],
        },
        {
          name: "Building Height Compliance",
          question: "Is building height compliant?",
          violations: [
            { name: "Height Violation", severity: "major" },
            { name: "Exceeds Height Limit", severity: "critical" },
            { name: "Non-compliant Structure", severity: "major" },
          ],
        },
      ],
    };

    const legalBasisConfig = {
      "DTI/SEC Registration Validity": {
        url: "https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/",
        title: "RA 7160 - Local Government Code of 1991",
        description: "Section 143: Business registration requirements",
      },
      "Barangay Clearance Validity": {
        url: "https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/",
        title: "RA 7160 - Local Government Code of 1991",
        description: "Section 152: Barangay clearance requirements",
      },
      "Business Address Verification": {
        url: "https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/",
        title: "RA 7160 - Local Government Code of 1991",
        description: "Section 143: Proof of business address requirements",
      },
      "Tax Compliance": {
        url: "https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/",
        title: "RA 7160 - Local Government Code of 1991",
        description: "Section 147: Tax compliance requirements",
      },
      "Tax Declaration Verification": {
        url: "https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/",
        title: "RA 7160 - Local Government Code of 1991",
        description: "Section 234: Real property tax requirements",
      },
      "Payment Receipt Verification": {
        url: "https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/",
        title: "RA 7160 - Local Government Code of 1991",
        description: "Section 234: Payment receipt requirements",
      },
      "Property Ownership Verification": {
        url: "https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/",
        title: "RA 7160 - Local Government Code of 1991",
        description: "Section 234: Property ownership verification",
      },
      "Assessment Accuracy": {
        url: "https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/",
        title: "RA 7160 - Local Government Code of 1991",
        description: "Section 219: Property assessment requirements",
      },
      "Outstanding Balance Check": {
        url: "https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/",
        title: "RA 7160 - Local Government Code of 1991",
        description: "Section 195: Collection of taxes and fees",
      },
      "Payment History Review": {
        url: "https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/",
        title: "RA 7160 - Local Government Code of 1991",
        description: "Section 195: Payment history requirements",
      },
      "Account Status Verification": {
        url: "https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/",
        title: "RA 7160 - Local Government Code of 1991",
        description: "Section 195: Account status verification",
      },
      "Document Completeness": {
        url: "https://www.officialgazette.gov.ph/2018/05/28/republic-act-no-11032/",
        title: "RA 11032 - Ease of Doing Business Act of 2018",
        description: "Section 5: Document completeness requirements",
      },
      "CDA Registration Validity": {
        url: "https://www.officialgazette.gov.ph/2008/02/17/republic-act-no-9520/",
        title: "RA 9520 - Philippine Cooperative Code of 2008",
        description: "Section 10: Cooperative registration requirements",
      },
      "Bylaws Compliance": {
        url: "https://www.officialgazette.gov.ph/2008/02/17/republic-act-no-9520/",
        title: "RA 9520 - Philippine Cooperative Code of 2008",
        description: "Section 13: Bylaws requirements",
      },
      "Membership Verification": {
        url: "https://www.officialgazette.gov.ph/2008/02/17/republic-act-no-9520/",
        title: "RA 9520 - Philippine Cooperative Code of 2008",
        description: "Section 11: Membership requirements",
      },
      "Financial Report Submission": {
        url: "https://www.officialgazette.gov.ph/2008/02/17/republic-act-no-9520/",
        title: "RA 9520 - Philippine Cooperative Code of 2008",
        description: "Section 52: Financial report requirements",
      },
      "SEC Registration Validity": {
        url: "https://www.officialgazette.gov.ph/1980/05/01/batas-pambansa-bilang-68/",
        title: "BP 68 - Corporation Code of the Philippines",
        description: "Section 13: SEC registration requirements",
      },
      "Articles of Incorporation Compliance": {
        url: "https://www.officialgazette.gov.ph/1980/05/01/batas-pambansa-bilang-68/",
        title: "BP 68 - Corporation Code of the Philippines",
        description: "Section 14: Articles of incorporation requirements",
      },
      "Board Verification": {
        url: "https://www.officialgazette.gov.ph/1980/05/01/batas-pambansa-bilang-68/",
        title: "BP 68 - Corporation Code of the Philippines",
        description: "Section 23: Board composition requirements",
      },
      "Equipment Registration": {
        url: "https://denr.gov.ph/index.php/dao-2005-24",
        title: "DAO 2005-24 - Chainsaw Registration and Regulation",
        description: "Section 3: Equipment registration requirements",
      },
      "Safety Training Verification": {
        url: "https://denr.gov.ph/index.php/dao-2005-24",
        title: "DAO 2005-24 - Chainsaw Registration and Regulation",
        description: "Section 5: Safety training requirements",
      },
      "Storage Compliance": {
        url: "https://denr.gov.ph/index.php/dao-2005-24",
        title: "DAO 2005-24 - Chainsaw Registration and Regulation",
        description: "Section 6: Storage requirements",
      },
      "Usage Authorization": {
        url: "https://denr.gov.ph/index.php/dao-2005-24",
        title: "DAO 2005-24 - Chainsaw Registration and Regulation",
        description: "Section 7: Usage authorization requirements",
      },
      "Storage Location Safety": {
        url: "https://www.officialgazette.gov.ph/2008/01/03/republic-act-no-9514/",
        title: "RA 9514 - Fire Code of the Philippines",
        description: "Section 13: Storage safety requirements",
      },
      "Fire Safety Compliance": {
        url: "https://www.officialgazette.gov.ph/2008/01/03/republic-act-no-9514/",
        title: "RA 9514 - Fire Code of the Philippines",
        description: "Section 13: Fire safety requirements",
      },
      "Sales Area Verification": {
        url: "https://www.officialgazette.gov.ph/2008/01/03/republic-act-no-9514/",
        title: "RA 9514 - Fire Code of the Philippines",
        description: "Section 13: Sales area safety requirements",
      },
      "Permit Validity": {
        url: "https://www.officialgazette.gov.ph/2008/01/03/republic-act-no-9514/",
        title: "RA 9514 - Fire Code of the Philippines",
        description: "Section 9: Permit validity requirements",
      },
      "Event Permit Validity": {
        url: "https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/",
        title: "RA 7160 - Local Government Code of 1991",
        description: "Section 143: Event permit requirements",
      },
      "Stall Location Verification": {
        url: "https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/",
        title: "RA 7160 - Local Government Code of 1991",
        description: "Section 143: Stall location requirements",
      },
      "Health Compliance": {
        url: "https://www.officialgazette.gov.ph/1975/12/23/presidential-decree-no-856/",
        title: "PD 856 - Code on Sanitation of the Philippines",
        description: "Section 12: Health compliance requirements",
      },
      "Sales Authorization": {
        url: "https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/",
        title: "RA 7160 - Local Government Code of 1991",
        description: "Section 143: Sales authorization requirements",
      },
      "Route Authorization": {
        url: "https://www.officialgazette.gov.ph/1964/06/15/republic-act-no-4136/",
        title: "RA 4136 - Land Transportation and Traffic Code",
        description: "Section 27: Route authorization requirements",
      },
      "Health Certificate Validity": {
        url: "https://www.officialgazette.gov.ph/1975/12/23/presidential-decree-no-856/",
        title: "PD 856 - Code on Sanitation of the Philippines",
        description: "Section 12: Health certificate requirements",
      },
      "Identification Verification": {
        url: "https://www.officialgazette.gov.ph/2018/05/28/republic-act-no-11032/",
        title: "RA 11032 - Ease of Doing Business Act of 2018",
        description: "Section 5: Identification verification requirements",
      },
      "Vehicle/Equipment Compliance": {
        url: "https://www.officialgazette.gov.ph/1964/06/15/republic-act-no-4136/",
        title: "RA 4136 - Land Transportation and Traffic Code",
        description: "Section 27: Vehicle compliance requirements",
      },
      "Booth Location Verification": {
        url: "https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/",
        title: "RA 7160 - Local Government Code of 1991",
        description: "Section 143: Booth location requirements",
      },
      "Promotional Material Compliance": {
        url: "https://www.officialgazette.gov.ph/2000/06-07/act-no-7394/",
        title: "RA 7394 - Consumer Act of the Philippines",
        description: "Section 50: Promotional material requirements",
      },
      "Cemetery Permit Validity": {
        url: "https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/",
        title: "RA 7160 - Local Government Code of 1991",
        description: "Section 143: Cemetery permit requirements",
      },
      "Maintenance Compliance": {
        url: "https://www.officialgazette.gov.ph/1975/12/23/presidential-decree-no-856/",
        title: "PD 856 - Code on Sanitation of the Philippines",
        description: "Section 14: Maintenance requirements",
      },
      "Location Verification": {
        url: "https://www.officialgazette.gov.ph/1998/02/11/republic-act-no-8550/",
        title: "RA 8550 - Philippine Fisheries Code of 1998",
        description: "Section 51: Location verification requirements",
      },
      "BFAR Registration Validity": {
        url: "https://www.officialgazette.gov.ph/1998/02/11/republic-act-no-8550/",
        title: "RA 8550 - Philippine Fisheries Code of 1998",
        description: "Section 30: BFAR registration requirements",
      },
      "Environmental Compliance": {
        url: "https://www.officialgazette.gov.ph/2004/03/22/republic-act-no-9275/",
        title: "RA 9275 - Philippine Clean Water Act",
        description: "Section 8: Environmental compliance requirements",
      },
      "Size/Dimension Compliance": {
        url: "https://www.officialgazette.gov.ph/1998/02/11/republic-act-no-8550/",
        title: "RA 8550 - Philippine Fisheries Code of 1998",
        description: "Section 47: Size/dimension requirements",
      },
      "Water Quality Compliance": {
        url: "https://www.officialgazette.gov.ph/2004/03/22/republic-act-no-9275/",
        title: "RA 9275 - Philippine Clean Water Act",
        description: "Section 8: Water quality requirements",
      },
      "Fire Extinguisher Availability": {
        url: "https://www.officialgazette.gov.ph/2008/01/03/republic-act-no-9514/",
        title: "RA 9514 - Fire Code of the Philippines",
        description: "Section 13: Fire extinguisher requirements",
      },
      "Exit Signage Compliance": {
        url: "https://www.officialgazette.gov.ph/2008/01/03/republic-act-no-9514/",
        title: "RA 9514 - Fire Code of the Philippines",
        description: "Section 13: Exit signage requirements",
      },
      "Electrical Safety": {
        url: "https://www.officialgazette.gov.ph/2008/01/03/republic-act-no-9514/",
        title: "RA 9514 - Fire Code of the Philippines",
        description: "Section 10: Electrical safety requirements",
      },
      "Emergency Plan": {
        url: "https://www.officialgazette.gov.ph/2008/01/03/republic-act-no-9514/",
        title: "RA 9514 - Fire Code of the Philippines",
        description: "Section 7: Emergency plan requirements",
      },
      "Waste Disposal Compliance": {
        url: "https://www.officialgazette.gov.ph/1975/12/23/presidential-decree-no-856/",
        title: "PD 856 - Code on Sanitation of the Philippines",
        description: "Section 14: Waste disposal requirements",
      },
      "Food Handling Safety": {
        url: "https://www.officialgazette.gov.ph/1975/12/23/presidential-decree-no-856/",
        title: "PD 856 - Code on Sanitation of the Philippines",
        description: "Section 12: Food handling safety requirements",
      },
      "Staff Health Certificates": {
        url: "https://www.officialgazette.gov.ph/1975/12/23/presidential-decree-no-856/",
        title: "PD 856 - Code on Sanitation of the Philippines",
        description: "Section 12: Health certificate requirements",
      },
      "Facility Cleanliness": {
        url: "https://www.officialgazette.gov.ph/1975/12/23/presidential-decree-no-856/",
        title: "PD 856 - Code on Sanitation of the Philippines",
        description: "Section 14: Facility cleanliness requirements",
      },
      "Zoning Classification Verification": {
        url: "https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/",
        title: "RA 7160 - Local Government Code of 1991",
        description: "Section 447: Zoning classification requirements",
      },
      "Land Use Compliance": {
        url: "https://www.officialgazette.gov.ph/1991/10/10/republic-act-no-7160/",
        title: "RA 7160 - Local Government Code of 1991",
        description: "Section 447: Land use requirements",
      },
      "Setback Compliance": {
        url: "https://www.officialgazette.gov.ph/1977/02/27/presidential-decree-no-1096/",
        title: "PD 1096 - National Building Code of the Philippines",
        description: "Section 704: Setback requirements",
      },
      "Building Height Compliance": {
        url: "https://www.officialgazette.gov.ph/1977/02/27/presidential-decree-no-1096/",
        title: "PD 1096 - National Building Code of the Philippines",
        description: "Section 703: Building height requirements",
      },
    };

    let totalChecklists = 0;
    let totalInspectionItems = 0;
    let totalViolations = 0;
    let totalFees = 0;

    for (const doc of documents) {
      const config = documentConfig[doc.name];
      if (!config) {
        console.log("No config for:", doc.name);
        continue;
      }

      console.log("\\nCreating checklist for:", doc.name);

      // Create checklist
      const checklist = await Checklist.create({
        name: `${doc.name} Compliance`,
        description: `Compliance checklist for ${doc.name}`,
        documentId: doc._id,
        isActive: true,
        version: 1,
      });
      totalChecklists++;
      console.log("  Created checklist:", checklist._id.toString());

      // Create inspection items and violations
      for (let i = 0; i < config.length; i++) {
        const itemConfig = config[i];

        // Create violations and penalty fees first
        const violationConfigs = itemConfig.violations;
        const createdViolations = [];

        for (const violationConfig of violationConfigs) {
          // Create penalty fee
          const penaltyAmount = Math.floor(Math.random() * 1500) + 500; // 500-2000
          const penaltyFee = await Fee.create({
            name: `Penalty for ${violationConfig.name}`,
            amount: penaltyAmount,
            category: "penalty",
            isActive: true,
            version: 1,
          });
          totalFees++;

          // Create violation
          const violation = await Violation.create({
            name: violationConfig.name,
            description: `Violation: ${violationConfig.name}`,
            severity: violationConfig.severity,
            feeId: penaltyFee._id,
            legalBasis: [legalBasisConfig[itemConfig.name]],
            isActive: true,
            version: 1,
          });
          totalViolations++;
          createdViolations.push(violation);
        }

        // Create inspection item with first violation
        const inspectionItem = await InspectionItem.create({
          name: itemConfig.name,
          question: itemConfig.question,
          description: `Check for ${itemConfig.name}`,
          violationId: createdViolations[0]._id,
          legalBasis: [legalBasisConfig[itemConfig.name]],
          category: "compliance",
          isActive: true,
          version: 1,
        });
        totalInspectionItems++;
        console.log("    Created inspection item:", inspectionItem.name);

        // Add to checklist items
        checklist.items.push({
          inspectionItemId: inspectionItem._id,
          order: i + 1,
        });
      }

      await checklist.save();

      // Update document with checklistId
      await ClaimableDocument.findByIdAndUpdate(doc._id, {
        checklistId: checklist._id,
      });
      console.log("  Associated checklist with document");
    }

    console.log("\\n=== Summary ===");
    console.log("Total checklists created:", totalChecklists);
    console.log("Total inspection items created:", totalInspectionItems);
    console.log("Total violations created:", totalViolations);
    console.log("Total penalty fees created:", totalFees);

    mongoose.connection.close();
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
