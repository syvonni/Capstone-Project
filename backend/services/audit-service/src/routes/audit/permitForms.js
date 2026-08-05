const express = require('express')
const { requireJwt, requireRole } = require('../../middleware/auth')
const respond = require('../../middleware/respond')
const AuditLog = require('../../models/AuditLog')
const router = express.Router()

// GET /api/audit/permit-form/:permitFormId — Get audit history for a specific permit form
router.get(
  '/permit-form/:permitFormId',
  requireJwt,
  requireRole(['admin']),
  async (req, res) => {
  try {
    const { permitFormId } = req.params
    const { limit = 50, skip = 0 } = req.query

    const query = {
      $or: [
        { 'metadata.permitFormId': permitFormId },
        { 'metadata.entityId': permitFormId },
        { entityId: permitFormId },
      ],
      eventType: { $in: ['permit_form_created', 'permit_form_updated', 'permit_form_disabled', 'permit_form_status_changed'] },
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
    console.error('GET /api/audit/permit-form/:permitFormId error:', err)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch permit form audit history',
    })
  }
})

module.exports = router
