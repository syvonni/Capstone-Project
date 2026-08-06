const express = require('express')
const axios = require('axios')
const router = express.Router()
const Lob = require('../../models/Lob')
const PostRequirement = require('../../models/PostRequirement')
const { requireJwt, requireRole, requireAdminStepUp } = require('../../middleware/auth')
const { ok: respondOk, error: respondError } = require('../../middleware/respond')
const { getUserInfo } = require('../../../../../shared/lib/getUserInfo')
const LobAuditHelper = require('../../lib/auditHelpers/lobAuditHelper')

// GET /api/business/admin/lobs — list all LOBs
router.get("/", requireJwt, async (req, res) => {
  try {
    const { category, isActive, status } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (status) filter.status = status;

    const lobs = await Lob.find(filter)
      .populate('variables')
      .populate('documents')
      .populate('postRequirements.required')
      .populate('postRequirements.conditional')
      .sort({ category: 1, name: 1 });
    return respondOk(res, 200, lobs);
  } catch (err) {
    console.error("GET /admin/lobs error:", err);
    return respondError(res, 500, "INTERNAL", "Failed to fetch LOBs");
  }
});

// GET /api/business/admin/lobs/post-requirements — get available post requirements
router.get("/post-requirements", requireJwt, async (req, res) => {
  try {
    const postRequirements = await PostRequirement.find({ isActive: true }).sort({ code: 1 })
    return respondOk(res, 200, postRequirements)
  } catch (err) {
    console.error("GET /admin/lobs/post-requirements error:", err)
    return respondError(res, 500, "INTERNAL", "Failed to fetch post requirements")
  }
})

// GET /api/business/admin/lobs/:id — single LOB
router.get("/:id", requireJwt, async (req, res) => {
  try {
    const lob = await Lob.findById(req.params.id)
      .populate('variables')
      .populate('documents')
      .populate('postRequirements.required')
      .populate('postRequirements.conditional');
    if (!lob) {
      return respondError(res, 404, "NOT_FOUND", "LOB not found");
    }
    return respondOk(res, 200, lob);
  } catch (err) {
    console.error("GET /admin/lobs/:id error:", err);
    return respondError(res, 500, "INTERNAL", "Failed to fetch LOB");
  }
});

// GET /api/business/admin/lobs/:id/audit — proxy to audit service
router.get("/:id/audit", requireJwt, async (req, res) => {
  try {
    const auditServiceUrl = process.env.AUDIT_SERVICE_URL || "http://localhost:3004";
    const response = await axios.get(`${auditServiceUrl}/api/audit/lob/${req.params.id}`, {
      params: req.query,
    });
    return respondOk(res, 200, response.data);
  } catch (err) {
    console.error("GET /admin/lobs/:id/audit error:", err);
    return respondError(res, 500, "INTERNAL", "Failed to fetch audit history");
  }
});

// POST /api/business/admin/lobs — create LOB
router.post("/", requireJwt, requireRole(['admin']), requireAdminStepUp, async (req, res) => {
  try {
    const { code, name, description, category, lineOfBusiness, variables, licenses, notes, essentialCommodity, capitalTaxBrackets, grossSalesTaxBrackets } = req.body;

    // Validate required fields
    if (!code || !name || !description || !category || !lineOfBusiness) {
      return respondError(res, 400, "VALIDATION_ERROR", "Missing required fields: code, name, description, category, lineOfBusiness");
    }

    // Check if LOB with same code and name already exists
    const existingLob = await Lob.findOne({ code, name });
    if (existingLob) {
      return respondError(res, 400, "DUPLICATE", "LOB with this code and name already exists");
    }

    const lob = await Lob.create({
      code,
      name,
      description,
      category,
      lineOfBusiness,
      variables: variables || [],
      licenses: licenses || [],
      notes: notes || '',
      essentialCommodity: essentialCommodity || false,
      status: 'draft', // Default to draft status
    });

    // Create tax brackets if provided
    const TaxBracket = require('../../models/TaxBracket')
    const taxBrackets = [];

    if (capitalTaxBrackets && Array.isArray(capitalTaxBrackets)) {
      for (const bracket of capitalTaxBrackets) {
        const taxBracket = await TaxBracket.create({
          lobId: lob._id,
          name: bracket.name,
          taxBasis: 'capitalization',
          minValue: bracket.minValue,
          maxValue: bracket.maxValue || null,
          fixedAmount: bracket.fixedAmount,
          excessRate: bracket.excessRate || 0,
          excessRateType: 'direct',
          paymentFrequency: 'annual',
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
          taxBasis: 'gross_sales',
          minValue: bracket.minValue,
          maxValue: bracket.maxValue || null,
          fixedAmount: bracket.fixedAmount,
          excessRate: bracket.excessRate || 0,
          excessRateType: 'direct',
          paymentFrequency: 'annual',
          isActive: true,
        });
        taxBrackets.push(taxBracket);
      }
    }

    const userInfo = await getUserInfo(req._userId);

    LobAuditHelper.logCreated(req, req._userId, userInfo, lob, "admin", { taxBracketsCreated: taxBrackets.length })
      .catch((err) => console.error("Failed to log audit event for LOB create", err));

    return respondOk(res, 201, lob);
  } catch (err) {
    console.error("POST /admin/lobs error:", err);
    return respondError(res, 500, "INTERNAL", "Failed to create LOB");
  }
});

// PUT /api/business/admin/lobs/:id — update LOB (only variables, licenses, documents, postRequirements, status)
router.put("/:id", requireJwt, requireRole(['admin']), requireAdminStepUp, async (req, res) => {
  try {
    const lob = await Lob.findById(req.params.id);
    if (!lob) {
      return respondError(res, 404, "NOT_FOUND", "LOB not found");
    }

    const { variables, licenses, documents, postRequirements, status, disabledReason } = req.body;

    // Store previous values for audit
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
    if (variables !== undefined && JSON.stringify(variables) !== JSON.stringify(lob.variables)) {
      lob.variables = variables;
      changes.variables = { from: oldValues.variables, to: variables };
    }
    if (licenses !== undefined && JSON.stringify(licenses) !== JSON.stringify(lob.licenses)) {
      lob.licenses = licenses;
      changes.licenses = { from: oldValues.licenses, to: licenses };
    }
    if (documents !== undefined && JSON.stringify(documents) !== JSON.stringify(lob.documents)) {
      lob.documents = documents;
      changes.documents = { from: oldValues.documents, to: documents };
    }
    if (postRequirements !== undefined && JSON.stringify(postRequirements) !== JSON.stringify(lob.postRequirements)) {
      lob.postRequirements = postRequirements;
      changes.postRequirements = { from: oldValues.postRequirements, to: postRequirements };
    }
    if (status !== undefined && status !== lob.status) {
      lob.status = status;
      changes.status = { from: oldValues.status, to: status };
      
      // Handle status transitions
      if (status === 'disabled' && oldValues.status !== 'disabled') {
        lob.disabledDate = new Date();
        lob.disabledReason = disabledReason || '';
      } else if (status === 'draft') {
        lob.disabledDate = null;
        lob.disabledReason = null;
      }
    }
    if (disabledReason !== undefined && disabledReason !== lob.disabledReason) {
      lob.disabledReason = disabledReason;
      changes.disabledReason = { from: oldValues.disabledReason, to: disabledReason };
    }

    // Increment version if there are changes
    if (Object.keys(changes).length > 0) {
      lob.version += 1;
    }

    await lob.save();

    const userInfo = await getUserInfo(req._userId);

    // Create old LOB object for comparison
    const oldLob = new Lob(oldValues);
    oldLob._id = lob._id;
    oldLob.code = lob.code;
    oldLob.name = lob.name;
    oldLob.description = lob.description;
    oldLob.category = lob.category;
    oldLob.lineOfBusiness = lob.lineOfBusiness;

    LobAuditHelper.logUpdated(req, req._userId, userInfo, oldLob, lob, "admin")
      .catch((err) => console.error("Failed to log audit event for LOB update", err));

    return respondOk(res, 200, lob);
  } catch (err) {
    console.error("PUT /admin/lobs/:id error:", err);
    return respondError(res, 500, "INTERNAL", "Failed to update LOB");
  }
});

module.exports = router;
