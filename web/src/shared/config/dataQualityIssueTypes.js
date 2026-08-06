// Data quality issue type labels for display
export const ISSUE_TYPE_LABELS = {
  // Required field issues
  missing_name: "Missing Name",
  missing_description: "Missing Description",
  missing_question: "Missing Question",
  missing_calculation_method: "Missing Calculation Method",

  // Calculation method consistency issues
  bracketed_without_brackets: "Bracketed Without Brackets",
  classification_without_classifications: "Classification Without Classifications",
  per_unit_without_base_rate: "Per-Unit Without Base Rate",
  yes_no_without_fixed_amount: "Yes/No Without Fixed Amount",
  custom_without_calculation_method: "Custom Without Calculation Method",

  // Association issues
  without_checklists: "Without Checklists",
  without_fees: "Without Fees",
  without_legal_basis: "Without Legal Basis",
  without_variable_fee_rule: "Without Variable Fee Rule",
  without_lob_associations: "Without LOB Associations",

  // Unit field issues
  missing_unit_fields: "Missing Unit Fields",
  missing_context_fields: "Missing Context Fields",

  // Data consistency issues
  invalid_legal_basis_urls: "Invalid Legal Basis URLs",
};

// Data quality issue type descriptions for documentation
export const DATA_QUALITY_ISSUE_INFO = [
  // Required field issues
  {
    type: "missing_name",
    description: "Variables that are missing the required name field",
    severity: "critical",
  },
  {
    type: "missing_description",
    description: "Variables that are missing the description field",
    severity: "high",
  },
  {
    type: "missing_question",
    description: "Variables that are missing the required question field",
    severity: "critical",
  },
  {
    type: "missing_calculation_method",
    description: "Variables that are missing the required calculation method",
    severity: "critical",
  },

  // Calculation method consistency issues
  {
    type: "bracketed_without_brackets",
    description: "Variables with bracketed calculation method but no brackets defined",
    severity: "critical",
  },
  {
    type: "classification_without_classifications",
    description: "Variables with classification calculation method but no classifications defined",
    severity: "critical",
  },
  {
    type: "per_unit_without_base_rate",
    description: "Variables with per-unit calculation method but no base rate",
    severity: "critical",
  },
  {
    type: "yes_no_without_fixed_amount",
    description: "Variables with yes/no calculation method but no fixed amount",
    severity: "critical",
  },
  {
    type: "custom_without_calculation_method",
    description: "Variables with custom calculation method but no custom calculation method defined",
    severity: "critical",
  },

  // Association issues
  {
    type: "without_checklists",
    description: "Variables that are not associated with any checklist",
    severity: "medium",
  },
  {
    type: "without_fees",
    description: "Variables that are not associated with any fee",
    severity: "medium",
  },
  {
    type: "without_legal_basis",
    description: "Variables that have no legal basis documentation",
    severity: "high",
  },
  {
    type: "without_variable_fee_rule",
    description: "Variables that are not associated with any variable fee rule",
    severity: "medium",
  },
  {
    type: "without_lob_associations",
    description: "Variables that are not used in any line of business",
    severity: "low",
  },

  // Unit field issues
  {
    type: "missing_unit_fields",
    description: "Variables that are missing required unit fields (unit, unitSingular, unitPlural)",
    severity: "high",
  },
  {
    type: "missing_context_fields",
    description: "Variables that are missing context unit fields (unitContextSingular, unitContextPlural)",
    severity: "high",
  },

  // Data consistency issues
  {
    type: "invalid_legal_basis_urls",
    description: "Variables that have malformed URLs in their legal basis documentation",
    severity: "medium",
  },
];

// Helper function to get issue type label
export function getIssueTypeLabel(issueType) {
  return ISSUE_TYPE_LABELS[issueType] || issueType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Helper function to get issue type description
export function getIssueTypeInfo(issueType) {
  return DATA_QUALITY_ISSUE_INFO.find((info) => info.type === issueType);
}
