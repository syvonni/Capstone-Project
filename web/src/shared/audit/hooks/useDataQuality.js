import { useState, useEffect, useCallback } from "react";

/**
 * Generic hook for fetching data quality issues for any entity type
 * @param {string} entityType - The type of entity (e.g., 'variable', 'fee', 'violation')
 * @param {boolean} shouldFetch - Whether to fetch data quality issues (default: true)
 */
export function useDataQuality(entityType, shouldFetch = true) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalEntities, setTotalEntities] = useState(0);
  const [totalIssues, setTotalIssues] = useState(0);

  /**
   * Fetch data quality issues for this entity type
   */
  useEffect(() => {
    if (!shouldFetch || !entityType) {
      setIssues([]);
      return;
    }

    const fetchDataQuality = async () => {
      setLoading(true);
      setError(null);
      try {
        const { get } = await import("@/lib/http");

        // Map entity types to API endpoints
        const endpointMap = {
          variable: "/api/business/admin/variables/data-quality",
          // Add more entity types as needed
          // fee: '/api/business/admin/fees/data-quality',
          // violation: '/api/business/admin/violations/data-quality',
        };

        const endpoint = endpointMap[entityType];
        if (!endpoint) {
          throw new Error(`Unknown entity type: ${entityType}`);
        }

        const res = await get(endpoint);
        const data = res || {};
        setIssues(data.issues || []);
        setTotalEntities(data.totalEntities || 0);
        setTotalIssues(data.totalIssues || 0);
      } catch (err) {
        console.error("Failed to fetch data quality issues:", err);
        setError(err.message || "Failed to fetch data quality issues");
        setIssues([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDataQuality();
  }, [entityType, shouldFetch]);

  /**
   * Refresh data quality issues
   */
  const refresh = useCallback(() => {
    if (!entityType) return;

    setLoading(true);
    setError(null);
    const fetchDataQuality = async () => {
      try {
        const { get } = await import("@/lib/http");

        const endpointMap = {
          variable: "/api/business/admin/variables/data-quality",
          // Add more entity types as needed
        };

        const endpoint = endpointMap[entityType];
        if (!endpoint) {
          throw new Error(`Unknown entity type: ${entityType}`);
        }

        const res = await get(endpoint);
        const data = res || {};
        setIssues(data.issues || []);
        setTotalEntities(data.totalEntities || 0);
        setTotalIssues(data.totalIssues || 0);
      } catch (err) {
        console.error("Failed to fetch data quality issues:", err);
        setError(err.message || "Failed to fetch data quality issues");
        setIssues([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDataQuality();
  }, [entityType]);

  return {
    issues,
    loading,
    error,
    totalEntities,
    totalIssues,
    refresh,
  };
}
