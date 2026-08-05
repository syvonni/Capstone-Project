const express = require('express')
const { requireJwt, requireRole } = require('../../middleware/auth')
const respond = require('../../middleware/respond')
const AuditLog = require('../../models/AuditLog')
const router = express.Router()

// GET /api/audit/inspection-item/:inspectionItemId — Get audit history for a specific inspection item
router.get(
  '/inspection-item/:inspectionItemId',
  requireJwt,
  requireRole(['admin']),
  async (req, res) => {
  try {
    const { inspectionItemId } = req.params
    const { limit = 50, skip = 0 } = req.query

    const query = {
      $or: [
        { 'metadata.inspectionItemId': inspectionItemId },
        { 'metadata.entityId': inspectionItemId },
        { entityId: inspectionItemId },
      ],
      eventType: { $in: ['inspection_item_created', 'inspection_item_updated', 'inspection_item_disabled'] },
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
    console.error('GET /api/audit/inspection-item/:inspectionItemId error:', err)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch inspection item audit history',
    })
  }
})

module.exports = router
