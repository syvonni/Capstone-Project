const mongoose = require("mongoose");
const Lob = require("../../models/Lob");
const TaxBracket = require("../../models/TaxBracket");
const PostRequirement = require("../../models/PostRequirement");
const Violation = require("../../models/Violation");
const Fee = require("../../models/Fee");
const Checklist = require("../../models/Checklist");
const ClaimableDocument = require("../../models/ClaimableDocument");
const InspectionItem = require("../../models/InspectionItem");
const { auditClient } = require("../../../../../shared/lib/httpClient");
const { getUserInfo } = require("../../../../../shared/lib/getUserInfo");
const LobAuditHelper = require("../../lib/auditHelpers/lobAuditHelper");

class LobService {
  /**
   * List LOBs with filters
   */
  async list(filters = {}) {
    const { category, isActive, status } = filters;
    const filter = {};
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (status) filter.status = status;

    const lobs = await Lob.find(filter)
      .populate("variables")
      .populate("documents")
      .populate("postRequirements.required")
      .populate("postRequirements.conditional")
      .sort({ category: 1, name: 1 });

    return lobs;
  }

  /**
   * Get available post requirements
   */
  async getPostRequirements() {
    const PostRequirement = require("../../models/PostRequirement");
    const postRequirements = await PostRequirement.find({
      isActive: true,
    }).sort({ code: 1 });
    return postRequirements;
  }

  /**
   * Get LOB by ID
   */
  async getById(id) {
    const lob = await Lob.findById(id)
      .populate("variables")
      .populate("documents")
      .populate("postRequirements.required")
      .populate("postRequirements.conditional");

    if (!lob) {
      const error = new Error("LOB not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    return lob;
  }

  /**
   * Create LOB
   */
  async create(lobData, userId, req) {
    const {
      code,
      name,
      description,
      category,
      lineOfBusiness,
      variables,
      licenses,
      notes,
      essentialCommodity,
      capitalTaxBrackets,
      grossSalesTaxBrackets,
    } = lobData;

    // Validate required fields
    if (!code || !name || !description || !category || !lineOfBusiness) {
      const error = new Error(
        "Missing required fields: code, name, description, category, lineOfBusiness",
      );
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    // Check if LOB with same code and name already exists
    const existingLob = await Lob.findOne({ code, name });
    if (existingLob) {
      const error = new Error("LOB with this code and name already exists");
      error.code = "DUPLICATE";
      error.status = 400;
      throw error;
    }

    // Check for duplicate name across entity types
    const relatedCollections = [
      PostRequirement,
      Violation,
      Fee,
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

    const lob = await Lob.create({
      code,
      name,
      description,
      category,
      lineOfBusiness,
      variables: variables || [],
      licenses: licenses || [],
      notes: notes || "",
      essentialCommodity: essentialCommodity || false,
      status: "draft",
    });

    // Create tax brackets if provided
    const taxBrackets = [];
    if (capitalTaxBrackets && Array.isArray(capitalTaxBrackets)) {
      for (const bracket of capitalTaxBrackets) {
        const taxBracket = await TaxBracket.create({
          lobId: lob._id,
          name: bracket.name,
          taxBasis: "capitalization",
          minValue: bracket.minValue,
          maxValue: bracket.maxValue || null,
          fixedAmount: bracket.fixedAmount || null,
          excessRate: bracket.excessRate || null,
          excessRateType: bracket.excessRateType || null,
          paymentFrequency: bracket.paymentFrequency || "annual",
          notes: bracket.notes || "",
          isActive: true,
        });
        taxBrackets.push(taxBracket);
      }
    }

    if (grossSalesTaxBrackets && Array.isArray(grossSalesTaxBrackets)) {
      for (const bracket of grossSalesTaxBrackets) {
        const taxBracket = await TaxBracket.create({
          lobId: lob._id,
          name: bracket.name,
          taxBasis: "gross_sales",
          minValue: bracket.minValue,
          maxValue: bracket.maxValue || null,
          fixedAmount: bracket.fixedAmount || null,
          excessRate: bracket.excessRate || null,
          excessRateType: bracket.excessRateType || null,
          paymentFrequency: bracket.paymentFrequency || "annual",
          notes: bracket.notes || "",
          isActive: true,
        });
        taxBrackets.push(taxBracket);
      }
    }

    const userInfo = await getUserInfo(userId);

    LobAuditHelper.logCreated(req, userId, userInfo, lob, "admin").catch((err) =>
      console.error("Failed to log audit event for LOB create", err),
    );

    return { lob, taxBrackets };
  }

  /**
   * Update LOB
   */
  async update(id, lobData, userId, req) {
    const {
      variables,
      licenses,
      documents,
      postRequirements,
      status,
      disabledReason,
    } = lobData;

    const lob = await Lob.findById(id);
    if (!lob) {
      const error = new Error("LOB not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const oldValues = {
      variables: lob.variables,
      licenses: lob.licenses,
      documents: lob.documents,
      postRequirements: lob.postRequirements,
      status: lob.status,
      disabledReason: lob.disabledReason,
      version: lob.version,
    };

    // Track changes
    const changes = {};
    const allowedFields = [
      "variables",
      "licenses",
      "documents",
      "postRequirements",
      "status",
      "disabledReason",
    ];

    for (const field of allowedFields) {
      if (lobData[field] !== undefined) {
        // Handle array comparison
        if (Array.isArray(lobData[field]) && Array.isArray(lob[field])) {
          if (JSON.stringify(lobData[field]) !== JSON.stringify(lob[field])) {
            lob[field] = lobData[field];
            changes[field] = { from: oldValues[field], to: lobData[field] };
          }
        } else if (lobData[field] !== lob[field]) {
          lob[field] = lobData[field];
          changes[field] = { from: oldValues[field], to: lobData[field] };
        }
      }
    }

    // Handle status transitions
    if (status !== undefined && status !== oldValues.status) {
      if (status === "disabled" && oldValues.status !== "disabled") {
        lob.disabledDate = new Date();
        lob.disabledReason = disabledReason || "";
      } else if (status === "draft") {
        lob.disabledDate = null;
        lob.disabledReason = null;
      }
    }

    // Increment version if there are changes
    if (Object.keys(changes).length > 0) {
      lob.version += 1;
    }

    await lob.save();

    const userInfo = await getUserInfo(userId);

    const oldLob = new Lob(oldValues);
    oldLob._id = lob._id;
    oldLob.code = lob.code;
    oldLob.name = lob.name;
    oldLob.description = lob.description;
    oldLob.category = lob.category;
    oldLob.lineOfBusiness = lob.lineOfBusiness;

    LobAuditHelper.logUpdated(req, userId, userInfo, oldLob, lob, "admin").catch(
      (err) => console.error("Failed to log audit event for LOB update", err),
    );

    return lob;
  }

  /**
   * Get audit history for a LOB
   */
  async getAuditHistory(id, filters = {}) {
    const { page = 1, limit = 20 } = filters;

    const lob = await Lob.findById(id);
    if (!lob) {
      const error = new Error("LOB not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    // Query audit-service for logs
    const params = {
      page: parseInt(page),
      limit: parseInt(limit),
    };

    const response = await auditClient.get(`/api/audit/lob/${id}`, {
      params,
    });

    const logs = response.logs || [];
    const pagination = response.pagination || {};

    return { logs, pagination };
  }

  /**
   * Get all LOB audit logs
   */
  async getAllAuditLogs(filters = {}, headers = {}) {
    const { page = 1, limit = 20 } = filters;

    // Query audit-service for all LOB logs
    const params = {
      page: parseInt(page),
      limit: parseInt(limit),
    };

    // Forward auth headers if provided
    const config = { params };
    if (headers.authorization) {
      config.headers = { authorization: headers.authorization };
    }

    const response = await auditClient.get("/api/audit/lobs", config);

    const logs = response.logs || [];
    const pagination = response.pagination || {};

    return { logs, pagination };
  }
}

module.exports = new LobService();
