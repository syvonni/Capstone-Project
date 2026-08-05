const express = require('express')
const { requireJwt, requireRole } = require('../../middleware/auth')
const respond = require('../../middleware/respond')
const AuditLog = require('../../models/AuditLog')
const router = express.Router()

// GET /api/audit/violation/:violationId — Get audit history for a specific violation
router.get(
  '/violation/:violationId',
  requireJwt,
  requireRole(['admin']),
  async (req, res) => {
  try {
    const { violationId } = req.params
    const { limit = 50, skip = 0 } = req.query

    const query = {
      $or: [
        { 'metadata.violationId': violationId },
        { 'metadata.entityId': violationId },
        { entityId: violationId },
      ],
      eventType: { $in: ['violation_created', 'violation_updated', 'violation_disabled'] },
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(Number(skip))
        .limit(Number(limit))
        .lean(),
      AuditLog.countDocuments(query),
    ])

    return res.json({
      success: true,
      logs,
      pagination: {
        total,
        limit: Number(limit),
        skip: Number(skip),
      },
    })
  } catch (err) {
    console.error('GET /api/audit/violation/:violationId error:', err)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch violation audit history',
    })
  }
})

module.exports = router
