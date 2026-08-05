const axios = require("axios");

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
      const auditServiceUrl =
        process.env.AUDIT_SERVICE_URL || "http://localhost:3004";
      const response = await axios.get(
        `${auditServiceUrl}/api/audit/verify/${auditLogId}`,
      );

      if (response.data && response.data.success) {
        return {
          verified: response.data.verified || false,
          matches: response.data.verified || false,
          details: response.data.auditLog || {},
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
      const auditServiceUrl =
        process.env.AUDIT_SERVICE_URL || "http://localhost:3004";
      const response = await axios.get(`${auditServiceUrl}/api/audit/stats`);

      if (response.data && response.data.success) {
        return response.data.stats;
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
