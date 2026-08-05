const express = require('express')
const { requireJwt, requireRole } = require('../../middleware/auth')
const respond = require('../../middleware/respond')
const AuditLog = require('../../models/AuditLog')
const router = express.Router()

// GET /api/audit/post-requirement/:postRequirementId — Get audit history for a specific post-requirement
router.get(
  '/post-requirement/:postRequirementId',
  requireJwt,
  requireRole(['admin']),
  async (req, res) => {
  try {
    const { postRequirementId } = req.params
    const { limit = 50, skip = 0 } = req.query

    const query = {
      $or: [
        { 'metadata.postRequirementId': postRequirementId },
        { 'metadata.entityId': postRequirementId },
        { entityId: postRequirementId },
      ],
      eventType: { $in: ['post_requirement_created', 'post_requirement_updated', 'post_requirement_disabled'] },
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
    console.error('GET /api/audit/post-requirement/:postRequirementId error:', err)
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch post-requirement audit history',
    })
  }
})

module.exports = router
