const { auditClient } = require("../../../../shared/lib/httpClient");

/**
 * Audit Verifier for Auth Service
 * Makes HTTP calls to Audit Service for blockchain verification
 */

class AuditVerifier {
  /**
   * Verify a single audit log against the blockchain
   * Makes HTTP call to audit service
   * @param {string|ObjectId} auditLogId - MongoDB ID of the audit log
   * @returns {Promise<{verified: boolean, matches: boolean, error?: string, details?: object}>}
   */
  async verifyAuditLog(auditLogId) {
    try {
      const response = await auditClient.get(
        `/api/audit/verify/${auditLogId}`,
      );

      if (response && response.success) {
        return {
          verified: response.verified || false,
          matches: response.verified || false,
          details: response.auditLog || {},
        };
      } else {
        return {
          verified: false,
          matches: false,
          error: "Verification failed",
        };
      }
    } catch (error) {
      console.error(
        "Error calling audit service for verification:",
        error.message,
      );
      return {
        verified: false,
        matches: false,
        error:
          error.response?.data?.error ||
          error.message ||
          "Failed to verify audit log",
      };
    }
  }

  /**
   * Get verification statistics
   * Makes HTTP call to audit service
   * @returns {Promise<{total: number, verified: number, unverified: number, notLogged: number}>}
   */
  async getVerificationStats() {
    try {
      const response = await auditClient.get(`/api/audit/stats`);

      if (response && response.success) {
        return response.stats;
      } else {
        return {
          total: 0,
          verified: 0,
          unverified: 0,
          notLogged: 0,
          error: "Failed to get stats",
        };
      }
    } catch (error) {
      console.error("Error getting verification stats:", error);
      return {
        total: 0,
        verified: 0,
        unverified: 0,
        notLogged: 0,
        error: error.message || "Unknown error",
      };
    }
  }
}

module.exports = new AuditVerifier();
