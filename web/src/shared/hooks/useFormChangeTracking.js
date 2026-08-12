import { useState, useCallback, useRef } from 'react';

function isEmptyForCompare(value) {
  return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
}

function normalizeForCompare(value) {
  if (isEmptyForCompare(value)) return null;

  if (Array.isArray(value)) {
    return value.map(normalizeForCompare);
  }

  if (typeof value === 'object') {
    const result = {};
    for (const key of Object.keys(value)) {
      const normalized = normalizeForCompare(value[key]);
      if (normalized !== null) {
        result[key] = normalized;
      }
    }
    return Object.keys(result).length === 0 ? null : result;
  }

  return value;
}

/**
 * Simple change tracking hook for forms
 * Tracks changes between baseline values and current form values
 */
export function useFormChangeTracking(initialValues) {
  const [hasChanges, setHasChanges] = useState(false);
  const [changedFields, setChangedFields] = useState([]);
  const [baselineValues, setBaselineValues] = useState(initialValues);
  const [currentValues, setCurrentValues] = useState(initialValues);
  const changeDetectionId = useRef(0);

  // Reset change tracking with new baseline
  const resetChangeTracking = useCallback((newBaseline) => {
    setHasChanges(false);
    setChangedFields([]);
    setBaselineValues(newBaseline);
    setCurrentValues(newBaseline);
  }, []);

  // Helper function to format values for display
  const formatValue = (value) => {
    if (value === null || value === undefined || value === '') {
      return '(empty)';
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return '(empty)';
      return `${value.length} item${value.length === 1 ? '' : 's'}`;
    }
    if (typeof value === 'object') {
      return '(object)';
    }
    return String(value);
  };

  // Check for changes when form values change
  const handleValuesChange = useCallback(
    (changedValues, allValues) => {
      if (!baselineValues) return;

      // Capture this invocation's id; only the latest invocation commits state
      const callId = ++changeDetectionId.current;

      // Merge the incoming partial/full snapshot on top of the current snapshot.
      // onValuesChange may pass a full allValues, a partial one, or just the
      // changed values, so we keep a running full snapshot to compare against.
      const incoming = { ...(changedValues || {}), ...(allValues || {}) };
      const nextValues = { ...currentValues, ...incoming };

      const changes = [];

      for (const key of Object.keys(baselineValues)) {
        // Skip baseline keys that the form is not actually tracking
        if (!(key in nextValues)) {
          continue;
        }

        const initialValue = baselineValues[key];
        const value = nextValues[key];

        // Skip if values are the same after normalizing empty/unset fields.
        // This treats '', null, undefined, and empty arrays as equivalent and
        // ignores object keys whose values are empty, which avoids false
        // positives from partial form snapshots or differing object shapes.
        if (JSON.stringify(normalizeForCompare(initialValue)) === JSON.stringify(normalizeForCompare(value))) {
          continue;
        }

        // Convert to display values
        const fromValue = formatValue(initialValue);
        const toValue = formatValue(value);

        // Format field name (camelCase to Title Case)
        const fieldName = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());

        changes.push({
          key,
          field: fieldName,
          fromValue: initialValue,
          toValue: value,
          from: fromValue,
          to: toValue,
        });
      }

      // Bail out if a newer change-detection invocation has started
      if (callId !== changeDetectionId.current) return;

      setCurrentValues(nextValues);
      setHasChanges(changes.length > 0);
      setChangedFields(changes);
    },
    [baselineValues, currentValues]
  );

  return {
    hasChanges,
    changedFields,
    resetChangeTracking,
    handleValuesChange,
  };
}
