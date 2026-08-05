const express = require("express");
const mongoose = require("mongoose");
const Fee = require("../models/Fee");
const ClaimableDocument = require("../models/ClaimableDocument");
const User = require("../models/User");
const axios = require("axios");
const {
  requireJwt,
  requireRole,
  requireAdminStepUp,
} = require("../middleware/auth");
const { logAuditEvent } = require("../lib/auditClient");
const { getUserInfo } = require("../../../../shared/lib/getUserInfo");
const ClaimableDocumentAuditHelper = require("../lib/auditHelpers/claimableDocumentAuditHelper");

const router = express.Router();

// GET /api/business/admin/documents — list all documents (excluding drafts)
router.get("/", requireJwt, async (req, res) => {
  try {
    const { category, isActive, includeDrafts, feeId } = req.query;
    const filter = { isDraft: { $ne: true } };
    if (includeDrafts === "true") delete filter.isDraft;
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (feeId) filter.feeId = new mongoose.Types.ObjectId(feeId);

    const documents = await ClaimableDocument.find(filter)
      .select('name notes category version effectiveDate createdAt updatedAt templateHtml templateImages templateTexts formIds feeId')
      .populate('checklistId')
      .sort({ createdAt: -1 });
    
    // Manually populate feeId to avoid model loading issues
    const feeIds = documents.filter(doc => doc.feeId).map(doc => doc.feeId.toString());
    const fees = feeIds.length > 0 ? await Fee.find({ _id: { $in: feeIds } }) : [];
    const feeMap = {};
    fees.forEach(fee => feeMap[fee._id.toString()] = fee);
    
    const populatedDocuments = documents.map(doc => {
      const docObj = doc.toObject();
      if (docObj.feeId) {
        docObj.feeId = feeMap[docObj.feeId.toString()] || null;
      }
      return docObj;
    });
    
    return res.json({ data: populatedDocuments });
  } catch (err) {
    console.error("GET /admin/documents error:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL",
        message: "Failed to fetch documents",
      },
    });
  }
});

// GET /api/business/admin/documents/:id — get single document (or draft)
router.get("/:id", requireJwt, async (req, res) => {
  try {
    const document = await ClaimableDocument.findById(req.params.id)
      .select('name notes category version effectiveDate createdAt updatedAt templateHtml templateImages templateTexts formIds feeId checklistId')
      .populate('checklistId');
    if (!document) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Document not found",
        },
      });
    }
    // Manually populate feeId to avoid model loading issues
    if (document.feeId) {
      const fee = await Fee.findById(document.feeId);
      document.feeId = fee;
    }
    return res.json({ data: document });
  } catch (err) {
    console.error("GET /admin/documents/:id error:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL",
        message: "Failed to fetch document",
      },
    });
  }
});

// GET /api/business/admin/documents/:id/audit — get audit history for a document
router.get(
  "/:id/audit",
  requireJwt,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const document = await ClaimableDocument.findById(id);
      if (!document) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Document not found",
          },
        });
      }

      // Query audit-service for logs using specific endpoint
      const auditServiceUrl =
        process.env.AUDIT_SERVICE_URL || "http://localhost:3004";
      const headers = { "Content-Type": "application/json" };
      if (process.env.AUDIT_SERVICE_API_KEY)
        headers["X-API-Key"] = process.env.AUDIT_SERVICE_API_KEY;

      const params = {
        page: parseInt(page),
        limit: parseInt(limit),
      };

      const response = await axios.get(`${auditServiceUrl}/api/audit/document/${id}`, {
        headers,
        params,
      });

      const logs = response.data.logs || [];
      const pagination = response.data.pagination || {};

      return res.json({
        success: true,
        logs,
        pagination,
      });
    } catch (err) {
      console.error("GET /admin/documents/:id/audit error:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL",
          message: "Failed to fetch audit history",
        },
      });
    }
  },
);

// GET /api/business/admin/documents/:id/draft — get draft for a document
router.get("/:id/draft", requireJwt, async (req, res) => {
  try {
    const draft = await ClaimableDocument.findOne({ draftOf: req.params.id }).lean();
    return res.json({ data: draft || null });
  } catch (err) {
    console.error("GET /admin/documents/:id/draft error:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL",
        message: "Failed to fetch draft",
      },
    });
  }
});

// POST /api/business/admin/documents/:id/draft — create or update draft
router.post(
  "/:id/draft",
  requireJwt,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, notes, category, templateHtml, templateImages } = req.body;

      const originalDocument = await ClaimableDocument.findById(id);
      if (!originalDocument) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Document not found",
          },
        });
      }

      // Check if draft already exists
      let draft = await ClaimableDocument.findOne({ draftOf: id });

      if (draft) {
        // Update existing draft
        if (name !== undefined) draft.name = String(name).trim();
        if (notes !== undefined)
          draft.notes = String(notes).trim();
        if (category !== undefined) draft.category = category;
        if (templateHtml !== undefined) draft.templateHtml = templateHtml;
        if (templateImages !== undefined) draft.templateImages = templateImages;
        await draft.save();
      } else {
        // Create new draft
        draft = new ClaimableDocument({
          name: name !== undefined ? String(name).trim() : originalDocument.name,
          notes:
            notes !== undefined
              ? String(notes).trim()
              : originalDocument.notes,
          category: category !== undefined ? category : originalDocument.category,
          templateHtml: templateHtml !== undefined ? templateHtml : originalDocument.templateHtml,
          templateImages: templateImages !== undefined ? templateImages : originalDocument.templateImages,
          isActive: originalDocument.isActive,
          isDraft: true,
          draftOf: id,
          version: originalDocument.version,
          effectiveDate: originalDocument.effectiveDate,
        });
        await draft.save();
      }

      return res.json({ data: draft });
    } catch (err) {
      console.error("POST /admin/documents/:id/draft error:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL",
          message: "Failed to save draft",
        },
      });
    }
  },
);

// POST /api/business/admin/documents/:id/publish — publish draft to original document
router.post(
  "/:id/publish",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const { id } = req.params;

      const draft = await ClaimableDocument.findOne({ draftOf: id });
      if (!draft) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Draft not found",
          },
        });
      }

      const originalDocument = await ClaimableDocument.findById(id);
      if (!originalDocument) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Original document not found",
          },
        });
      }

      const oldValues = {
        name: originalDocument.name,
        notes: originalDocument.notes,
        category: originalDocument.category,
        isActive: originalDocument.isActive,
        version: originalDocument.version,
        templateHtml: originalDocument.templateHtml,
        templateImages: originalDocument.templateImages,
      };

      // Update original document with draft values
      originalDocument.name = draft.name;
      originalDocument.notes = draft.notes;
      originalDocument.category = draft.category;
      originalDocument.templateHtml = draft.templateHtml;
      originalDocument.templateImages = draft.templateImages;
      originalDocument.version += 1;
      originalDocument.effectiveDate = new Date();

      await originalDocument.save();

      // Delete the draft
      await ClaimableDocument.deleteOne({ _id: draft._id });

      const changes = {
        name: { from: oldValues.name, to: originalDocument.name },
        notes: {
          from: oldValues.notes,
          to: originalDocument.notes,
        },
        category: { from: oldValues.category, to: originalDocument.category },
        templateHtml: { from: oldValues.templateHtml, to: originalDocument.templateHtml },
        templateImages: { from: oldValues.templateImages, to: originalDocument.templateImages },
      };

      const userInfo = await getUserInfo(req._userId);

      // Create old document object for comparison
      const oldDocument = new ClaimableDocument(oldValues);
      oldDocument._id = originalDocument._id;

      ClaimableDocumentAuditHelper.logPublished(req, req._userId, userInfo, oldDocument, originalDocument, "admin")
        .catch((err) => console.error("Failed to log audit event for document publish", err));

      return res.json({ data: originalDocument });
    } catch (err) {
      console.error("POST /admin/documents/:id/publish error:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL",
          message: "Failed to publish draft",
        },
      });
    }
  },
);

// POST /api/business/admin/documents — create document
router.post(
  "/",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const { name, notes, category, templateHtml, templateImages, templateTexts, feeAmount } = req.body;

      if (!name) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "name is required",
          },
        });
      }

      // Create associated fee if feeAmount is provided
      let feeId = null;
      if (feeAmount !== undefined && feeAmount !== null && feeAmount !== '') {
        const fee = await Fee.create({
          name: String(name).trim(),
          description: `Fee for ${String(name).trim()}`,
          amount: Number(feeAmount),
          category: "claimable_document",
          isActive: true,
          version: 1,
          effectiveDate: new Date(),
        });
        feeId = fee._id;
      }

      const document = await ClaimableDocument.create({
        name: String(name).trim(),
        notes: notes ? String(notes).trim() : null,
        category: category || "permit",
        templateHtml: templateHtml || null,
        templateImages: templateImages || [],
        templateTexts: templateTexts || [],
        feeId: feeId,
        isActive: true,
        version: 1,
        effectiveDate: new Date(),
      });

      const userInfo = await getUserInfo(req._userId);

      ClaimableDocumentAuditHelper.logCreated(req, req._userId, userInfo, document, "admin")
        .catch((err) => console.error("Failed to log audit event for document create", err));

      return res.status(201).json({ data: document });
    } catch (err) {
      console.error("POST /admin/documents error:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL",
          message: "Failed to create document",
        },
      });
    }
  },
);

// PUT /api/business/admin/documents/:id — update document (creates new version)
router.put("/:id", requireJwt, requireRole(["admin"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, notes, category, isActive, templateHtml, templateImages, templateTexts, formIds, checklistId } = req.body;

    const document = await ClaimableDocument.findById(id);
    if (!document) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "Document not found",
        },
      });
    }

    const oldValues = {
      name: document.name,
      notes: document.notes,
      category: document.category,
      isActive: document.isActive,
      version: document.version,
      templateHtml: document.templateHtml,
      templateImages: document.templateImages,
      templateTexts: document.templateTexts,
      formIds: document.formIds,
      checklistId: document.checklistId,
    };

    // Track changes
    const changes = {};
    if (name !== undefined && name !== document.name) {
      document.name = String(name).trim();
      changes.name = { from: oldValues.name, to: document.name };
    }
    if (notes !== undefined && notes !== document.notes) {
      document.notes = String(notes).trim();
      changes.notes = {
        from: oldValues.notes,
        to: document.notes,
      };
    }
    if (category !== undefined && category !== document.category) {
      document.category = category;
      changes.category = { from: oldValues.category, to: document.category };
    }
    if (isActive !== undefined && isActive !== document.isActive) {
      document.isActive = isActive;
      changes.isActive = { from: oldValues.isActive, to: document.isActive };
    }
    if (templateHtml !== undefined && templateHtml !== document.templateHtml) {
      document.templateHtml = templateHtml;
      changes.templateHtml = { from: oldValues.templateHtml, to: document.templateHtml };
    }
    if (templateImages !== undefined && JSON.stringify(templateImages) !== JSON.stringify(document.templateImages)) {
      document.templateImages = templateImages;
      changes.templateImages = { from: oldValues.templateImages, to: document.templateImages };
    }
    if (templateTexts !== undefined && JSON.stringify(templateTexts) !== JSON.stringify(document.templateTexts)) {
      document.templateTexts = templateTexts;
      changes.templateTexts = { from: oldValues.templateTexts, to: document.templateTexts };
    }
    if (formIds !== undefined && JSON.stringify(formIds) !== JSON.stringify(document.formIds)) {
      document.formIds = formIds;
      changes.formIds = { from: oldValues.formIds, to: document.formIds };
    }
    if (checklistId !== undefined && checklistId !== document.checklistId?.toString()) {
      document.checklistId = checklistId;
      changes.checklistId = { from: oldValues.checklistId, to: document.checklistId };
    }

    // Increment version if there are changes
    if (Object.keys(changes).length > 0) {
      document.version += 1;
      document.effectiveDate = new Date();
    }

    await document.save();

    const userInfo = await getUserInfo(req._userId);

    // Create old document object for comparison
    const oldDocument = new ClaimableDocument(oldValues);
    oldDocument._id = document._id;

    ClaimableDocumentAuditHelper.logUpdated(req, req._userId, userInfo, oldDocument, document, "admin")
      .catch((err) => console.error("Failed to log audit event for document update", err));

    return res.json({ data: document });
  } catch (err) {
    console.error("PUT /admin/documents/:id error:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL",
        message: "Failed to update document",
      },
    });
  }
});

// DELETE /api/business/admin/documents/:id — soft-disable document
router.delete(
  "/:id",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const document = await ClaimableDocument.findById(req.params.id);
      if (!document) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Document not found",
          },
        });
      }

      const documentId = String(document._id);
      const oldValues = {
        name: document.name,
        notes: document.notes,
        isActive: document.isActive,
      };

      // Soft-disable instead of hard delete
      document.isActive = false;
      document.version += 1;
      document.effectiveDate = new Date();
      await document.save();

      const userInfo = await getUserInfo(req._userId);

      // Create old document object for snapshot
      const oldDocument = new ClaimableDocument(oldValues);
      oldDocument._id = document._id;
      oldDocument.category = document.category;

      ClaimableDocumentAuditHelper.logDisabled(req, req._userId, userInfo, oldDocument, "admin")
        .catch((err) => console.error("Failed to log audit event for document disable", err));

      return res.json({ data: { disabled: true } });
    } catch (err) {
      console.error("DELETE /admin/documents/:id error:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL",
          message: "Failed to disable document",
        },
      });
    }
  },
);

module.exports = router;
