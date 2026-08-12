/**
 * Seed permit forms from frontend metadata
 *
 * This script creates permit form records in the database based on the frontend form metadata.
 * It's designed to be called from the main index.js or from a seed runner.
 */

const PermitForm = require("../../../../shared/models/PermitForm");
const Fee = require("../../../../shared/models/Fee");
const logger = require("../lib/logger");

/**
 * The section definitions below declare fields by label only. `key` is what the
 * rendered form uses as its Ant Design field name, and PermitFormSchema defaults it
 * to "" -- so seeding without keys makes every field share the form path "", causing
 * unrelated fields to read and write each other's values.
 *
 * Keys are therefore derived from labels here, using the same slugify + uniqueness
 * rules as scripts/backfillPermitFormKeys.js so seeded and backfilled forms agree.
 */
function slugifyLabelToKey(label) {
  if (!label || typeof label !== "string") return "";
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(" ")
      .map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
      .join("") || ""
  );
}

function uniqueKeyFrom(label, taken) {
  const baseKey = slugifyLabelToKey(label);
  if (!baseKey) return `field_${Math.random().toString(36).slice(2, 11)}`;

  let key = baseKey;
  let counter = 1;
  while (taken.includes(key)) {
    key = `${baseKey}${counter}`;
    counter++;
  }
  taken.push(key);
  return key;
}

/** Assign keys to metadataFields, unique within their own array. */
function withMetadataKeys(metadataFields, fallbackLabel) {
  if (!Array.isArray(metadataFields)) return metadataFields;
  const taken = metadataFields.filter((m) => m && m.key).map((m) => m.key);
  return metadataFields.map((metaField) => {
    if (!metaField || metaField.key) return metaField;
    return {
      ...metaField,
      key: uniqueKeyFrom(metaField.label || `${fallbackLabel} Metadata`, taken),
    };
  });
}

/**
 * Returns a copy of `sections` with `key` populated on every item, `id` on every
 * object dropdown option, and `key` on every metadataFields entry.
 */
function withGeneratedKeys(sections) {
  if (!Array.isArray(sections)) return sections;

  return sections.map((section) => {
    const itemKeys = (section.items || [])
      .filter((i) => i && i.key)
      .map((i) => i.key);

    return {
      ...section,
      items: (section.items || []).map((item) => {
        if (!item) return item;

        const next = {
          ...item,
          key: item.key || uniqueKeyFrom(item.label, itemKeys),
        };

        if (Array.isArray(item.metadataFields)) {
          next.metadataFields = withMetadataKeys(
            item.metadataFields,
            item.label,
          );
        }

        if (Array.isArray(item.groupFields)) {
          const groupKeys = item.groupFields
            .filter((g) => g && g.key)
            .map((g) => g.key);
          next.groupFields = item.groupFields.map((groupField) =>
            !groupField || groupField.key
              ? groupField
              : {
                  ...groupField,
                  key: uniqueKeyFrom(groupField.label, groupKeys),
                },
          );
        }

        if (Array.isArray(item.dropdownOptions)) {
          const optionIds = item.dropdownOptions
            .filter((o) => o && typeof o === "object" && o.id)
            .map((o) => o.id);

          next.dropdownOptions = item.dropdownOptions.map((option) => {
            if (!option || typeof option !== "object") return option;

            const nextOption = {
              ...option,
              id: option.id || uniqueKeyFrom(option.label, optionIds),
            };

            if (Array.isArray(option.metadataFields)) {
              nextOption.metadataFields = withMetadataKeys(
                option.metadataFields,
                option.label || item.label,
              );
            }

            return nextOption;
          });
        }

        return next;
      }),
    };
  });
}

// Section definitions sourced from the legacy frontend formDefinitions.constants.js
// (now removed from the frontend; these are the canonical seed definitions).
const UNIFIED_BUSINESS_PERMIT_SECTIONS = [
  {
    sectionName: "Required Documents",
    type: "required_documents",
    description:
      "Upload government-issued IDs, business registration certificates, and other required documents to verify your business eligibility and compliance with LGU regulations",
    notes:
      "Applicant/owner details are taken from the PIS (account registration)",
    items: [
      {
        label: "Valid Government-Issued ID of the Business Owner",
        type: "category_upload",
        required: true,
        notes: "",
        helpText:
          "Upload a valid government-issued ID to verify your identity and business ownership for permit application",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [
          {
            label: "Philippine Passport",
            metadataFields: [
              {
                label: "ID Number",
                type: "text",
                required: true,
                placeholder: "Enter ID number",
              },
              { label: "Date of Issue", type: "date", required: true },
              { label: "Expiry Date", type: "date", required: false },
              {
                label: "Place Issued",
                type: "text",
                required: true,
                placeholder: "Enter city/municipality",
              },
            ],
          },
          {
            label: "Driver's License",
            metadataFields: [
              {
                label: "ID Number",
                type: "text",
                required: true,
                placeholder: "Enter ID number",
              },
              { label: "Date of Issue", type: "date", required: true },
              { label: "Expiry Date", type: "date", required: false },
              {
                label: "Place Issued",
                type: "text",
                required: true,
                placeholder: "Enter city/municipality",
              },
            ],
          },
          {
            label: "SSS UMID Card",
            metadataFields: [
              {
                label: "ID Number",
                type: "text",
                required: true,
                placeholder: "Enter ID number",
              },
              { label: "Date of Issue", type: "date", required: true },
              { label: "Expiry Date", type: "date", required: false },
              {
                label: "Place Issued",
                type: "text",
                required: true,
                placeholder: "Enter city/municipality",
              },
            ],
          },
          {
            label: "PhilSys National ID",
            metadataFields: [
              {
                label: "ID Number",
                type: "text",
                required: true,
                placeholder: "Enter ID number",
              },
              { label: "Date of Issue", type: "date", required: true },
              { label: "Expiry Date", type: "date", required: false },
              {
                label: "Place Issued",
                type: "text",
                required: true,
                placeholder: "Enter city/municipality",
              },
            ],
          },
          {
            label: "Voter's ID",
            metadataFields: [
              {
                label: "ID Number",
                type: "text",
                required: true,
                placeholder: "Enter ID number",
              },
              { label: "Date of Issue", type: "date", required: true },
              { label: "Expiry Date", type: "date", required: false },
              {
                label: "Place Issued",
                type: "text",
                required: true,
                placeholder: "Enter city/municipality",
              },
            ],
          },
          {
            label: "Postal ID",
            metadataFields: [
              {
                label: "ID Number",
                type: "text",
                required: true,
                placeholder: "Enter ID number",
              },
              { label: "Date of Issue", type: "date", required: true },
              { label: "Expiry Date", type: "date", required: false },
              {
                label: "Place Issued",
                type: "text",
                required: true,
                placeholder: "Enter city/municipality",
              },
            ],
          },
          {
            label: "Senior Citizen ID",
            metadataFields: [
              {
                label: "ID Number",
                type: "text",
                required: true,
                placeholder: "Enter ID number",
              },
              { label: "Date of Issue", type: "date", required: true },
              { label: "Expiry Date", type: "date", required: false },
              {
                label: "Place Issued",
                type: "text",
                required: true,
                placeholder: "Enter city/municipality",
              },
            ],
          },
          {
            label: "PWD ID",
            metadataFields: [
              {
                label: "ID Number",
                type: "text",
                required: true,
                placeholder: "Enter ID number",
              },
              { label: "Date of Issue", type: "date", required: true },
              { label: "Expiry Date", type: "date", required: false },
              {
                label: "Place Issued",
                type: "text",
                required: true,
                placeholder: "Enter city/municipality",
              },
            ],
          },
        ],
      },
      {
        label: "Business Registration Certificate",
        type: "category_upload",
        required: true,
        notes: "",
        helpText:
          "Upload your business registration certificate to verify your business legal status and ownership for permit application",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [
          {
            label: "Sole Proprietorship",
            definition: "A business owned and operated by a single individual",
            whereToGet:
              "you can acquire a DTI Certificate from your provincial office",
            metadataFields: [
              {
                label: "Registration Number",
                type: "text",
                required: true,
                placeholder: "Enter registration number",
              },
              { label: "Date of Registration", type: "date", required: true },
            ],
          },
          {
            label: "Corporation",
            definition:
              "A legal entity separate from its owners with limited liability",
            whereToGet:
              "you can acquire a SEC Registration Certificate from SEC office",
            metadataFields: [
              {
                label: "Registration Number",
                type: "text",
                required: true,
                placeholder: "Enter registration number",
              },
              { label: "Date of Registration", type: "date", required: true },
            ],
          },
          {
            label: "Partnership",
            definition:
              "A business owned by two or more individuals who share profits and losses",
            whereToGet:
              "you can acquire a SEC Registration Certificate from SEC office",
            metadataFields: [
              {
                label: "Registration Number",
                type: "text",
                required: true,
                placeholder: "Enter registration number",
              },
              { label: "Date of Registration", type: "date", required: true },
            ],
          },
          {
            label: "Cooperative",
            definition:
              "An organization owned and operated for the benefit of its members",
            whereToGet:
              "you can acquire a CDA Certificate from CDA regional office",
            metadataFields: [
              {
                label: "Registration Number",
                type: "text",
                required: true,
                placeholder: "Enter registration number",
              },
              { label: "Date of Registration", type: "date", required: true },
            ],
          },
        ],
      },
      {
        label: "Proof of Business Premises",
        type: "category_upload",
        required: false,
        notes: "",
        helpText:
          "Upload proof of your right to use the business premises to verify your business location compliance with LGU zoning regulations",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [
          {
            label: "Lease Contract",
            definition:
              "A written agreement between a landlord and tenant for the use of property",
            whereToGet:
              "you can acquire this from your landlord or property owner",
            metadataFields: [
              {
                label: "Contract Number",
                type: "text",
                required: true,
                placeholder: "Enter contract number",
              },
              { label: "Date of Contract", type: "date", required: true },
              {
                label: "Property Address",
                type: "address_alaminos",
                required: true,
              },
              {
                label: "Landlord Name",
                type: "text",
                required: true,
                placeholder: "Enter landlord name",
              },
              {
                label: "Monthly Rental (₱)",
                type: "number",
                required: true,
                placeholder: "Enter monthly rental amount",
              },
              { label: "Landlord Address", type: "address", required: true },
            ],
          },
          {
            label: "Contract of Sale",
            definition:
              "A legal document that transfers ownership of property from seller to buyer",
            whereToGet:
              "you can acquire this from the seller or through a notary public",
            metadataFields: [
              {
                label: "Contract Number",
                type: "text",
                required: true,
                placeholder: "Enter contract number",
              },
              { label: "Date of Contract", type: "date", required: true },
              {
                label: "Property Address",
                type: "address_alaminos",
                required: true,
              },
            ],
          },
          {
            label: "Land Title",
            definition:
              "A legal document proving ownership of land or property",
            whereToGet:
              "you can acquire this from the Registry of Deeds or Land Registration Authority",
            metadataFields: [
              {
                label: "Title Number",
                type: "text",
                required: true,
                placeholder: "Enter title number",
              },
              { label: "Date of Registration", type: "date", required: true },
              {
                label: "Property Address",
                type: "address_alaminos",
                required: true,
              },
            ],
          },
        ],
      },
      {
        label: "Occupancy Permit",
        type: "category_upload",
        required: true,
        notes: "",
        helpText:
          "Upload occupancy certificate to verify your building meets safety and building code requirements for business operation",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [
          {
            label: "Own Building",
            definition: "You own the building where your business operates",
            whereToGet:
              "You can acquire this from the City Engineering Office or Building Official",
            metadataFields: [
              {
                label: "Permit Number",
                type: "text",
                required: true,
                placeholder: "Enter permit number",
              },
              { label: "Date Issued", type: "date", required: true },
              {
                label: "Building Name/Number",
                type: "text",
                required: true,
                placeholder: "Enter building name or number",
              },
              {
                label: "Floor Area (sqm)",
                type: "text",
                required: false,
                placeholder: "Enter floor area in sqm",
              },
              {
                label: "Building Value (₱)",
                type: "number",
                required: false,
                placeholder: "Enter declared building value",
              },
            ],
          },
          {
            label: "Leased Property",
            definition: "You lease the property where your business operates",
            whereToGet: "You can acquire this from the building owner",
            metadataFields: [
              {
                label: "Permit Number",
                type: "text",
                required: true,
                placeholder: "Enter permit number",
              },
              { label: "Date Issued", type: "date", required: true },
              {
                label: "Building Name/Number",
                type: "text",
                required: true,
                placeholder: "Enter building name or number",
              },
              {
                label: "Floor Area (sqm)",
                type: "text",
                required: false,
                placeholder: "Enter floor area in sqm",
              },
              {
                label: "Monthly Rental (₱)",
                type: "number",
                required: true,
                placeholder: "Enter monthly rental amount",
              },
              {
                label: "Landlord Name",
                type: "text",
                required: true,
                placeholder: "Enter landlord name",
              },
              { label: "Landlord Address", type: "address", required: true },
            ],
          },
        ],
      },
      {
        label: "Barangay Business Clearance",
        type: "file",
        required: true,
        notes: "",
        helpText:
          "Upload barangay clearance to verify your business operates within the barangay jurisdiction and complies with local requirements",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [
          {
            label: "Clearance Number",
            type: "text",
            required: true,
            placeholder: "Enter clearance number",
          },
          { label: "Date Issued", type: "date", required: true },
          {
            label: "Barangay Name",
            type: "text",
            required: true,
            placeholder: "Enter barangay name",
          },
        ],
      },
      {
        label: "Community Tax Certificate (CTC / Cedula)",
        type: "file",
        required: true,
        notes: "",
        helpText:
          "Upload CTC to verify you have paid your community tax obligations to the LGU",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [
          {
            label: "CTC Number",
            type: "text",
            required: true,
            placeholder: "Enter CTC number",
          },
          { label: "Date Issued", type: "date", required: true },
          {
            label: "Place Issued",
            type: "text",
            required: true,
            placeholder: "Enter city/municipality",
          },
        ],
      },
    ],
  },
  {
    sectionName: "Business Information",
    description:
      "Provide your business name, address, contact information, and tax identification number for official business registration and tax purposes",
    notes: "",
    items: [
      {
        label: "Business / Trade / Doing Business As Name",
        type: "text",
        isBusinessName: true,
        required: true,
        notes: "",
        helpText: "As registered with DTI / SEC / CDA",
        placeholder: "Enter business name",
        span: 24,
        validation: { minLength: 2, maxLength: 200 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "Business address",
        type: "address_alaminos",
        required: true,
        notes: "",
        helpText: "Physical location of the business",
        placeholder: "",
        span: 24,
        validation: {},
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "Business telephone / mobile number",
        type: "text",
        required: false,
        notes: "",
        helpText: "",
        placeholder: "e.g. 09171234567",
        span: 12,
        validation: { maxLength: 15 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "Business email",
        type: "text",
        required: false,
        notes: "",
        helpText: "",
        placeholder: "e.g. business@example.com",
        span: 12,
        validation: { maxLength: 200 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "TIN (Tax Identification Number)",
        type: "text",
        required: true,
        notes: "",
        helpText: "",
        placeholder: "e.g. 123-456-789-000",
        span: 24,
        validation: { minLength: 9, maxLength: 20 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
    ],
  },
  {
    sectionName: "Line of Business",
    type: "lob_section",
    description:
      "Select your business category and classification to determine applicable fees and requirements.",
    notes: "This section uses prebuilt LOB selection interface",
    items: [],
  },
];

const COOPERATIVE_PERMIT_SECTIONS = [
  {
    sectionName: "Required Documents",
    type: "required_documents",
    description:
      "Upload the required documents to verify your cooperative eligibility and compliance with local cooperative regulations.",
    notes:
      "Applicant/owner details are taken from the PIS (account registration)",
    items: [
      {
        label: "Community Tax Certificate (CTC)",
        type: "file",
        required: true,
        notes: "",
        helpText:
          "Upload your Community Tax Certificate to verify you have paid your local taxes for business operation",
        whereToGet:
          "You can acquire this from your local City Treasurer's Office",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [
          {
            label: "CTC Number",
            type: "text",
            required: true,
            placeholder: "Enter CTC number",
          },
          { label: "Date Issued", type: "date", required: true },
          {
            label: "Place Issued",
            type: "text",
            required: true,
            placeholder: "Enter city/municipality",
          },
        ],
      },
      {
        label: "Barangay Clearance where business is located",
        type: "file",
        required: true,
        notes: "",
        helpText:
          "Upload barangay business clearance to verify your business has been cleared to operate in the barangay",
        whereToGet: "You can acquire this from your barangay captain's office",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [
          {
            label: "Clearance Number",
            type: "text",
            required: true,
            placeholder: "Enter clearance number",
          },
          { label: "Date Issued", type: "date", required: true },
          {
            label: "Barangay Name",
            type: "text",
            required: true,
            placeholder: "Enter barangay name",
          },
        ],
      },
      {
        label: "Cooperative Development Authority Registration",
        type: "category_upload",
        required: true,
        notes: "",
        helpText:
          "Upload your CDA registration certificate to verify your cooperative is legally registered with the Cooperative Development Authority",
        whereToGet:
          "You can acquire this from the CDA regional office or via CDA online registration system",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [
          {
            label: "NEW Registration",
            definition:
              "Certificate of Registration for newly registered cooperatives",
            whereToGet:
              "You can acquire this from the CDA regional office upon initial registration",
            metadataFields: [
              {
                label: "CDA Registration Number",
                type: "text",
                required: true,
                placeholder: "Enter CDA registration number",
              },
              { label: "Date of Registration", type: "date", required: true },
            ],
          },
          {
            label: "RENEWAL Registration",
            definition: "Certificate of Registration for cooperative renewals",
            whereToGet:
              "You can acquire this from the CDA regional office upon renewal",
            metadataFields: [
              {
                label: "CDA Registration Number",
                type: "text",
                required: true,
                placeholder: "Enter CDA registration number",
              },
              { label: "Date of Renewal", type: "date", required: true },
            ],
          },
        ],
      },
      {
        label: "Certificate of Compliance from City Cooperatives Office",
        type: "file",
        required: true,
        notes: "",
        helpText:
          "Upload certificate of compliance from the City Cooperatives Office to verify your cooperative meets local cooperative standards",
        whereToGet: "You can acquire this from the City Cooperatives Office",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label:
          "Contract of Lease and xerox copy of Mayor's Permit of Lessor (if lessee)",
        type: "file",
        required: false,
        notes: "",
        helpText:
          "Upload contract of lease and lessor's Mayor's Permit if you are leasing the property for your cooperative operations",
        whereToGet:
          "You can acquire the contract of lease from your landlord and the Mayor's Permit from the City Mayor's Office",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
    ],
  },
  {
    sectionName: "Activity Details",
    description:
      "Provide details about your cooperative operations, including business name, location, duration, and nature of activities",
    notes: "",
    items: [
      {
        label: "Business / activity name",
        type: "text",
        isBusinessName: true,
        required: true,
        notes: "",
        helpText: "",
        placeholder: "Enter name of cooperative or activity",
        span: 24,
        validation: { minLength: 2, maxLength: 200 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "Location of activity",
        type: "address_alaminos",
        required: true,
        notes: "",
        helpText: "Where the cooperative or activity is located",
        placeholder: "",
        span: 24,
        validation: {},
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "Duration of activity",
        type: "date_range",
        required: false,
        notes: "",
        helpText: "For temporary activities, specify the start and end dates",
        placeholder: "",
        span: 24,
        validation: {},
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "Brief description of activity",
        type: "textarea",
        required: false,
        notes: "",
        helpText: "",
        placeholder: "Describe the cooperative activities...",
        span: 24,
        validation: { maxLength: 1000 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
    ],
  },
];

const ASSOCIATION_FOUNDATION_PERMIT_SECTIONS = [
  {
    sectionName: "Required Documents",
    type: "required_documents",
    description:
      "Upload the required documents to verify your association or foundation eligibility and compliance with LGU regulations.",
    notes:
      "Applicant/owner details are taken from the PIS (account registration)",
    items: [
      {
        label: "Community Tax Certificate (CTC)",
        type: "file",
        required: true,
        notes: "",
        helpText:
          "Upload your Community Tax Certificate to verify you have paid your local taxes for business operation",
        whereToGet:
          "You can acquire this from your local City Treasurer's Office",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [
          {
            label: "CTC Number",
            type: "text",
            required: true,
            placeholder: "Enter CTC number",
          },
          { label: "Date Issued", type: "date", required: true },
          {
            label: "Place Issued",
            type: "text",
            required: true,
            placeholder: "Enter city/municipality",
          },
        ],
      },
      {
        label: "Barangay Clearance where business is located",
        type: "file",
        required: true,
        notes: "",
        helpText:
          "Upload barangay business clearance to verify your business has been cleared to operate in the barangay",
        whereToGet: "You can acquire this from your barangay captain's office",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [
          {
            label: "Clearance Number",
            type: "text",
            required: true,
            placeholder: "Enter clearance number",
          },
          { label: "Date Issued", type: "date", required: true },
          {
            label: "Barangay Name",
            type: "text",
            required: true,
            placeholder: "Enter barangay name",
          },
        ],
      },
      {
        label: "Registration Certificate",
        type: "category_upload",
        required: true,
        notes: "",
        helpText:
          "Upload your registration certificate to verify your organization is legally registered with the appropriate government agency",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [
          {
            label: "SEC Registration",
            definition:
              "Securities and Exchange Commission registration for corporations, partnerships, and associations",
            whereToGet:
              "You can acquire this from the SEC office or via SEC online registration system",
            metadataFields: [
              {
                label: "SEC Registration Number",
                type: "text",
                required: true,
                placeholder: "Enter SEC registration number",
              },
              { label: "Date of Registration", type: "date", required: true },
            ],
          },
          {
            label: "DOLE Registration",
            definition:
              "Department of Labor and Employment registration for labor organizations and worker associations",
            whereToGet: "You can acquire this from the DOLE regional office",
            metadataFields: [
              {
                label: "DOLE Registration Number",
                type: "text",
                required: true,
                placeholder: "Enter DOLE registration number",
              },
              { label: "Date of Registration", type: "date", required: true },
            ],
          },
        ],
      },
    ],
  },
  {
    sectionName: "Activity Details",
    description:
      "Provide details about your association or foundation operations, including organization name, location, duration, and nature of activities",
    notes: "",
    items: [
      {
        label: "Business / activity name",
        type: "text",
        isBusinessName: true,
        required: true,
        notes: "",
        helpText: "",
        placeholder: "Enter name of association/foundation or activity",
        span: 24,
        validation: { minLength: 2, maxLength: 200 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "Location of activity",
        type: "address_alaminos",
        required: true,
        notes: "",
        helpText: "Where the association/foundation or activity is located",
        placeholder: "",
        span: 24,
        validation: {},
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "Duration of activity",
        type: "date_range",
        required: false,
        notes: "",
        helpText: "For temporary activities, specify the start and end dates",
        placeholder: "",
        span: 24,
        validation: {},
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "Brief description of activity",
        type: "textarea",
        required: false,
        notes: "",
        helpText: "",
        placeholder: "Describe the association/foundation activities...",
        span: 24,
        validation: { maxLength: 1000 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
    ],
  },
];

const CHAINSAW_PERMIT_SECTIONS = [
  {
    sectionName: "Required Documents",
    type: "required_documents",
    description:
      "Upload the required documents to verify your chainsaw permit eligibility and compliance with LGU regulations.",
    notes:
      "Applicant/owner details are taken from the PIS (account registration)",
    items: [
      {
        label: "Community Tax Certificate (CTC)",
        type: "file",
        required: true,
        notes: "",
        helpText:
          "Upload your Community Tax Certificate to verify you have paid your local taxes for business operation",
        whereToGet:
          "You can acquire this from your local City Treasurer's Office",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [
          {
            label: "CTC Number",
            type: "text",
            required: true,
            placeholder: "Enter CTC number",
          },
          { label: "Date Issued", type: "date", required: true },
          {
            label: "Place Issued",
            type: "text",
            required: true,
            placeholder: "Enter city/municipality",
          },
        ],
      },
      {
        label: "Barangay Clearance where business is located",
        type: "file",
        required: true,
        notes: "",
        helpText:
          "Upload barangay business clearance to verify your business has been cleared to operate in the barangay",
        whereToGet: "You can acquire this from your barangay captain's office",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [
          {
            label: "Clearance Number",
            type: "text",
            required: true,
            placeholder: "Enter clearance number",
          },
          { label: "Date Issued", type: "date", required: true },
          {
            label: "Barangay Name",
            type: "text",
            required: true,
            placeholder: "Enter barangay name",
          },
        ],
      },
      {
        label: "Certification of Chainsaw Ownership",
        type: "file",
        required: true,
        notes: "",
        helpText:
          "Upload certification of chainsaw ownership to verify you legally own the chainsaw equipment",
        whereToGet:
          "You can acquire this from the DENR or local environment office",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "Stencil of Chainsaw Serial No.",
        type: "file",
        required: true,
        notes: "",
        helpText:
          "Upload a clear stencil or rubbing of the chainsaw serial number for equipment identification",
        whereToGet:
          "You can create this by placing paper over the serial number and rubbing with a pencil",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
    ],
  },
  {
    sectionName: "Activity Details",
    description:
      "Provide details about your chainsaw operations, including business name, location, duration, and nature of activities",
    notes: "",
    items: [
      {
        label: "Business / activity name",
        type: "text",
        isBusinessName: true,
        required: true,
        notes: "",
        helpText: "",
        placeholder: "Enter name of business or activity",
        span: 24,
        validation: { minLength: 2, maxLength: 200 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "Location of activity",
        type: "address_alaminos",
        required: true,
        notes: "",
        helpText: "Where the chainsaw activity is located",
        placeholder: "",
        span: 24,
        validation: {},
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "Duration of activity",
        type: "date_range",
        required: false,
        notes: "",
        helpText: "For temporary activities, specify the start and end dates",
        placeholder: "",
        span: 24,
        validation: {},
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "Brief description of activity",
        type: "textarea",
        required: false,
        notes: "",
        helpText: "",
        placeholder: "Describe the chainsaw activities...",
        span: 24,
        validation: { maxLength: 1000 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
    ],
  },
];

const FIRECRACKERS_STALLHOLDERS_PERMIT_SECTIONS = [
  {
    sectionName: "Required Documents",
    type: "required_documents",
    description:
      "Upload the required documents to verify your firecrackers stallholder eligibility and compliance with LGU regulations.",
    notes:
      "Applicant/owner details are taken from the PIS (account registration)",
    items: [
      {
        label: "Community Tax Certificate (CTC)",
        type: "file",
        required: true,
        notes: "",
        helpText:
          "Upload your Community Tax Certificate to verify you have paid your local taxes for business operation",
        whereToGet:
          "You can acquire this from your local City Treasurer's Office",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [
          {
            label: "CTC Number",
            type: "text",
            required: true,
            placeholder: "Enter CTC number",
          },
          { label: "Date Issued", type: "date", required: true },
          {
            label: "Place Issued",
            type: "text",
            required: true,
            placeholder: "Enter city/municipality",
          },
        ],
      },
      {
        label: "Barangay Clearance where business is located",
        type: "file",
        required: true,
        notes: "",
        helpText:
          "Upload barangay business clearance to verify your business has been cleared to operate in the barangay",
        whereToGet: "You can acquire this from your barangay captain's office",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [
          {
            label: "Clearance Number",
            type: "text",
            required: true,
            placeholder: "Enter clearance number",
          },
          { label: "Date Issued", type: "date", required: true },
          {
            label: "Barangay Name",
            type: "text",
            required: true,
            placeholder: "Enter barangay name",
          },
        ],
      },
      {
        label:
          "Letter of Approval by City Market and Cemetery Section Head with assessment of fees",
        type: "file",
        required: true,
        notes: "",
        helpText:
          "Upload letter of approval from the City Market and Cemetery Section Head with fee assessment",
        whereToGet:
          "You can acquire this from the City Market and Cemetery Section Office",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label:
          "Authenticated photocopy of Dealers/Manufacturer's License of Source from Camp Crame",
        type: "file",
        required: true,
        notes: "",
        helpText:
          "Upload authenticated photocopy of the dealer's or manufacturer's license from PNP-Camp Crame to verify legal sourcing of firecrackers",
        whereToGet:
          "You can acquire this from the Philippine National Police (PNP) at Camp Crame",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "Authorization/Certification of Dealers/Licensee of Source",
        type: "file",
        required: true,
        notes: "",
        helpText:
          "Upload authorization or certification from your dealer or licensee confirming your source of firecrackers",
        whereToGet:
          "You can acquire this from your authorized firecrackers dealer or licensee",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "Fireworks Retailers Seminar Certificate",
        type: "file",
        required: true,
        notes: "",
        helpText:
          "Upload certificate of completion from the Fireworks Retailers Seminar to verify you have completed safety training",
        whereToGet:
          "You can acquire this by attending the Fireworks Retailers Seminar conducted by PNP or LGU",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
    ],
  },
  {
    sectionName: "Activity Details",
    description:
      "Provide details about your firecrackers stall, including business name, location, duration, and nature of activities",
    notes: "",
    items: [
      {
        label: "Business / activity name",
        type: "text",
        isBusinessName: true,
        required: true,
        notes: "",
        helpText: "",
        placeholder: "Enter name of business or stall",
        span: 24,
        validation: { minLength: 2, maxLength: 200 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "Location of activity",
        type: "address_alaminos",
        required: true,
        notes: "",
        helpText: "Where the stall will be located",
        placeholder: "",
        span: 24,
        validation: {},
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "Duration of activity",
        type: "date_range",
        required: false,
        notes: "",
        helpText: "For temporary permits, specify the start and end dates",
        placeholder: "",
        span: 24,
        validation: {},
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "Brief description of activity",
        type: "textarea",
        required: false,
        notes: "",
        helpText: "",
        placeholder: "Describe the firecrackers stall activity...",
        span: 24,
        validation: { maxLength: 1000 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
    ],
  },
];

const BAZAAR_FESTIVAL_VENDORS_PERMIT_SECTIONS = [
  {
    sectionName: "Required Documents",
    type: "required_documents",
    description:
      "Upload the required documents to verify your bazaar/festival vendor eligibility and compliance with LGU regulations.",
    notes:
      "Applicant/owner details are taken from the PIS (account registration)",
    items: [
      {
        label: "Community Tax Certificate (CTC)",
        type: "file",
        required: true,
        notes: "",
        helpText:
          "Upload your Community Tax Certificate to verify you have paid your local taxes for business operation",
        whereToGet:
          "You can acquire this from your local City Treasurer's Office",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [
          {
            label: "CTC Number",
            type: "text",
            required: true,
            placeholder: "Enter CTC number",
          },
          { label: "Date Issued", type: "date", required: true },
          {
            label: "Place Issued",
            type: "text",
            required: true,
            placeholder: "Enter city/municipality",
          },
        ],
      },
      {
        label: "Barangay Clearance where business is located",
        type: "file",
        required: true,
        notes: "",
        helpText:
          "Upload barangay business clearance to verify your business has been cleared to operate in the barangay",
        whereToGet: "You can acquire this from your barangay captain's office",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [
          {
            label: "Clearance Number",
            type: "text",
            required: true,
            placeholder: "Enter clearance number",
          },
          { label: "Date Issued", type: "date", required: true },
          {
            label: "Barangay Name",
            type: "text",
            required: true,
            placeholder: "Enter barangay name",
          },
        ],
      },
      {
        label: "Certification from City Tourism Office (Lucap Wharf only)",
        type: "file",
        required: false,
        notes: "",
        helpText:
          "Upload certification from the City Tourism Office if your stall will be located at Lucap Wharf",
        whereToGet: "You can acquire this from the City Tourism Office",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label:
          "Letter of Approval by City Market and Cemetery Section Head with assessment of fees",
        type: "file",
        required: true,
        notes: "",
        helpText:
          "Upload letter of approval from the City Market and Cemetery Section Head with fee assessment",
        whereToGet:
          "You can acquire this from the City Market and Cemetery Section Office",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
    ],
  },
  {
    sectionName: "Activity Details",
    description:
      "Provide details about your bazaar or festival stall, including business name, location, duration, and nature of activities",
    notes: "",
    items: [
      {
        label: "Business / activity name",
        type: "text",
        isBusinessName: true,
        required: true,
        notes: "",
        helpText: "",
        placeholder: "Enter name of business or stall",
        span: 24,
        validation: { minLength: 2, maxLength: 200 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "Location of activity",
        type: "address_alaminos",
        required: true,
        notes: "",
        helpText: "Where the stall will be located",
        placeholder: "",
        span: 24,
        validation: {},
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "Duration of activity",
        type: "date_range",
        required: false,
        notes: "",
        helpText: "For temporary permits, specify the start and end dates",
        placeholder: "",
        span: 24,
        validation: {},
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "Brief description of activity",
        type: "textarea",
        required: false,
        notes: "",
        helpText: "",
        placeholder: "Describe the bazaar/festival stall activity...",
        span: 24,
        validation: { maxLength: 1000 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
    ],
  },
];

const PEDDLERS_PERMIT_SECTIONS = [
  {
    sectionName: "Required Documents",
    type: "required_documents",
    description:
      "Upload the required documents to verify your peddler eligibility and compliance with LGU regulations.",
    notes:
      "Applicant/owner details are taken from the PIS (account registration)",
    items: [
      {
        label: "Community Tax Certificate (CTC)",
        type: "file",
        required: true,
        notes: "",
        helpText:
          "Upload your Community Tax Certificate to verify you have paid your local taxes for business operation",
        whereToGet:
          "You can acquire this from your local City Treasurer's Office",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [
          {
            label: "CTC Number",
            type: "text",
            required: true,
            placeholder: "Enter CTC number",
          },
          { label: "Date Issued", type: "date", required: true },
          {
            label: "Place Issued",
            type: "text",
            required: true,
            placeholder: "Enter city/municipality",
          },
        ],
      },
      {
        label: "Barangay Clearance where business is located",
        type: "file",
        required: true,
        notes: "",
        helpText:
          "Upload barangay business clearance to verify your business has been cleared to operate in the barangay",
        whereToGet: "You can acquire this from your barangay captain's office",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [
          {
            label: "Clearance Number",
            type: "text",
            required: true,
            placeholder: "Enter clearance number",
          },
          { label: "Date Issued", type: "date", required: true },
          {
            label: "Barangay Name",
            type: "text",
            required: true,
            placeholder: "Enter barangay name",
          },
        ],
      },
      {
        label: "Certification from City Tourism Office (Lucap Wharf only)",
        type: "file",
        required: false,
        notes: "",
        helpText:
          "Upload certification from the City Tourism Office if your peddling activity will be at Lucap Wharf",
        whereToGet: "You can acquire this from the City Tourism Office",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label:
          "Letter of Approval by City Market and Cemetery Section Head with assessment of fees",
        type: "file",
        required: true,
        notes: "",
        helpText:
          "Upload letter of approval from the City Market and Cemetery Section Head with fee assessment",
        whereToGet:
          "You can acquire this from the City Market and Cemetery Section Office",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
    ],
  },
  {
    sectionName: "Activity Details",
    description:
      "Provide details about your peddling activities, including business name, location, duration, and nature of activities",
    notes: "",
    items: [
      {
        label: "Business / activity name",
        type: "text",
        isBusinessName: true,
        required: true,
        notes: "",
        helpText: "",
        placeholder: "Enter name of business or activity",
        span: 24,
        validation: { minLength: 2, maxLength: 200 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "Location of activity",
        type: "address_alaminos",
        required: true,
        notes: "",
        helpText: "Where the peddling activity is located",
        placeholder: "",
        span: 24,
        validation: {},
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "Duration of activity",
        type: "date_range",
        required: false,
        notes: "",
        helpText: "For temporary activities, specify the start and end dates",
        placeholder: "",
        span: 24,
        validation: {},
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "Brief description of activity",
        type: "textarea",
        required: false,
        notes: "",
        helpText: "",
        placeholder: "Describe the peddling activity...",
        span: 24,
        validation: { maxLength: 1000 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
    ],
  },
];

const PROMOTIONS_EXHIBITORS_PERMIT_SECTIONS = [
  {
    sectionName: "Required Documents",
    type: "required_documents",
    description:
      "Upload the required documents to verify your promotion/exhibitor eligibility and compliance with LGU regulations.",
    notes:
      "Applicant/owner details are taken from the PIS (account registration)",
    items: [
      {
        label: "Request letter approved by City Administrator",
        type: "file",
        required: true,
        notes: "",
        helpText:
          "Upload your request letter that has been approved by the City Administrator for your promotional or exhibition activity",
        whereToGet:
          "You can acquire this by submitting a request letter to the City Administrator's Office for approval",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label:
          "Letter of Approval by City Market and Cemetery Section Head with assessment of fees",
        type: "file",
        required: true,
        notes: "",
        helpText:
          "Upload letter of approval from the City Market and Cemetery Section Head with fee assessment for your activity",
        whereToGet:
          "You can acquire this from the City Market and Cemetery Section Office",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
    ],
  },
  {
    sectionName: "Activity Details",
    description:
      "Provide details about your promotional or exhibition activity, including business name, location, duration, and nature of activities",
    notes: "",
    items: [
      {
        label: "Business / activity name",
        type: "text",
        isBusinessName: true,
        required: true,
        notes: "",
        helpText: "",
        placeholder: "Enter name of business or activity",
        span: 24,
        validation: { minLength: 2, maxLength: 200 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "Location of activity",
        type: "address_alaminos",
        required: true,
        notes: "",
        helpText: "Where the promotion/exhibition is located",
        placeholder: "",
        span: 24,
        validation: {},
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "Duration of activity",
        type: "date_range",
        required: false,
        notes: "",
        helpText: "For temporary activities, specify the start and end dates",
        placeholder: "",
        span: 24,
        validation: {},
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "Brief description of activity",
        type: "textarea",
        required: false,
        notes: "",
        helpText: "",
        placeholder: "Describe the promotion/exhibition activity...",
        span: 24,
        validation: { maxLength: 1000 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
    ],
  },
];

const CEMETERY_STALLHOLDERS_PERMIT_SECTIONS = [
  {
    sectionName: "Required Documents",
    type: "required_documents",
    description:
      "Upload the required documents to verify your cemetery stallholder eligibility and compliance with LGU regulations.",
    notes:
      "Applicant/owner details are taken from the PIS (account registration)",
    items: [
      {
        label: "Community Tax Certificate (CTC)",
        type: "file",
        required: true,
        notes: "",
        helpText:
          "Upload your Community Tax Certificate to verify you have paid your local taxes for business operation",
        whereToGet:
          "You can acquire this from your local City Treasurer's Office",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [
          {
            label: "CTC Number",
            type: "text",
            required: true,
            placeholder: "Enter CTC number",
          },
          { label: "Date Issued", type: "date", required: true },
          {
            label: "Place Issued",
            type: "text",
            required: true,
            placeholder: "Enter city/municipality",
          },
        ],
      },
      {
        label: "Barangay Clearance where business is located",
        type: "file",
        required: true,
        notes: "",
        helpText:
          "Upload barangay business clearance to verify your business has been cleared to operate in the barangay",
        whereToGet: "You can acquire this from your barangay captain's office",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [
          {
            label: "Clearance Number",
            type: "text",
            required: true,
            placeholder: "Enter clearance number",
          },
          { label: "Date Issued", type: "date", required: true },
          {
            label: "Barangay Name",
            type: "text",
            required: true,
            placeholder: "Enter barangay name",
          },
        ],
      },
      {
        label:
          "Letter of Approval by City Market and Cemetery Section Head with assessment of fees",
        type: "file",
        required: true,
        notes: "",
        helpText:
          "Upload letter of approval from the City Market and Cemetery Section Head with fee assessment for your cemetery stall",
        whereToGet:
          "You can acquire this from the City Market and Cemetery Section Office",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
    ],
  },
  {
    sectionName: "Activity Details",
    description:
      "Provide details about your cemetery stall, including business name, location, duration, and nature of activities",
    notes: "",
    items: [
      {
        label: "Business / activity name",
        type: "text",
        isBusinessName: true,
        required: true,
        notes: "",
        helpText: "",
        placeholder: "Enter name of business or stall",
        span: 24,
        validation: { minLength: 2, maxLength: 200 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "Location of activity",
        type: "address_alaminos",
        required: true,
        notes: "",
        helpText: "Where the cemetery stall is located",
        placeholder: "",
        span: 24,
        validation: {},
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "Duration of activity",
        type: "date_range",
        required: false,
        notes: "",
        helpText: "For temporary permits, specify the start and end dates",
        placeholder: "",
        span: 24,
        validation: {},
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "Brief description of activity",
        type: "text",
        required: false,
        notes: "",
        helpText: "",
        placeholder: "Describe the cemetery stall activity...",
        span: 24,
        validation: { maxLength: 1000 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
    ],
  },
];

const FISH_TRAP_FISH_PEN_PERMIT_SECTIONS = [
  {
    sectionName: "Required Documents",
    type: "required_documents",
    description:
      "Upload the required documents to verify your fish trap/fish pen eligibility and compliance with LGU regulations.",
    notes:
      "Applicant/owner details are taken from the PIS (account registration)",
    items: [
      {
        label: "Community Tax Certificate (CTC)",
        type: "file",
        required: true,
        notes: "",
        helpText:
          "Upload your Community Tax Certificate to verify you have paid your local taxes for business operation",
        whereToGet:
          "You can acquire this from your local City Treasurer's Office",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [
          {
            label: "CTC Number",
            type: "text",
            required: true,
            placeholder: "Enter CTC number",
          },
          { label: "Date Issued", type: "date", required: true },
          {
            label: "Place Issued",
            type: "text",
            required: true,
            placeholder: "Enter city/municipality",
          },
        ],
      },
      {
        label: "Barangay Clearance where business is located",
        type: "file",
        required: true,
        notes: "",
        helpText:
          "Upload barangay business clearance to verify your business has been cleared to operate in the barangay",
        whereToGet: "You can acquire this from your barangay captain's office",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [
          {
            label: "Clearance Number",
            type: "text",
            required: true,
            placeholder: "Enter clearance number",
          },
          { label: "Date Issued", type: "date", required: true },
          {
            label: "Barangay Name",
            type: "text",
            required: true,
            placeholder: "Enter barangay name",
          },
        ],
      },
      {
        label:
          "Certification from the Brgy. Captain & duly noted by CFARMC Chairman",
        type: "file",
        required: true,
        notes: "",
        helpText:
          "Upload certification from the Barangay Captain duly noted by the CFARMC Chairman to verify community approval for your fishery operation",
        whereToGet:
          "You can acquire this from your barangay captain and have it noted by the CFARMC Chairman",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label:
          "Certification from City Agriculturist (City Agriculture Office)",
        type: "file",
        required: true,
        notes: "",
        helpText:
          "Upload certification from the City Agriculturist to verify technical feasibility and compliance with fishery regulations",
        whereToGet: "You can acquire this from the City Agriculture Office",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "Contract of Lease (NEW) from City Agriculture Office",
        type: "file",
        required: false,
        notes: "",
        helpText:
          "Upload contract of lease from the City Agriculture Office for new fish trap or fish pen installations",
        whereToGet: "You can acquire this from the City Agriculture Office",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "Assessment of fees (City Agriculture Office)",
        type: "file",
        required: true,
        notes: "",
        helpText:
          "Upload fee assessment from the City Agriculture Office for your fish trap or fish pen operation",
        whereToGet: "You can acquire this from the City Agriculture Office",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
    ],
  },
  {
    sectionName: "Activity Details",
    description:
      "Provide details about your fish trap or fish pen operation, including business name, location, duration, and nature of activities",
    notes: "",
    items: [
      {
        label: "Business / activity name",
        type: "text",
        isBusinessName: true,
        required: true,
        notes: "",
        helpText: "",
        placeholder: "Enter name of business or activity",
        span: 24,
        validation: { minLength: 2, maxLength: 200 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "Location of activity",
        type: "address_alaminos",
        required: true,
        notes: "",
        helpText: "Where the fish trap/pen is located",
        placeholder: "",
        span: 24,
        validation: {},
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "Duration of activity",
        type: "date_range",
        required: false,
        notes: "",
        helpText: "For temporary activities, specify the start and end dates",
        placeholder: "",
        span: 24,
        validation: {},
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "Brief description of activity",
        type: "textarea",
        required: false,
        notes: "",
        helpText: "",
        placeholder: "Describe the fish trap/pen activity...",
        span: 24,
        validation: { maxLength: 1000 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
    ],
  },
];

const FISH_POND_PERMIT_SECTIONS = [
  {
    sectionName: "Required Documents",
    type: "required_documents",
    description:
      "Upload the required documents to verify your fish pond eligibility and compliance with LGU regulations.",
    notes:
      "Applicant/owner details are taken from the PIS (account registration)",
    items: [
      {
        label: "Community Tax Certificate (CTC)",
        type: "file",
        required: true,
        notes: "",
        helpText:
          "Upload your Community Tax Certificate to verify you have paid your local taxes for business operation",
        whereToGet:
          "You can acquire this from your local City Treasurer's Office",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [
          {
            label: "CTC Number",
            type: "text",
            required: true,
            placeholder: "Enter CTC number",
          },
          { label: "Date Issued", type: "date", required: true },
          {
            label: "Place Issued",
            type: "text",
            required: true,
            placeholder: "Enter city/municipality",
          },
        ],
      },
      {
        label: "Barangay Clearance where business is located",
        type: "file",
        required: true,
        notes: "",
        helpText:
          "Upload barangay business clearance to verify your business has been cleared to operate in the barangay",
        whereToGet: "You can acquire this from your barangay captain's office",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [
          {
            label: "Clearance Number",
            type: "text",
            required: true,
            placeholder: "Enter clearance number",
          },
          { label: "Date Issued", type: "date", required: true },
          {
            label: "Barangay Name",
            type: "text",
            required: true,
            placeholder: "Enter barangay name",
          },
        ],
      },
      {
        label: "Tax Declaration of property (Photocopy)",
        type: "file",
        required: true,
        notes: "",
        helpText:
          "Upload photocopy of the tax declaration for the property where the fish pond is located to verify ownership or lease rights",
        whereToGet: "You can acquire this from the City Assessor's Office",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "Assessment of fees (City Agriculture Office)",
        type: "file",
        required: true,
        notes: "",
        helpText:
          "Upload fee assessment from the City Agriculture Office for your fish pond operation",
        whereToGet: "You can acquire this from the City Agriculture Office",
        placeholder: "",
        span: 24,
        validation: { acceptedFileTypes: "pdf,jpg,png", maxFileSize: 10 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
    ],
  },
  {
    sectionName: "Activity Details",
    description:
      "Provide details about your fish pond operation, including business name, location, duration, and nature of activities",
    notes: "",
    items: [
      {
        label: "Business / activity name",
        type: "text",
        isBusinessName: true,
        required: true,
        notes: "",
        helpText: "",
        placeholder: "Enter name of business or activity",
        span: 24,
        validation: { minLength: 2, maxLength: 200 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "Location of activity",
        type: "address_alaminos",
        required: true,
        notes: "",
        helpText: "Where the fish pond is located",
        placeholder: "",
        span: 24,
        validation: {},
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "Duration of activity",
        type: "date_range",
        required: false,
        notes: "",
        helpText: "For temporary activities, specify the start and end dates",
        placeholder: "",
        span: 24,
        validation: {},
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
      {
        label: "Brief description of activity",
        type: "textarea",
        required: false,
        notes: "",
        helpText: "",
        placeholder: "Describe the fish pond activity...",
        span: 24,
        validation: { maxLength: 1000 },
        dropdownSource: "static",
        dropdownOptions: [],
        metadataFields: [],
      },
    ],
  },
];

// Form metadata sourced from the legacy frontend formMetadata.constants.js
// (now removed from the frontend; these are the canonical seed definitions).
const FORM_METADATA = {
  "unified-business-permit": {
    formId: "unified-business-permit",
    name: "Unified Business Permit Form",
    formType: "regular",
    description:
      "For businesses with ongoing operations that are valid for one calendar year and require annual renewal.",
    sections: UNIFIED_BUSINESS_PERMIT_SECTIONS,
    lastUpdated: "January 15, 2025",
    version: 1,
    createdAt: "2024-01-15",
    notes: "",
    isActive: true,
    applicationFeeAmount: 1000, // Main annual permit, highest fee
    claimableDocumentCustomIds: ["unified-business-permit"],
  },
  "cooperative-permit": {
    formId: "cooperative-permit",
    name: "Cooperative Permit",
    formType: "temporary",
    category: "cooperative",
    description:
      "For cooperatives (registered with CDA) applying for business permit renewal or new registration. Covers agricultural, consumer, marketing, service, and multi-purpose cooperatives operating within the city.",
    sections: COOPERATIVE_PERMIT_SECTIONS,
    lastUpdated: "January 15, 2025",
    version: 1,
    createdAt: "2024-01-15",
    notes: "",
    isActive: true,
    applicationFeeAmount: 300, // Non-profit cooperatives, lower fee
    claimableDocumentCustomIds: ["cooperative-permit"],
  },
  "association-foundation-permit": {
    formId: "association-foundation-permit",
    name: "Association/Foundation Permit",
    formType: "temporary",
    category: "association_foundation",
    description:
      "For non-profit associations and foundations (registered with SEC or DOLE) applying for business permit. Covers civic organizations, foundations, trade associations, labor unions, and other non-profit entities operating within the city.",
    sections: ASSOCIATION_FOUNDATION_PERMIT_SECTIONS,
    lastUpdated: "January 15, 2025",
    version: 1,
    createdAt: "2024-01-15",
    notes: "",
    isActive: true,
    applicationFeeAmount: 300, // Non-profit associations, lower fee
    claimableDocumentCustomIds: [
      "real-property-tax-clearance",
      "account-clearance",
      "association-foundation-permit",
    ],
  },
  "chainsaw-permit": {
    formId: "chainsaw-permit",
    name: "Chainsaw Permit",
    formType: "temporary",
    category: "chainsaw",
    description:
      "For chainsaw operators and owners applying for permit to use chainsaws for logging, land clearing, or tree cutting activities. Required for all chainsaw operations within city jurisdiction per DENR regulations.",
    sections: CHAINSAW_PERMIT_SECTIONS,
    lastUpdated: "January 15, 2025",
    version: 1,
    createdAt: "2024-01-15",
    notes: "",
    isActive: true,
    applicationFeeAmount: 800, // Specialized permit with safety concerns
    claimableDocumentCustomIds: [
      "real-property-tax-clearance",
      "account-clearance",
      "chainsaw-permit",
    ],
  },
  "firecrackers-stallholders-permit": {
    formId: "firecrackers-stallholders-permit",
    name: "Firecrackers Stallholders Permit",
    formType: "temporary",
    category: "firecrackers_stallholders",
    description:
      "For individuals or businesses applying to sell firecrackers and pyrotechnic products during the designated holiday period (typically December to January). Required for all temporary firecrackers retail stalls in authorized selling zones.",
    sections: FIRECRACKERS_STALLHOLDERS_PERMIT_SECTIONS,
    lastUpdated: "January 15, 2025",
    version: 1,
    createdAt: "2024-01-15",
    notes: "",
    isActive: true,
    applicationFeeAmount: 400, // Temporary, seasonal
    claimableDocumentCustomIds: ["firecrackers-stallholders-permit"],
  },
  "bazaar-festival-vendors-permit": {
    formId: "bazaar-festival-vendors-permit",
    name: "Bazaar/Festival Vendors Permit",
    formType: "temporary",
    category: "bazaar_festival_vendors",
    description:
      "For vendors applying to operate temporary selling stalls during city-sponsored bazaars, festivals, trade fairs, or special events. Covers food stalls, merchandise booths, and temporary retail spaces in designated event areas.",
    sections: BAZAAR_FESTIVAL_VENDORS_PERMIT_SECTIONS,
    lastUpdated: "January 15, 2025",
    version: 1,
    createdAt: "2024-01-15",
    notes: "",
    isActive: true,
    applicationFeeAmount: 400, // Temporary, seasonal
    claimableDocumentCustomIds: ["bazaar-festival-vendors-permit"],
  },
  "peddlers-permit": {
    formId: "peddlers-permit",
    name: "Peddlers Permit",
    formType: "temporary",
    category: "peddlers",
    description:
      "For mobile vendors (itinerant sellers) applying to sell goods while moving from place to place within the city. Covers street vendors, hawkers, and ambulant sellers of food, merchandise, or other products.",
    sections: PEDDLERS_PERMIT_SECTIONS,
    lastUpdated: "January 15, 2025",
    version: 1,
    createdAt: "2024-01-15",
    notes: "",
    isActive: true,
    applicationFeeAmount: 200, // Mobile vendors, lowest fee
    claimableDocumentCustomIds: ["peddlers-permit"],
  },
  "promotions-exhibitors-permit": {
    formId: "promotions-exhibitors-permit",
    name: "Promotions/Exhibitors Permit",
    formType: "temporary",
    category: "promotional_temporary_stalls",
    description:
      "For businesses or organizations applying to conduct promotional activities, product launches, sales promotions, or exhibitions in public or private spaces. Covers roadshows, mall activations, product demonstrations, and temporary promotional displays.",
    sections: PROMOTIONS_EXHIBITORS_PERMIT_SECTIONS,
    lastUpdated: "January 15, 2025",
    version: 1,
    createdAt: "2024-01-15",
    notes: "",
    isActive: true,
    applicationFeeAmount: 500, // Temporary events
    claimableDocumentCustomIds: ["promotions-exhibitors-permit"],
  },
  "cemetery-stallholders-permit": {
    formId: "cemetery-stallholders-permit",
    name: "Cemetery Stallholders Permit",
    formType: "temporary",
    category: "market_stallholders",
    description:
      "For vendors applying to operate temporary selling stalls within public or private cemeteries during All Saints Day (November 1) and All Souls Day (November 2) observance period. Covers flower, candle, food, and merchandise stalls in designated cemetery areas.",
    sections: CEMETERY_STALLHOLDERS_PERMIT_SECTIONS,
    lastUpdated: "January 15, 2025",
    version: 1,
    createdAt: "2024-01-15",
    notes: "",
    isActive: true,
    applicationFeeAmount: 400, // Temporary, seasonal
    claimableDocumentCustomIds: ["cemetery-stallholders-permit"],
  },
  "fish-trap-fish-pen-permit": {
    formId: "fish-trap-fish-pen-permit",
    name: "Fish Trap/Fish Pen Permit",
    formType: "temporary",
    category: "fishpond",
    description:
      "For fishery operators seeking to establish fish traps or fish pens in designated water areas. This permit regulates aquaculture activities to ensure sustainable fishing practices and environmental protection.",
    sections: FISH_TRAP_FISH_PEN_PERMIT_SECTIONS,
    lastUpdated: "January 15, 2025",
    version: 1,
    createdAt: "2024-01-15",
    notes: "",
    isActive: true,
    applicationFeeAmount: 600, // Aquaculture operations
    claimableDocumentCustomIds: [
      "real-property-tax-clearance",
      "account-clearance",
      "fish-trap-fish-pen-permit",
    ],
  },
  "fish-pond-permit": {
    formId: "fish-pond-permit",
    name: "Fish Pond Permit",
    formType: "temporary",
    category: "fishpond",
    description:
      "For fishery operators seeking to establish or operate fish ponds for aquaculture purposes. This permit regulates fish pond operations to ensure sustainable aquaculture practices and environmental compliance.",
    sections: FISH_POND_PERMIT_SECTIONS,
    lastUpdated: "January 15, 2025",
    version: 1,
    createdAt: "2024-01-15",
    notes: "",
    isActive: true,
    applicationFeeAmount: 600, // Aquaculture operations
    claimableDocumentCustomIds: [
      "real-property-tax-clearance",
      "account-clearance",
      "fish-pond-permit",
    ],
  },
};

async function seedPermitFormsIfEmpty() {
  try {
    logger.info("Starting permit forms seed...");

    // Fetch all claimable documents directly from MongoDB to map customIds to ObjectIds
    let claimableDocuments = [];
    try {
      // Query claimable documents collection directly using mongoose
      const mongoose = require("mongoose");
      // Use the existing connection if available, otherwise connect
      if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(
          process.env.MONGO_URI || "mongodb://mongodb:27017/capstone_project",
        );
      }
      const db = mongoose.connection.db;
      const claimableDocsCollection = db.collection("claimabledocuments");
      claimableDocuments = await claimableDocsCollection.find({}).toArray();
      logger.info(
        `Fetched ${claimableDocuments.length} claimable documents from MongoDB`,
      );
    } catch (error) {
      console.error("Failed to fetch claimable documents from MongoDB:", error);
      logger.error("Failed to fetch claimable documents from MongoDB:", error);
      logger.warn(
        "Continuing without claimable documents mapping - permit forms will be seeded without claimableDocumentIds",
      );
    }

    // Create a map of customId to ObjectId
    const customIdToDocIdMap = claimableDocuments.reduce((acc, doc) => {
      acc[doc.customId] = doc._id;
      return acc;
    }, {});

    // Create a map of documentId to array of formIds (reverse mapping)
    const docIdToFormIdsMap = {};
    const formIds = Object.keys(FORM_METADATA);
    let created = 0;
    let updated = 0;

    for (const formId of formIds) {
      const metadata = FORM_METADATA[formId];

      // Map claimable document customIds to ObjectIds
      let claimableDocumentIds = [];
      if (
        metadata.claimableDocumentCustomIds &&
        metadata.claimableDocumentCustomIds.length > 0
      ) {
        claimableDocumentIds = metadata.claimableDocumentCustomIds
          .map((customId) => customIdToDocIdMap[customId])
          .filter((id) => id); // Filter out undefined values
      }

      // Build reverse mapping: documentId -> formIds
      for (const docId of claimableDocumentIds) {
        if (!docIdToFormIdsMap[docId]) {
          docIdToFormIdsMap[docId] = [];
        }
        docIdToFormIdsMap[docId].push(formId);
      }

      // Check if form already exists
      const existingForm = await PermitForm.findOne({ formId });

      if (existingForm) {
        // Create application fee if form doesn't have one and metadata has amount
        let feeId = existingForm.feeId;
        if (
          !feeId &&
          metadata.applicationFeeAmount &&
          metadata.applicationFeeAmount > 0
        ) {
          try {
            const fee = await Fee.create({
              name: `${metadata.name} Fee`,
              amount: metadata.applicationFeeAmount,
              category: "application_fee",
              isActive: true,
            });
            feeId = fee._id;
            logger.info(
              `Created application fee for ${formId}: ₱${metadata.applicationFeeAmount}`,
            );
          } catch (error) {
            console.error("Failed to create application fee:", error);
            logger.error("Failed to create application fee:", error);
          }
        }

        // Update existing form (include sections from metadata)
        await PermitForm.updateOne(
          { formId },
          {
            $set: {
              name: metadata.name,
              description: metadata.description,
              sections: withGeneratedKeys(metadata.sections),
              notes: metadata.notes,
              isActive: true, // Force active for now
              formType: metadata.formType || "regular",
              category: metadata.category || null,
              lastUpdated: new Date(),
              ...(feeId && { feeId }),
              ...(claimableDocumentIds.length > 0 && { claimableDocumentIds }),
            },
          },
        );
        updated++;
        logger.info(`Updated permit form: ${formId}`);
      } else {
        // Create application fee if metadata has amount
        let feeId = null;
        if (
          metadata.applicationFeeAmount &&
          metadata.applicationFeeAmount > 0
        ) {
          try {
            const fee = await Fee.create({
              name: `${metadata.name} Fee`,
              amount: metadata.applicationFeeAmount,
              category: "application_fee",
              isActive: true,
            });
            feeId = fee._id;
            logger.info(
              `Created application fee for ${formId}: ₱${metadata.applicationFeeAmount}`,
            );
          } catch (error) {
            console.error("Failed to create application fee:", error);
            logger.error("Failed to create application fee:", error);
          }
        }

        // Create new form (with sections from metadata)
        await PermitForm.create({
          formId: metadata.formId,
          name: metadata.name,
          description: metadata.description,
          sections: withGeneratedKeys(metadata.sections),
          version: metadata.version,
          notes: metadata.notes,
          isActive: true, // Force active for now
          formType: metadata.formType || "regular",
          category: metadata.category || null,
          createdAt: new Date(metadata.createdAt),
          lastUpdated: new Date(metadata.lastUpdated),
          feeId,
          claimableDocumentIds,
        });
        created++;
        logger.info(`Created permit form: ${formId}`);
      }
    }

    // Update ClaimableDocument records with formIds (reverse mapping)
    try {
      const mongoose = require("mongoose");
      const db = mongoose.connection.db;
      const claimableDocsCollection = db.collection("claimabledocuments");
      const permitFormsCollection = db.collection("permitforms");

      // Get all permit forms with their claimableDocumentIds
      const permitForms = await permitFormsCollection.find({}).toArray();

      // Build formId -> ObjectId map
      const formIdToObjectIdMap = {};
      for (const form of permitForms) {
        formIdToObjectIdMap[form.formId] = form._id;
      }

      // Update each claimable document with its associated formIds
      for (const [docId, formIdStrings] of Object.entries(docIdToFormIdsMap)) {
        const formObjectIds = formIdStrings
          .map((formId) => formIdToObjectIdMap[formId])
          .filter((id) => id); // Filter out undefined values

        if (formObjectIds.length > 0) {
          // Convert docId string back to ObjectId for the query
          const docObjectId = new mongoose.Types.ObjectId(docId);
          await claimableDocsCollection.updateOne(
            { _id: docObjectId },
            { $set: { formIds: formObjectIds } },
          );
          logger.info(
            `Updated claimable document ${docId} with ${formObjectIds.length} associated forms`,
          );
        }
      }
    } catch (error) {
      console.error(
        "Failed to update claimable documents with formIds:",
        error,
      );
      logger.error("Failed to update claimable documents with formIds:", error);
    }

    logger.info(
      `Permit forms seed completed. Created: ${created}, Updated: ${updated}`,
    );
    return { seeded: true, created, updated };
  } catch (error) {
    logger.error("Error seeding permit forms:", {
      error: error.message,
      stack: error.stack,
    });
    return { seeded: false, error: error.message };
  }
}

module.exports = seedPermitFormsIfEmpty;

module.exports = { seedPermitFormsIfEmpty };
