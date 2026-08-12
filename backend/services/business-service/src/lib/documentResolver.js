/**
 * Document Resolver
 *
 * Resolves templateTexts bindings to actual values from application data.
 * Supports multiple source types: form_field, system, business_profile, static.
 */

/**
 * Format field values based on their type
 */
function formatFieldValue(value, fieldType) {
  if (value === null || value === undefined) {
    return "";
  }

  switch (fieldType) {
    case "address":
    case "address_alaminos":
      return formatAddress(value);
    case "date":
      return formatDate(value);
    case "date_range":
      return formatDateRange(value);
    case "number":
      return formatNumber(value);
    default:
      return String(value);
  }
}

/**
 * Format address object to string
 */
function formatAddress(address) {
  if (!address || typeof address !== "object") {
    return String(address || "");
  }

  const parts = [
    address.unitBuildingName,
    address.street,
    address.barangay,
    address.cityMunicipality || address.city,
    address.province,
    address.zipCode,
  ].filter(Boolean);

  return parts.join(", ") || "";
}

/**
 * Format date to readable string
 */
function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);

  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format date range to readable string
 */
function formatDateRange(range) {
  if (!range || typeof range !== "object") {
    return String(range || "");
  }

  const { startDate, endDate } = range;
  if (!startDate && !endDate) return "";

  const start = startDate ? formatDate(startDate) : "";
  const end = endDate ? formatDate(endDate) : "";

  if (start && end) {
    return `${start} - ${end}`;
  }
  return start || end;
}

/**
 * Format number with locale
 */
function formatNumber(num) {
  if (num === null || num === undefined) return "";
  const n = Number(num);
  if (isNaN(n)) return String(num);
  return n.toLocaleString("en-US");
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (text === null || text === undefined) return "";
  const str = String(text);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Resolve templateTexts to actual values
 *
 * @param {Array} templateTexts - Array of text attribute bindings from ClaimableDocument
 * @param {Object} application - Application document with formData
 * @param {Object} business - Business document
 * @param {Object} permitForm - PermitForm document with sections/fields
 * @returns {Object} - Map of attributeName -> resolved value, plus unresolved tracking
 */
function resolveTemplateTexts(
  templateTexts,
  application,
  business,
  permitForm,
) {
  const resolved = {};
  const unresolved = [];
  const warnings = [];

  if (!templateTexts || !Array.isArray(templateTexts)) {
    return { resolved, unresolved, warnings };
  }

  for (const textAttr of templateTexts) {
    const { attributeName, sourceType, bindings, sourceKey, staticValue } =
      textAttr;

    if (!attributeName) {
      warnings.push({
        attributeName: "(missing)",
        reason: "Missing attributeName",
      });
      continue;
    }

    let value = "";

    try {
      switch (sourceType) {
        case "form_field":
          value = resolveFormField(bindings, application, permitForm);
          break;
        case "system":
          value = resolveSystemField(sourceKey, application);
          break;
        case "business_profile":
          value = resolveBusinessProfileField(sourceKey, business);
          break;
        case "static":
          value = staticValue || "";
          break;
        default:
          warnings.push({
            attributeName,
            reason: `Unknown sourceType: ${sourceType}`,
          });
          unresolved.push(attributeName);
          continue;
      }

      if (value === null || value === undefined || value === "") {
        unresolved.push(attributeName);
        warnings.push({ attributeName, reason: "Resolved to empty value" });
      }

      resolved[attributeName] = value;
    } catch (error) {
      unresolved.push(attributeName);
      warnings.push({
        attributeName,
        reason: `Resolution error: ${error.message}`,
      });
    }
  }

  return { resolved, unresolved, warnings };
}

/**
 * Resolve form_field binding from application formData
 */
function resolveFormField(bindings, application, permitForm) {
  if (!bindings || !Array.isArray(bindings) || bindings.length === 0) {
    return "";
  }

  const binding = bindings[0];
  const { formId, sectionIndex, fieldKey } = binding;

  // Get formData from application
  const formData = application?.formData || {};

  // Navigate to the field value using the key
  // formData structure typically mirrors the form structure
  // For now, we'll do a simple key lookup
  if (formData[fieldKey] !== undefined) {
    return formData[fieldKey];
  }

  // Try nested lookup by section
  if (formData.sections && formData.sections[sectionIndex]) {
    const section = formData.sections[sectionIndex];
    if (section.items && section.items[fieldKey]) {
      return section.items[fieldKey];
    }
  }

  return "";
}

/**
 * Resolve system field from application
 */
function resolveSystemField(sourceKey, application) {
  if (!sourceKey) return "";

  switch (sourceKey) {
    case "applicationReferenceNumber":
      return application?.applicationReferenceNumber || "";
    case "applicationStatus":
      return application?.applicationStatus || "";
    default:
      return "";
  }
}

/**
 * Resolve business_profile field from Business
 */
function resolveBusinessProfileField(sourceKey, business) {
  if (!sourceKey || !business) return "";

  switch (sourceKey) {
    case "registeredBusinessName":
      return business.registeredBusinessName || "";
    case "businessTradeName":
      return business.businessTradeName || business.businessName || "";
    case "businessAddress":
      return formatAddress(business.location || business.businessAddress || {});
    case "businessType":
      return business.businessType || "";
    case "primaryLineOfBusiness":
      return business.primaryLineOfBusiness || "";
    default:
      // Try direct lookup on business
      return business[sourceKey] || "";
  }
}

/**
 * Render document HTML with template substitution
 *
 * @param {String} templateHtml - HTML template with {{attributeName}} placeholders
 * @param {Object} resolvedValues - Map of attributeName -> resolved value
 * @returns {String} - Rendered HTML with substituted values
 */
function renderDocumentHtml(templateHtml, resolvedValues) {
  if (!templateHtml) return "";

  let html = templateHtml;

  // Replace each {{attributeName}} with its resolved value
  for (const [attributeName, value] of Object.entries(resolvedValues)) {
    const placeholder = `{{${attributeName}}}`;
    const escapedValue = escapeHtml(value);
    html = html.replace(new RegExp(placeholder, "g"), escapedValue);
  }

  return html;
}

module.exports = {
  resolveTemplateTexts,
  renderDocumentHtml,
  formatFieldValue,
  escapeHtml,
};
