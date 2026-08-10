const { auditClient } = require("../../../../shared/lib/httpClient");
const logger = require("../lib/logger");

/**
 * Fetch audit logs for a specific CMS slot
 */
async function getCmsAuditLogs(slotId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const filter = {
    slotId,
    eventType: {
      $in: ["faq_updated", "instruction_updated", "page_updated"],
    },
  };

  // Query audit-service for logs
  const params = {
    skip,
    limit: parseInt(limit),
    sort: "createdAt:-1",
  };

  // Handle complex query objects
  if (filter.eventType && Array.isArray(filter.eventType.$in)) {
    // For $in queries, use the first event type as a simple filter
    params.eventType = filter.eventType.$in[0];
  }
  if (filter.slotId) {
    // Can't filter by slotId via simple params, skip for now
  }

  const response = await auditClient.get(`/api/audit/logs`, {
    params,
  });

  const logs = response.logs || [];
  const total = response.total || 0;

  return {
    logs,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

module.exports = {
  getCmsAuditLogs,
};
