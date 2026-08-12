/**
 * Application Diff Helper
 *
 * PURPOSE: Compute a lightweight, privacy-safe diff between two application
 * documents for audit logging. It never stores full formData values; it only
 * records which top-level formData keys changed and a short human-readable
 * summary of the status / business / review context that changed.
 */

const MAX_CHANGED_KEYS_IN_SUMMARY = 5;
const MAX_SUMMARY_PART_LENGTH = 80;

// Top-level application fields we care about in audit diffs.
const TRACKED_TOP_LEVEL_FIELDS = [
  "businessName",
  "businessId",
  "applicationStatus",
  "applicationReferenceNumber",
  "reviewComments",
  "rejectionReason",
  "reviewedAt",
  "reviewedBy",
  "returnCount",
  "returnExhausted",
  "claimedAt",
  "releasedAt",
  "submittedAt",
  "status",
  "businessStatus",
];

// formData keys whose values may contain PII or large binary/CID data.
// We will still record that the key changed, but never include its value.
const SENSITIVE_FORM_DATA_KEYS = [
  "communityTaxCertificateCtc",
  "barangayClearanceWhereBusinessIsLocated",
  "registrationCertificate",
  "documentCids",
  "documents",
  "fileCids",
  "uploadedDocuments",
  "attachments",
];

function truncate(value, length = MAX_SUMMARY_PART_LENGTH) {
  const str = value == null ? "" : String(value);
  if (str.length <= length) return str;
  return `${str.slice(0, length)}...`;
}

function stableStringify(value) {
  if (value === null || value === undefined) return "";
  if (typeof value !== "object") return String(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`)
    .join(",")}}`;
}

function valuesDiffer(oldValue, newValue) {
  return stableStringify(oldValue) !== stableStringify(newValue);
}

function getFormDataKeys(formData) {
  if (!formData || typeof formData !== "object") return [];
  return Object.keys(formData);
}

function isSensitiveFormDataKey(key) {
  const lower = String(key).toLowerCase();
  return SENSITIVE_FORM_DATA_KEYS.some((sensitive) => lower.includes(sensitive.toLowerCase()));
}

/**
 * Diff two application-like documents.
 *
 * @param {object} oldApp - Application before the change (plain object or Mongoose doc)
 * @param {object} newApp - Application after the change
 * @param {object} options
 * @param {Array<string>} options.extraTrackedFields - Additional top-level fields to track
 * @returns {object} - { changedFields, changeCount, changeSummary, oldStatus, newStatus, formDataChangedKeys }
 */
function diffApplication(oldApp, newApp, options = {}) {
  const oldAppPlain = oldApp?.toObject ? oldApp.toObject() : oldApp || {};
  const newAppPlain = newApp?.toObject ? newApp.toObject() : newApp || {};

  const extraTrackedFields = options.extraTrackedFields || [];
  const trackedFields = [...new Set([...TRACKED_TOP_LEVEL_FIELDS, ...extraTrackedFields])];

  const changedFields = [];
  const summaryParts = [];

  // Top-level fields
  for (const field of trackedFields) {
    if (valuesDiffer(oldAppPlain[field], newAppPlain[field])) {
      changedFields.push(field);
    }
  }

  if (valuesDiffer(oldAppPlain.businessName, newAppPlain.businessName)) {
    summaryParts.push(
      `businessName: ${truncate(oldAppPlain.businessName) || "(none)"} -> ${
        truncate(newAppPlain.businessName) || "(none)"
      }`,
    );
  }

  const oldStatusValue = oldAppPlain.applicationStatus || oldAppPlain.status;
  const newStatusValue = newAppPlain.applicationStatus || newAppPlain.status;
  if (valuesDiffer(oldStatusValue, newStatusValue)) {
    summaryParts.push(
      `status: ${oldStatusValue || "(none)"} -> ${newStatusValue || "(none)"}`,
    );
  }

  if (valuesDiffer(oldAppPlain.reviewComments, newAppPlain.reviewComments)) {
    summaryParts.push(
      `reviewComments: ${truncate(oldAppPlain.reviewComments)} -> ${truncate(newAppPlain.reviewComments)}`,
    );
  }

  if (valuesDiffer(oldAppPlain.rejectionReason, newAppPlain.rejectionReason)) {
    summaryParts.push(
      `rejectionReason: ${truncate(oldAppPlain.rejectionReason)} -> ${truncate(newAppPlain.rejectionReason)}`,
    );
  }

  // formData top-level keys
  const oldFormData = oldAppPlain.formData || {};
  const newFormData = newAppPlain.formData || {};
  const allKeys = new Set([...getFormDataKeys(oldFormData), ...getFormDataKeys(newFormData)]);
  const formDataChangedKeys = [];

  for (const key of allKeys) {
    if (valuesDiffer(oldFormData[key], newFormData[key])) {
      changedFields.push(`formData.${key}`);
      if (!isSensitiveFormDataKey(key)) {
        formDataChangedKeys.push(key);
      }
    }
  }

  if (formDataChangedKeys.length > 0) {
    const displayKeys = formDataChangedKeys.slice(0, MAX_CHANGED_KEYS_IN_SUMMARY);
    const more = formDataChangedKeys.length > MAX_CHANGED_KEYS_IN_SUMMARY
      ? ` (+${formDataChangedKeys.length - MAX_CHANGED_KEYS_IN_SUMMARY} more)`
      : "";
    summaryParts.push(`formData: ${displayKeys.join(", ")}${more} changed`);
  }

  const changeSummary = summaryParts.length > 0 ? summaryParts.join("; ") : "No changes";

  return {
    changedFields,
    changeCount: changedFields.length,
    changeSummary,
    oldStatus: oldAppPlain.applicationStatus || oldAppPlain.status,
    newStatus: newAppPlain.applicationStatus || newAppPlain.status,
    formDataChangedKeys,
  };
}

module.exports = { diffApplication };
