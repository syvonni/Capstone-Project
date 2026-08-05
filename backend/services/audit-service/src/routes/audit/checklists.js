const express = require('express')
const { requireJwt, requireRole } = require('../../middleware/auth')
const respond = require('../../middleware/respond')
const AuditLog = require('../../models/AuditLog')
const router = express.Router()

// GET /api/audit/checklist/:checklistId — Get audit history for a specific checklist
router.get(
  '/checklist/:checklistId',
  requireJwt,
  requireRole(['admin']),
  async (req, res) => {
  try {
    const { checklistId } = req.params
    const { limit = 50, skip = 0 } = req.query

    const query = {
      $or: [
        { 'metadata.checklistId': checklistId },
        { 'metadata.entityId': checklistId },
        { entityId: checklistId },
      ],
      eventType: { $in: ['checklist_created', 'checklist_updated', 'checklist_disabled'] },
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
    console.error('GET /api/audit/checklist/:checklistId error:', err)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch checklist audit history',
    })
  }
})

module.exports = router
