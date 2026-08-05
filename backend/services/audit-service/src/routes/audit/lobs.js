const express = require('express')
const { requireJwt, requireRole } = require('../../middleware/auth')
const respond = require('../../middleware/respond')
const AuditLog = require('../../models/AuditLog')
const router = express.Router()

// GET /api/audit/lob/:lobId — Get audit history for a specific LOB
router.get(
  '/lob/:lobId',
  requireJwt,
  requireRole(['admin']),
  async (req, res) => {
  try {
    const { lobId } = req.params
    const { limit = 50, skip = 0 } = req.query

    const query = {
      $or: [
        { 'metadata.lobId': lobId },
        { 'metadata.entityId': lobId },
        { entityId: lobId },
      ],
      eventType: { $in: ['lob_created', 'lob_updated'] },
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
    console.error('GET /api/audit/lob/:lobId error:', err)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch LOB audit history',
    })
  }
})

module.exports = router
