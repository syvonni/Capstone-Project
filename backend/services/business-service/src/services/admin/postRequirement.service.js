const mongoose = require("mongoose");
const PostRequirement = require("../../models/PostRequirement");
const Violation = require("../../models/Violation");
const Fee = require("../../models/Fee");
const Lob = require("../../models/Lob");
const Checklist = require("../../models/Checklist");
const ClaimableDocument = require("../../models/ClaimableDocument");
const InspectionItem = require("../../models/InspectionItem");
const { auditClient } = require("../../../../../shared/lib/httpClient");
const { getUserInfo } = require("../../../../../shared/lib/getUserInfo");
const PostRequirementAuditHelper = require("../../lib/auditHelpers/postRequirementAuditHelper");

class PostRequirementService {
  /**
   * List post requirements with filters
   */
  async list(filters = {}) {
    const { isActive } = filters;
    const filter = {};
    
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const postRequirements = await PostRequirement.find(filter)
      .populate("checklistId")
      .sort({ name: 1 });

    return postRequirements;
  }

  /**
   * Get post requirement by ID
   */
  async getById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid post-requirement ID");
      error.code = "INVALID_ID";
      error.status = 400;
      throw error;
    }

    const postRequirement = await PostRequirement.findById(id).populate("checklistId");
    
    if (!postRequirement) {
      const error = new Error("Post-requirement not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    return postRequirement;
  }

  /**
   * Create post requirement
   */
  async create(data, userId, req) {
    const {
      name,
      code,
      description,
      legalBasis,
      notes,
      checklistId,
      customFields,
    } = data;

    if (!name) {
      const error = new Error("Name is required");
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    if (!code) {
      const error = new Error("Code is required");
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    // Check for duplicate code
    const existing = await PostRequirement.findOne({ code });
    if (existing) {
      const error = new Error("Post requirement with this code already exists");
      error.code = "DUPLICATE_CODE";
      error.status = 400;
      throw error;
    }

    // Check for duplicate name across entity types
    const relatedCollections = [
      Violation,
      Fee,
      Lob,
      Checklist,
      ClaimableDocument,
      InspectionItem,
    ];

    for (const RelatedModel of relatedCollections) {
      const existing = await RelatedModel.findOne({ name });
      if (existing) {
        const error = new Error(`Name already exists in ${RelatedModel.modelName}`);
        error.code = "DUPLICATE_NAME";
        error.status = 400;
        throw error;
      }
    }

    const postRequirement = await PostRequirement.create({
      name,
      code,
      description,
      legalBasis,
      notes,
      checklistId,
      customFields: customFields || [],
      createdBy: userId,
      updatedBy: userId,
    });

    const userInfo = await getUserInfo(userId);
    PostRequirementAuditHelper.logCreated(req, userId, userInfo, postRequirement, "admin").catch((err) =>
      console.error("Failed to log audit event for post requirement create", err),
    );

    return postRequirement;
  }

  /**
   * Update post requirement
   */
  async update(id, data, userId, req) {
    const {
      name,
      description,
      legalBasis,
      isActive,
      notes,
      checklistId,
      customFields,
    } = data;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid post-requirement ID");
      error.code = "INVALID_ID";
      error.status = 400;
      throw error;
    }

    const postRequirement = await PostRequirement.findById(id);
    if (!postRequirement) {
      const error = new Error("Post-requirement not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const updates = {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(notes !== undefined && { notes }),
      ...(legalBasis !== undefined && { legalBasis }),
      ...(isActive !== undefined && { isActive }),
      ...(checklistId !== undefined && { checklistId }),
      ...(customFields !== undefined && { customFields }),
      updatedBy: userId,
    };

    // Increment version if any definition field changed
    const definitionChanged =
      (name && name !== postRequirement.name) ||
      (description !== undefined && description !== postRequirement.description) ||
      (notes !== undefined && notes !== postRequirement.notes) ||
      (legalBasis !== undefined &&
        JSON.stringify(legalBasis) !== JSON.stringify(postRequirement.legalBasis)) ||
      (checklistId !== undefined &&
        checklistId !== postRequirement.checklistId?.toString()) ||
      (isActive !== undefined && isActive !== postRequirement.isActive) ||
      (customFields !== undefined &&
        JSON.stringify(customFields) !== JSON.stringify(postRequirement.customFields));

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

    const changes = Object.keys(updates).filter(
      (key) => key !== "updatedBy" && key !== "version",
    );

    const userInfo = await getUserInfo(userId);

    // Create old post requirement object for comparison
    const oldPostRequirement = new PostRequirement(oldValues);
    oldPostRequirement._id = postRequirement._id;

    PostRequirementAuditHelper.logUpdated(
      req,
      userId,
      userInfo,
      oldPostRequirement,
      updated,
      "admin",
    ).catch((err) =>
      console.error("Failed to log audit event for post requirement update", err),
    );

    return updated;
  }

  /**
   * Disable post requirement (soft delete)
   */
  async disable(id, userId, req) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid post-requirement ID");
      error.code = "INVALID_ID";
      error.status = 400;
      throw error;
    }

    const postRequirement = await PostRequirement.findById(id);
    if (!postRequirement) {
      const error = new Error("Post-requirement not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    if (!postRequirement.isActive) {
      const error = new Error("Post-requirement is already disabled");
      error.code = "INVALID_STATE";
      error.status = 400;
      throw error;
    }

    const oldValues = {
      name: postRequirement.name,
      isActive: postRequirement.isActive,
    };

    postRequirement.isActive = false;
    postRequirement.version += 1;
    await postRequirement.save();

    const userInfo = await getUserInfo(userId);

    // Create old post requirement object for snapshot
    const oldPostRequirement = new PostRequirement(oldValues);
    oldPostRequirement._id = postRequirement._id;

    PostRequirementAuditHelper.logDisabled(req, userId, userInfo, oldPostRequirement, "admin").catch(
      (err) => console.error("Failed to log audit event for post requirement delete", err),
    );

    return { disabled: true };
  }

  /**
   * Get audit history for a post requirement
   */
  async getAuditHistory(id, query = {}) {
    const { page = 1, limit = 20 } = query;
    
    try {
      const response = await auditClient.get(
        `/api/audit/post-requirement/${id}`,
        {
          params: { page, limit },
        }
      );
      return response || { logs: [], pagination: { total: 0, page, limit, totalPages: 0 } };
    } catch (error) {
      console.error("Failed to fetch audit history for post requirement:", error);
      return { logs: [], pagination: { total: 0, page, limit, totalPages: 0 } };
    }
  }

  /**
   * Get all post requirement audit logs (for stats panel)
   */
  async getAllAuditLogs(query = {}) {
    const { page = 1, limit = 20 } = query;
    
    try {
      const response = await auditClient.get(
        `/api/audit/post-requirements`,
        {
          params: { page, limit },
        }
      );
      return response || { logs: [], pagination: { total: 0, page, limit, totalPages: 0 } };
    } catch (error) {
      console.error("Failed to fetch all post requirement audit logs:", error);
      return { logs: [], pagination: { total: 0, page, limit, totalPages: 0 } };
    }
  }
}

module.exports = new PostRequirementService();
