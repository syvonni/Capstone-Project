const BaseController = require("../base.controller");
const profileService = require("../../services/business/profile.service");
const fileUploadService = require("../../services/business/fileUpload.service");
const {
  ok: respondOk,
  error: respondError,
} = require("../../middleware/respond");

class ProfileController extends BaseController {
  constructor() {
    super();
    this.service = profileService;
  }

  /**
   * Get current user's business profile
   */
  async getProfile(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getProfile(req._userId);
    });
  }

  /**
   * Get all businesses for current user
   */
  async getBusinesses(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      const businesses = await this.service.getBusinesses(req._userId);
      
      // Handle pagination parameters
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';
      const status = req.query.status || '';
      const sort = req.query.sort || 'updatedAt';
      const order = req.query.order || 'desc';

      // Filter businesses
      let filteredBusinesses = businesses;
      
      if (search) {
        const searchLower = search.toLowerCase();
        filteredBusinesses = filteredBusinesses.filter(b => 
          b.businessName?.toLowerCase().includes(searchLower) ||
          b.businessId?.toLowerCase().includes(searchLower)
        );
      }

      if (status) {
        filteredBusinesses = filteredBusinesses.filter(b => 
          b.applicationStatus === status || b.businessStatus === status
        );
      }

      // Sort businesses
      filteredBusinesses.sort((a, b) => {
        const aVal = a[sort] || a.updatedAt;
        const bVal = b[sort] || b.updatedAt;
        const comparison = aVal > bVal ? 1 : -1;
        return order === 'desc' ? -comparison : comparison;
      });

      // Paginate
      const totalItems = filteredBusinesses.length;
      const totalPages = Math.ceil(totalItems / limit);
      const startIndex = (page - 1) * limit;
      const paginatedBusinesses = filteredBusinesses.slice(startIndex, startIndex + limit);

      return {
        businesses: paginatedBusinesses,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    });
  }

  /**
   * Get primary business
   */
  async getPrimaryBusiness(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      const businesses = await this.service.getBusinesses(req._userId);
      const primaryBusiness = businesses.find(b => b.isPrimary) || businesses[0] || null;
      return { business: primaryBusiness };
    });
  }

  /**
   * Add a new business
   */
  async addBusiness(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.addBusiness(req._userId, req.body);
    });
  }

  /**
   * Update a business
   */
  async updateBusiness(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.updateBusiness(req._userId, req.params.businessId, req.body);
    });
  }

  /**
   * Update business status only
   */
  async updateBusinessStatus(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      const { businessStatus } = req.body;
      return await this.service.updateBusinessStatus(req._userId, req.params.businessId, { businessStatus });
    });
  }

  /**
   * Delete a business
   */
  async deleteBusiness(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.deleteBusiness(req._userId, req.params.businessId);
    });
  }

  /**
   * Update payment generation status
   */
  async updatePaymentGenerationStatus(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.updatePaymentGenerationStatus(req._userId, req.params.businessId, req.body);
    });
  }

  /**
   * Get payment generation status
   */
  async getPaymentGenerationStatus(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getPaymentGenerationStatus(req._userId, req.params.businessId);
    });
  }

  /**
   * Upload owner ID image
   */
  async uploadOwnerId(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      if (!req.file) {
        const error = new Error("No file uploaded");
        error.code = "FILE_REQUIRED";
        error.status = 400;
        throw error;
      }

      const side =
        (req.body?.side || "front").toString().replace(/[^a-zA-Z0-9_-]/g, "") ||
        "front";

      return await this.service.uploadOwnerId(req._userId, req.file, side);
    });
  }

  /**
   * Update business profile step
   */
  async updateStep(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      const { step, data } = req.body;
      return await this.service.updateStep(req._userId, step, data, req);
    });
  }

  /**
   * Delete entire business profile
   */
  async deleteProfile(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.deleteProfile(req._userId);
    });
  }

  /**
   * Get valid status transitions for a business
   */
  async getValidTransitions(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getValidTransitions(req._userId, req.params.businessId);
    });
  }

  /**
   * Validate status transition
   */
  async validateStatusTransition(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      const { newStatus, reason } = req.body;
      return await this.service.validateStatusTransition(
        req._userId,
        req.params.businessId,
        newStatus,
        reason,
        req._userId,
      );
    });
  }

  /**
   * Execute status transition
   */
  async executeStatusTransition(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      const { newStatus, reason, reviewedBy, reviewComments, rejectionReason } = req.body;
      return await this.service.executeStatusTransition(req._userId, req.params.businessId, newStatus, {
        reason,
        actorId: req._userId,
        reviewedBy,
        reviewComments,
        rejectionReason,
      });
    });
  }

  /**
   * Get status transition matrix
   */
  async getStatusTransitionMatrix(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getStatusTransitionMatrix();
    });
  }

  /**
   * Set business as primary
   */
  async setPrimaryBusiness(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.setPrimaryBusiness(req._userId, req.params.businessId);
    });
  }

  /**
   * Update business risk profile
   */
  async updateBusinessRiskProfile(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.updateBusinessRiskProfile(req._userId, req.params.businessId, req.body);
    });
  }

  /**
   * Confirm requirements checklist
   */
  async confirmRequirementsChecklist(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.confirmRequirementsChecklist(req._userId, req.params.businessId);
    });
  }

  /**
   * Generate requirements checklist PDF
   */
  async generateRequirementsChecklistPDF(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      const result = await this.service.generateRequirementsChecklistPDF(req._userId, req.params.businessId);

      // Set headers for PDF download
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${result.filename}"`,
      );
      res.setHeader("Content-Length", result.buffer.length);

      return res.send(result.buffer);
    });
  }

  /**
   * Update LGU documents
   */
  async updateLGUDocuments(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      const documents = req.body;
      return await this.service.updateLGUDocuments(req._userId, req.params.businessId, documents);
    });
  }

  /**
   * Upload business document file
   */
  async uploadBusinessDocumentFile(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      if (!req.file) {
        const error = new Error("No file uploaded");
        error.code = "FILE_REQUIRED";
        error.status = 400;
        throw error;
      }

      const fieldName = req.body?.fieldName || "file";
      return await this.service.uploadBusinessDocumentFile(req._userId, req.params.businessId, req.file, fieldName);
    });
  }

  /**
   * Update BIR registration
   */
  async updateBIRRegistration(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      const birData = req.body;
      return await this.service.updateBIRRegistration(req._userId, req.params.businessId, birData);
    });
  }

  /**
   * Update other agency registrations
   */
  async updateOtherAgencyRegistrations(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      const agencyData = req.body;
      return await this.service.updateOtherAgencyRegistrations(req._userId, req.params.businessId, agencyData);
    });
  }

  /**
   * Submit business application
   */
  async submitBusinessApplication(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.submitBusinessApplication(req._userId, req.params.businessId);
    });
  }

  /**
   * Get application status
   */
  async getApplicationStatus(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getApplicationStatus(req._userId, req.params.businessId);
    });
  }
}

module.exports = new ProfileController();
