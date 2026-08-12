const mongoose = require("mongoose");
const Fee = require("../../../../../shared/models/Fee");
const ClaimableDocument = require("../../../../../shared/models/ClaimableDocument");
const PostRequirement = require("../../models/PostRequirement");
const Violation = require("../../models/Violation");
const Lob = require("../../models/Lob");
const Checklist = require("../../models/Checklist");
const InspectionItem = require("../../models/InspectionItem");
const { auditClient } = require("../../../../../shared/lib/httpClient");
const { getUserInfo } = require("../../../../../shared/lib/getUserInfo");
const ClaimableDocumentAuditHelper = require("../../lib/auditHelpers/claimableDocumentAuditHelper");

class ClaimableDocumentService {
  /**
   * List documents with filters
   */
  async list(filters = {}) {
    const { category, isActive, includeDrafts, feeId } = filters;
    const filter = { isDraft: { $ne: true } };
    if (includeDrafts === "true") delete filter.isDraft;
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (feeId) filter.feeId = new mongoose.Types.ObjectId(feeId);

    const documents = await ClaimableDocument.find(filter)
      .select(
        "name notes category version createdAt updatedAt templateHtml templateImages templateTexts formIds feeId checklistId",
      )
      .sort({ createdAt: -1 });

    // Manually populate feeId to avoid model loading issues
    const feeIds = documents
      .filter((doc) => doc.feeId)
      .map((doc) => doc.feeId.toString());
    const fees =
      feeIds.length > 0 ? await Fee.find({ _id: { $in: feeIds } }) : [];
    const feeMap = {};
    fees.forEach((fee) => (feeMap[fee._id.toString()] = fee));

    const populatedDocuments = documents.map((doc) => {
      const docObj = doc.toObject();
      if (docObj.feeId) {
        docObj.feeId = feeMap[docObj.feeId.toString()] || null;
      }
      return docObj;
    });

    return populatedDocuments;
  }

  /**
   * Get document by ID
   */
  async getById(id) {
    const document = await ClaimableDocument.findById(id).select(
      "name notes category version createdAt updatedAt templateHtml templateImages templateTexts formIds feeId checklistId",
    );

    if (!document) {
      const error = new Error("Document not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    // Manually populate feeId to avoid model loading issues
    if (document.feeId) {
      const fee = await Fee.findById(document.feeId);
      document.feeId = fee;
    }

    return document;
  }

  /**
   * Get audit history for a document
   */
  async getAuditHistory(id, filters = {}) {
    const { page = 1, limit = 20 } = filters;

    const document = await ClaimableDocument.findById(id);
    if (!document) {
      const error = new Error("Document not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    // Query audit-service for logs using specific endpoint
    const params = {
      page: parseInt(page),
      limit: parseInt(limit),
    };

    const response = await auditClient.get(`/api/audit/document/${id}`, {
      params,
    });

    const logs = response.data.logs || [];
    const pagination = response.data.pagination || {};

    return { logs, pagination };
  }

  /**
   * Get draft for a document
   */
  async getDraft(id) {
    const draft = await ClaimableDocument.findOne({
      draftOf: id,
    }).lean();
    return draft || null;
  }

  /**
   * Create or update draft for a document
   */
  async saveDraft(id, data) {
    const { name, notes, category, templateHtml, templateImages } = data;

    const originalDocument = await ClaimableDocument.findById(id);
    if (!originalDocument) {
      const error = new Error("Document not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    // Check if draft already exists
    let draft = await ClaimableDocument.findOne({ draftOf: id });

    if (draft) {
      // Update existing draft
      if (name !== undefined) draft.name = String(name).trim();
      if (notes !== undefined) draft.notes = String(notes).trim();
      if (category !== undefined) draft.category = category;
      if (templateHtml !== undefined) draft.templateHtml = templateHtml;
      if (templateImages !== undefined) draft.templateImages = templateImages;
      await draft.save();
    } else {
      // Create new draft
      draft = new ClaimableDocument({
        name: name !== undefined ? String(name).trim() : originalDocument.name,
        notes:
          notes !== undefined ? String(notes).trim() : originalDocument.notes,
        category: category !== undefined ? category : originalDocument.category,
        templateHtml:
          templateHtml !== undefined
            ? templateHtml
            : originalDocument.templateHtml,
        templateImages:
          templateImages !== undefined
            ? templateImages
            : originalDocument.templateImages,
        isActive: originalDocument.isActive,
        isDraft: true,
        draftOf: id,
        version: originalDocument.version,
      });
      await draft.save();
    }

    return draft;
  }

  /**
   * Publish draft to original document
   */
  async publishDraft(id, userId, req) {
    const draft = await ClaimableDocument.findOne({ draftOf: id });
    if (!draft) {
      const error = new Error("Draft not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const originalDocument = await ClaimableDocument.findById(id);
    if (!originalDocument) {
      const error = new Error("Original document not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
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
      templateHtml: {
        from: oldValues.templateHtml,
        to: originalDocument.templateHtml,
      },
      templateImages: {
        from: oldValues.templateImages,
        to: originalDocument.templateImages,
      },
    };

    const userInfo = await getUserInfo(userId);

    // Create old document object for comparison
    const oldDocument = new ClaimableDocument(oldValues);
    oldDocument._id = originalDocument._id;

    ClaimableDocumentAuditHelper.logPublished(
      req,
      userId,
      userInfo,
      oldDocument,
      originalDocument,
      "admin",
    ).catch((err) =>
      console.error("Failed to log audit event for document publish", err),
    );

    return originalDocument;
  }

  /**
   * Create document
   */
  async create(data, userId, req) {
    const {
      name,
      notes,
      category,
      templateHtml,
      templateImages,
      templateTexts,
      feeAmount,
    } = data;

    if (!name) {
      const error = new Error("name is required");
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    // Check for duplicate name across entity types
    const relatedCollections = [
      PostRequirement,
      Violation,
      Fee,
      Lob,
      Checklist,
      InspectionItem,
    ];

    for (const RelatedModel of relatedCollections) {
      const existing = await RelatedModel.findOne({
        name: String(name).trim(),
      });
      if (existing) {
        const error = new Error(
          `Name already exists in ${RelatedModel.modelName}`,
        );
        error.code = "DUPLICATE_NAME";
        error.status = 400;
        throw error;
      }
    }

    // Create associated fee if feeAmount is provided
    let feeId = null;
    if (feeAmount !== undefined && feeAmount !== null && feeAmount !== "") {
      const fee = await Fee.create({
        name: String(name).trim(),
        description: `Fee for ${String(name).trim()}`,
        amount: Number(feeAmount),
        category: "claimable_document",
        isActive: true,
        version: 1,
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
    });

    const userInfo = await getUserInfo(userId);

    ClaimableDocumentAuditHelper.logCreated(
      req,
      userId,
      userInfo,
      document,
      "admin",
    ).catch((err) =>
      console.error("Failed to log audit event for document create", err),
    );

    return document;
  }

  /**
   * Update document
   */
  async update(id, data, userId, req) {
    const {
      name,
      notes,
      category,
      isActive,
      templateHtml,
      templateImages,
      templateTexts,
      formIds,
      checklistId,
    } = data;

    const document = await ClaimableDocument.findById(id);
    if (!document) {
      const error = new Error("Document not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
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
      changes.templateHtml = {
        from: oldValues.templateHtml,
        to: document.templateHtml,
      };
    }
    if (
      templateImages !== undefined &&
      JSON.stringify(templateImages) !== JSON.stringify(document.templateImages)
    ) {
      document.templateImages = templateImages;
      changes.templateImages = {
        from: oldValues.templateImages,
        to: document.templateImages,
      };
    }
    if (
      templateTexts !== undefined &&
      JSON.stringify(templateTexts) !== JSON.stringify(document.templateTexts)
    ) {
      document.templateTexts = templateTexts;
      changes.templateTexts = {
        from: oldValues.templateTexts,
        to: document.templateTexts,
      };
    }
    if (
      formIds !== undefined &&
      JSON.stringify(formIds) !== JSON.stringify(document.formIds)
    ) {
      document.formIds = formIds;
      changes.formIds = { from: oldValues.formIds, to: document.formIds };
    }
    if (
      checklistId !== undefined &&
      checklistId !== document.checklistId?.toString()
    ) {
      document.checklistId = checklistId;
      changes.checklistId = {
        from: oldValues.checklistId,
        to: document.checklistId,
      };
    }

    // Increment version if there are changes
    if (Object.keys(changes).length > 0) {
      document.version += 1;
    }

    await document.save();

    const userInfo = await getUserInfo(userId);

    // Create old document object for comparison
    const oldDocument = new ClaimableDocument(oldValues);
    oldDocument._id = document._id;

    ClaimableDocumentAuditHelper.logUpdated(
      req,
      userId,
      userInfo,
      oldDocument,
      document,
      "admin",
    ).catch((err) =>
      console.error("Failed to log audit event for document update", err),
    );

    return document;
  }

  /**
   * Disable document (soft delete)
   */
  async disable(id, userId, req) {
    const document = await ClaimableDocument.findById(id);
    if (!document) {
      const error = new Error("Document not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
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
    await document.save();

    const userInfo = await getUserInfo(userId);

    // Create old document object for snapshot
    const oldDocument = new ClaimableDocument(oldValues);
    oldDocument._id = document._id;
    oldDocument.category = document.category;

    ClaimableDocumentAuditHelper.logDisabled(
      req,
      userId,
      userInfo,
      oldDocument,
      "admin",
    ).catch((err) =>
      console.error("Failed to log audit event for document disable", err),
    );

    return { disabled: true };
  }
}

module.exports = new ClaimableDocumentService();
