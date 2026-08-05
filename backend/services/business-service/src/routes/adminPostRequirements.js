const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const PostRequirement = require("../models/PostRequirement");
const Lob = require("../models/Lob");
const User = require("../models/User");
const { requireJwt, requireRole, requireAdminStepUp } = require("../middleware/auth");
const { logAuditEvent } = require("../lib/auditClient");
const { getUserInfo } = require("../../../../shared/lib/getUserInfo");
const PostRequirementAuditHelper = require("../lib/auditHelpers/postRequirementAuditHelper");

const router = express.Router();

// GET /api/business/admin/post-requirements - list with filters
router.get("/", requireJwt, async (req, res) => {
  try {
    const { isActive } = req.query;
    const filter = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    const postRequirements = await PostRequirement.find(filter)
      .populate("checklistId")
      .sort({
      name: 1,
    });

    return res.json({
      data: postRequirements,
      total: postRequirements.length,
    });
  } catch (err) {
    console.error("GET /post-requirements error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL", message: "Failed to fetch post-requirements" },
    });
  }
});

// GET /api/business/admin/post-requirements/:id - get single
router.get("/:id", requireJwt, requireRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: { code: "INVALID_ID", message: "Invalid post-requirement ID" },
      });
    }

    const postRequirement = await PostRequirement.findById(id)
      .populate("checklistId");

    if (!postRequirement) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Post-requirement not found" },
      });
    }

    return res.json({ data: postRequirement });
  } catch (err) {
    console.error("GET /post-requirements/:id error:", err);
    return res.status(500).json({
      error: { code: "INTERNAL", message: "Failed to fetch post-requirement" },
    });
  }
});

// POST /api/business/admin/post-requirements - create
router.post(
  "/",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const { name, description, legalBasis, notes, checklistId, customFields } = req.body;

      if (!name) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Name is required",
          },
        });
      }

      const postRequirement = await PostRequirement.create({
        name,
        description,
        legalBasis,
        notes,
        checklistId,
        customFields: customFields || [],
        createdBy: req._userId,
        updatedBy: req._userId,
      });

      const userInfo = await getUserInfo(req._userId);
      PostRequirementAuditHelper.logCreated(req, req._userId, userInfo, postRequirement, "admin")
        .catch((err) => console.error("Failed to log audit event for post requirement create", err));

      return res.status(201).json({ data: postRequirement });
    } catch (err) {
      console.error("POST /post-requirements error:", err);
      return res.status(500).json({
        error: { code: "INTERNAL", message: "Failed to create post-requirement" },
      });
    }
  },
);

// PUT /api/business/admin/post-requirements/:id - update
router.put(
  "/:id",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, legalBasis, isActive, notes, checklistId, customFields } =
        req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          error: { code: "INVALID_ID", message: "Invalid post-requirement ID" },
        });
      }

      const postRequirement = await PostRequirement.findById(id);
      if (!postRequirement) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Post-requirement not found" },
        });
      }

      const updates = {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(notes !== undefined && { notes }),
        ...(legalBasis !== undefined && { legalBasis }),
        ...(isActive !== undefined && { isActive }),
        ...(checklistId !== undefined && { checklistId }),
        ...(customFields !== undefined && { customFields }),
        updatedBy: req._userId,
      };

      // Increment version if any definition field changed
      const definitionChanged =
        (name && name !== postRequirement.name) ||
        (description !== undefined && description !== postRequirement.description) ||
        (notes !== undefined && notes !== postRequirement.notes) ||
        (legalBasis !== undefined && JSON.stringify(legalBasis) !== JSON.stringify(postRequirement.legalBasis)) ||
        (checklistId !== undefined && checklistId !== postRequirement.checklistId?.toString()) ||
        (isActive !== undefined && isActive !== postRequirement.isActive) ||
        (customFields !== undefined && JSON.stringify(customFields) !== JSON.stringify(postRequirement.customFields));

      if (definitionChanged) {
        updates.version = postRequirement.version + 1;
      }

      const updated = await PostRequirement.findByIdAndUpdate(id, updates, {
        new: true,
      });

      const updatedValues = {
        name: updated.name,
        description: updated.description,
        notes: updated.notes,
        legalBasis: updated.legalBasis,
        checklistId: updated.checklistId,
        isActive: updated.isActive,
        customFields: updated.customFields,
      };

      const oldValues = {
        name: postRequirement.name,
        description: postRequirement.description,
        notes: postRequirement.notes,
        legalBasis: postRequirement.legalBasis,
        checklistId: postRequirement.checklistId,
        isActive: postRequirement.isActive,
        customFields: postRequirement.customFields,
      };

      const changes = Object.keys(updates).filter(key => key !== 'updatedBy' && key !== 'version');

      const userInfo = await getUserInfo(req._userId);

      // Create old post requirement object for comparison
      const oldPostRequirement = new PostRequirement(oldValues);
      oldPostRequirement._id = postRequirement._id;

      PostRequirementAuditHelper.logUpdated(req, req._userId, userInfo, oldPostRequirement, updated, "admin")
        .catch((err) => console.error("Failed to log audit event for post requirement update", err));

      return res.json({ data: updated });
    } catch (err) {
      console.error("PUT /post-requirements/:id error:", err);
      return res.status(500).json({
        error: { code: "INTERNAL", message: "Failed to update post-requirement" },
      });
    }
  },
);

// DELETE /api/business/admin/post-requirements/:id - soft delete
router.delete(
  "/:id",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          error: { code: "INVALID_ID", message: "Invalid post-requirement ID" },
        });
      }

      const postRequirement = await PostRequirement.findById(id);
      if (!postRequirement) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "Post-requirement not found" },
        });
      }

      // Check if post requirement is referenced by any LOB
      const dependentLobs = await Lob.find({
        $or: [
          { "postRequirements.required": id },
          { "postRequirements.conditional": id }
        ]
      });

      if (dependentLobs.length > 0) {
        return res.status(400).json({
          error: {
            code: "DEPENDENCY_ERROR",
            message: "Cannot disable post requirement that is associated with lines of business",
            dependencies: dependentLobs.map(lob => ({ id: lob._id, name: lob.name })),
          },
        });
      }

      const oldValues = {
        isActive: postRequirement.isActive,
        version: postRequirement.version,
      };

      // Soft-disable
      const updates = {
        isActive: false,
        version: postRequirement.version + 1,
        updatedBy: req._userId,
      };

      const updated = await PostRequirement.findByIdAndUpdate(id, updates, {
        new: true,
      });

      const userInfo = await getUserInfo(req._userId);

      // Create old post requirement object for snapshot
      const oldPostRequirement = new PostRequirement(oldValues);
      oldPostRequirement._id = postRequirement._id;
      oldPostRequirement.name = postRequirement.name;

      PostRequirementAuditHelper.logDisabled(req, req._userId, userInfo, oldPostRequirement, "admin")
        .catch((err) => console.error("Failed to log audit event for post requirement disable", err));

      return res.json({ data: updated });
    } catch (err) {
      console.error("DELETE /post-requirements/:id error:", err);
      return res.status(500).json({
        error: { code: "INTERNAL", message: "Failed to disable post-requirement" },
      });
    }
  },
);

// GET /api/business/admin/post-requirements/:id/audit - proxy to audit service
router.get("/:id/audit", requireJwt, async (req, res) => {
  try {
    const auditServiceUrl = process.env.AUDIT_SERVICE_URL || "http://localhost:3004";
    const response = await axios.get(`${auditServiceUrl}/api/audit/post-requirement/${req.params.id}`, {
      params: req.query,
    });
    return res.json(response.data);
  } catch (err) {
    console.error("GET /admin/post-requirements/:id/audit error:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL",
        message: "Failed to fetch audit history",
      },
    });
  }
});

module.exports = router;
