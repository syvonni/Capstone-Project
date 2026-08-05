/**
 * Generic Change Tracker Utility
 * 
 * PURPOSE: This utility tracks changes between old and new objects for audit logging.
 * It eliminates the need to manually construct oldValues objects and write repetitive
 * if statements to check for changes. It provides a consistent way to detect changes
 * across different entity types with different field structures.
 * 
 * USAGE EXAMPLE (for variables):
 * 
 * // BEFORE (manual change tracking):
 * const oldValues = {
 *   name: bracket.name,
 *   minValue: bracket.minValue,
 *   maxValue: bracket.maxValue,
 *   rate: bracket.rate,
 *   // ... 20+ fields
 * }
 * 
 * if (newValues.name !== oldValues.name) {
 *   await logAuditEvent(userId, 'variable_updated', 'Variable', bracketId, 'name', oldValues.name, newValues.name, role, metadata)
 * }
 * if (newValues.minValue !== oldValues.minValue) {
 *   await logAuditEvent(userId, 'variable_updated', 'Variable', bracketId, 'minValue', oldValues.minValue, newValues.minValue, role, metadata)
 * }
 * // ... 20+ more if statements
 * 
 * // AFTER (using change tracker):
 * const changes = trackChanges(oldBracket, newBracket, {
 *   name: 'name',
 *   minValue: 'minValue',
 *   maxValue: 'maxValue',
 *   rate: 'rate',
 *   // ... all fields
 * })
 * 
 * for (const change of changes) {
 *   await logAuditEvent(userId, 'variable_updated', 'Variable', bracketId, change.field, change.oldValue, change.newValue, role, metadata)
 * }
 * 
 * HOW TO USE FOR OTHER ENTITIES:
 * 1. Define field mapping object: { sourceField: 'targetField' }
 * 2. Call trackChanges(oldObject, newObject, fieldMapping)
 * 3. Iterate over changes and log each one
 * 4. Use fieldMapping to handle different field names between old/new objects
 */

/**
 * Tracks changes between old and new objects
 * 
 * USAGE:
 * trackChanges(oldObject, newObject, fieldMapping)
 * 
 * @param {object} oldObject - The original object before changes
 * @param {object} newObject - The modified object after changes
 * @param {object} fieldMapping - Object mapping field names { source: target }
 *   If source === target, you can use shorthand: { name: true, value: true }
 *   If source !== target, use full mapping: { oldName: 'newName' }
 * @param {object} options - Additional options
 * @param {Array<string>} options.ignoreFields - Fields to ignore (e.g., ['updatedAt', 'version'])
 * @param {boolean} options.includeUnchanged - Include unchanged fields in result (default: false)
 * @returns {Array<object>} - Array of change objects with field, oldValue, newValue
 */
function trackChanges(oldObject, newObject, fieldMapping, options = {}) {
  const { ignoreFields = [], includeUnchanged = false } = options;
  
  const changes = [];
  
  // Process each field in the mapping
  for (const [sourceField, targetField] of Object.entries(fieldMapping)) {
    // Skip ignored fields
    if (ignoreFields.includes(sourceField)) {
      continue;
    }
    
    // Determine the actual field name in new object
    // If targetField is true, use the same name as sourceField
    const newFieldName = targetField === true ? sourceField : targetField;
    
    // Get values from both objects
    const oldValue = oldObject[sourceField];
    const newValue = newObject[newFieldName];
    
    // Convert to strings for comparison (handles null, undefined, numbers)
    const oldValueStr = oldValue == null ? '' : String(oldValue);
    const newValueStr = newValue == null ? '' : String(newValue);
    
    // Check if value changed
    const hasChanged = oldValueStr !== newValueStr;
    
    // Add to changes if changed or if we want unchanged fields
    if (hasChanged || includeUnchanged) {
      changes.push({
        field: sourceField,
        oldValue: oldValueStr,
        newValue: newValueStr,
        changed: hasChanged,
      });
    }
  }
  
  return changes;
}

/**
 * Tracks changes with nested object support
 * 
 * USAGE:
 * trackChangesWithNested(oldObject, newObject, {
 *   'user.name': 'userName',
 *   'user.email': 'userEmail',
 *   'metadata.status': 'status',
 * })
 * 
 * @param {object} oldObject - The original object
 * @param {object} newObject - The modified object
 * @param {object} fieldMapping - Object mapping nested field paths
 * @param {object} options - Additional options
 * @returns {Array<object>} - Array of change objects
 */
function trackChangesWithNested(oldObject, newObject, fieldMapping, options = {}) {
  const { ignoreFields = [], includeUnchanged = false } = options;
  
  const changes = [];
  
  for (const [sourcePath, targetPath] of Object.entries(fieldMapping)) {
    // Skip ignored fields
    if (ignoreFields.includes(sourcePath)) {
      continue;
    }
    
    // Get nested value from old object
    const oldValue = getNestedValue(oldObject, sourcePath);
    
    // Get nested value from new object
    const newValue = getNestedValue(newObject, targetPath === true ? sourcePath : targetPath);
    
    // Convert to strings for comparison
    const oldValueStr = oldValue == null ? '' : String(oldValue);
    const newValueStr = newValue == null ? '' : String(newValue);
    
    // Check if value changed
    const hasChanged = oldValueStr !== newValueStr;
    
    // Add to changes if changed or if we want unchanged fields
    if (hasChanged || includeUnchanged) {
      changes.push({
        field: sourcePath,
        oldValue: oldValueStr,
        newValue: newValueStr,
        changed: hasChanged,
      });
    }
  }
  
  return changes;
}

/**
 * Gets a nested value from an object using dot notation
 * 
 * USAGE:
 * getNestedValue(obj, 'user.name') // returns obj.user.name
 * getNestedValue(obj, 'metadata.status') // returns obj.metadata.status
 * 
 * @param {object} obj - The object to get value from
 * @param {string} path - Dot-notation path to the value
 * @returns {*} - The value at the path, or undefined if not found
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

/**
 * Groups changes by category
 * 
 * USAGE:
 * const changes = trackChanges(old, new, fieldMapping)
 * const grouped = groupChangesByCategory(changes, {
 *   name: 'identity',
 *   email: 'identity',
 *   minValue: 'calculation',
 *   maxValue: 'calculation',
 * })
 * 
 * @param {Array<object>} changes - Array of change objects
 * @param {object} categoryMapping - Object mapping fields to categories
 * @returns {object} - Object with categories as keys and arrays of changes as values
 */
function groupChangesByCategory(changes, categoryMapping) {
  const grouped = {};
  
  for (const change of changes) {
    const category = categoryMapping[change.field] || 'other';
    
    if (!grouped[category]) {
      grouped[category] = [];
    }
    
    grouped[category].push(change);
  }
  
  return grouped;
}

/**
 * Formats changes for display in audit metadata
 * 
 * USAGE:
 * const changes = trackChanges(old, new, fieldMapping)
 * const formatted = formatChangesForMetadata(changes)
 * // Returns: "name: old -> new, minValue: 10 -> 20"
 * 
 * @param {Array<object>} changes - Array of change objects
 * @param {number} maxChanges - Maximum number of changes to include (default: 10)
 * @returns {string} - Formatted string of changes
 */
function formatChangesForMetadata(changes, maxChanges = 10) {
  const changedFields = changes.filter(c => c.changed);
  
  if (changedFields.length === 0) {
    return 'No changes';
  }
  
  const displayChanges = changedFields.slice(0, maxChanges);
  const formatted = displayChanges
    .map(c => `${c.field}: ${c.oldValue} -> ${c.newValue}`)
    .join(', ');
  
  if (changedFields.length > maxChanges) {
    return `${formatted} (+${changedFields.length - maxChanges} more)`;
  }
  
  return formatted;
}

module.exports = {
  trackChanges,
  trackChangesWithNested,
  getNestedValue,
  groupChangesByCategory,
  formatChangesForMetadata,
};
