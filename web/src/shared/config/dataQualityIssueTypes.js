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

  // Violation-specific issues
  missing_severity: "Missing Severity",
  invalid_severity: "Invalid Severity",
  without_corrective_action: "Without Corrective Action",
  without_fee_association: "Without Fee Association",
  without_inspection_items: "Without Inspection Items",

  // Inspection Item-specific issues
  without_violation: "Without Violation",

  // Checklist-specific issues
  missing_items: "Missing Items",
  without_post_requirement: "Without Post Requirement",
  without_variable: "Without Variable",
  without_document: "Without Document",

  // Post Requirement-specific issues
  missing_code: "Missing Code",
  without_custom_fields: "Without Custom Fields",
  without_checklist: "Without Checklist",
  without_valid_checklist: "Without Valid Checklist",
  duplicate_codes: "Duplicate Codes",

  // LOB-specific issues
  missing_category: "Missing Category",
  missing_line_of_business: "Missing Line of Business",
  without_variables: "Without Variables",
  without_documents: "Without Documents",
  without_post_requirements: "Without Post Requirements",
  essential_commodity_without_post_requirements: "Essential Commodity Without Post Requirements",
  missing_disabled_reason: "Missing Disabled Reason",
  invalid_status: "Invalid Status",
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

  // Violation-specific issues
  {
    type: "missing_severity",
    description: "Violations that are missing the required severity field",
    severity: "critical",
  },
  {
    type: "invalid_severity",
    description: "Violations with invalid severity values (must be minor, major, or critical)",
    severity: "critical",
  },
  {
    type: "without_corrective_action",
    description: "Violations that are missing corrective action guidance",
    severity: "high",
  },
  {
    type: "without_fee_association",
    description: "Violations that are not associated with any penalty fee",
    severity: "medium",
  },
  {
    type: "without_inspection_items",
    description: "Violations that are not associated with any inspection items",
    severity: "low",
  },

  // Inspection Item-specific issues
  {
    type: "without_violation",
    description: "Inspection items that are not associated with any violation",
    severity: "critical",
  },

  // Checklist-specific issues
  {
    type: "missing_items",
    description: "Checklists that are missing inspection items",
    severity: "critical",
  },
  {
    type: "without_post_requirement",
    description: "Checklists that are not associated with any post requirement",
    severity: "low",
  },
  {
    type: "without_variable",
    description: "Checklists that are not associated with any variable",
    severity: "low",
  },
  {
    type: "without_document",
    description: "Checklists that are not associated with any document",
    severity: "low",
  },

  // Post Requirement-specific issues
  {
    type: "missing_code",
    description: "Post requirements that are missing the required code field",
    severity: "critical",
  },
  {
    type: "without_custom_fields",
    description: "Post requirements that are not configured with custom fields",
    severity: "low",
  },
  {
    type: "without_checklist",
    description: "Post requirements that are not associated with any checklist",
    severity: "medium",
  },
  {
    type: "without_valid_checklist",
    description: "Post requirements that are associated with non-existent checklists",
    severity: "medium",
  },
  {
    type: "duplicate_codes",
    description: "Post requirements that have duplicate code values (code should be unique)",
    severity: "critical",
  },

  // LOB-specific issues
  {
    type: "missing_category",
    description: "LOBs that are missing the required category field",
    severity: "critical",
  },
  {
    type: "missing_line_of_business",
    description: "LOBs that are missing the required line of business field",
    severity: "critical",
  },
  {
    type: "without_variables",
    description: "LOBs that are not associated with any variables",
    severity: "medium",
  },
  {
    type: "without_documents",
    description: "LOBs that are not associated with any documents",
    severity: "medium",
  },
  {
    type: "without_post_requirements",
    description: "LOBs that are not associated with any post requirements",
    severity: "medium",
  },
  {
    type: "essential_commodity_without_post_requirements",
    description: "Essential commodity LOBs that are not associated with any post requirements",
    severity: "high",
  },
  {
    type: "missing_disabled_reason",
    description: "LOBs with disabled status that are missing the disabled reason",
    severity: "high",
  },
  {
    type: "invalid_status",
    description: "LOBs with invalid status values",
    severity: "critical",
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
