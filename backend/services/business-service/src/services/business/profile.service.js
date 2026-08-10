const businessProfileService = require("../../services/businessProfileService");
const statusTransitionService = require("../../services/statusTransitionService");
const fileUploadService = require("./fileUpload.service");
const pdfGenerationService = require("./pdfGeneration.service");
const pdfService = require("../../lib/pdfService");
const logger = require("../../lib/logger");

// Socket service for realtime updates (lazy-loaded to avoid startup issues)
let socketService = null;
function getSocketService() {
  if (!socketService) {
    try {
      socketService = require("../../../../../shared/lib/socketService");
    } catch (err) {
      logger.warn("Socket service not available:", err.message);
    }
  }
  return socketService;
}

class ProfileService {
  /**
   * Get current user's business profile
   */
  async getProfile(userId) {
    return await businessProfileService.getProfile(userId);
  }

  /**
   * Get all businesses for current user
   */
  async getBusinesses(userId) {
    return await businessProfileService.getBusinesses(userId);
  }

  /**
   * Update business profile step
   */
  async updateStep(userId, step, data, req) {
    if (!step || !data) {
      const error = new Error("Step and data are required");
      error.code = "MISSING_DATA";
      error.status = 400;
      throw error;
    }

    // Extract metadata for audit logging
    const ip =
      req.ip ||
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";
    const metadata = { ip, userAgent };

    return await businessProfileService.updateStep(
      userId,
      parseInt(step),
      data,
      metadata,
    );
  }

  /**
   * Delete entire business profile
   */
  async deleteProfile(userId) {
    return await businessProfileService.deleteProfile(userId);
  }

  /**
   * Get valid status transitions for a business
   */
  async getValidTransitions(userId, businessId) {
    return await statusTransitionService.getValidTransitions(
      userId,
      businessId,
    );
  }

  /**
   * Validate status transition
   */
  async validateStatusTransition(userId, businessId, newStatus, reason, actorId) {
    if (!newStatus) {
      const error = new Error("New status is required");
      error.code = "VALIDATION_ERROR";
      error.status = 400;
      throw error;
    }

    return await statusTransitionService.validateStatusTransition(
      userId,
      businessId,
      newStatus,
      reason,
      actorId,
    );
  }

  /**
   * Execute status transition
   */
  async executeStatusTransition(userId, businessId, newStatus, options) {
    if (!newStatus) {
      const error = new Error("New status is required");
      error.code = "TRANSITION_ERROR";
      error.status = 400;
      throw error;
    }

    return await statusTransitionService.executeStatusTransition(
      userId,
      businessId,
      newStatus,
      options,
    );
  }

  /**
   * Get status transition matrix
   */
  async getStatusTransitionMatrix() {
    return statusTransitionService.getStatusTransitionMatrix();
  }

  /**
   * Set business as primary
   */
  async setPrimaryBusiness(userId, businessId) {
    return await businessProfileService.setPrimaryBusiness(
      userId,
      businessId,
    );
  }

  /**
   * Update business risk profile
   */
  async updateBusinessRiskProfile(userId, businessId, riskProfileData) {
    return await businessProfileService.updateBusinessRiskProfile(
      userId,
      businessId,
      riskProfileData,
    );
  }

  /**
   * Confirm requirements checklist
   */
  async confirmRequirementsChecklist(userId, businessId) {
    // For "new" business registrations, we don't need to confirm against an existing business
    if (!businessId || businessId === "new") {
      return {
        confirmed: true,
        message:
          "Requirements checklist confirmed. Please proceed to Step 2 to fill out the application form.",
        businessId: "new",
      };
    }

    return await businessProfileService.confirmRequirementsChecklist(
      userId,
      businessId,
    );
  }

  /**
   * Generate requirements checklist PDF
   */
  async generateRequirementsChecklistPDF(userId, businessId) {
    const isNewBusiness = !businessId || businessId === "new";

    // If business exists, mark PDF as downloaded (non-blocking)
    if (!isNewBusiness) {
      try {
        const business = await businessProfileService.getBusiness(
          userId,
          businessId,
        );
        if (business) {
          try {
            await businessProfileService.markRequirementsPdfDownloaded(
              userId,
              businessId,
            );
          } catch (markError) {
            console.error("Failed to mark PDF as downloaded:", markError);
          }
        }
      } catch (businessError) {
        console.error("Failed to verify business:", businessError);
      }
    }

    // Generate PDF
    try {
      const pdfBuffer = await pdfService.generateRequirementsChecklistPDF();

      if (!pdfBuffer || pdfBuffer.length === 0) {
        const error = new Error("Generated PDF is empty");
        error.code = "PDF_GENERATION_FAILED";
        error.status = 500;
        throw error;
      }

      return {
        buffer: pdfBuffer,
        filename: `Business_Registration_Requirements_Checklist_${Date.now()}.pdf`,
      };
    } catch (pdfError) {
      console.error("PDF generation error:", pdfError);
      if (
        pdfError.message &&
        pdfError.message.includes("Cannot find module")
      ) {
        const error = new Error("PDF generation module not installed. Please install pdfkit: npm install pdfkit");
        error.code = "PDF_MODULE_MISSING";
        error.status = 500;
        throw error;
      }
      throw pdfError;
    }
  }

  /**
   * Update LGU documents
   */
  async updateLGUDocuments(userId, businessId, documents) {
    // For "new" business registrations, documents cannot be saved yet
    if (!businessId || businessId === "new") {
      const error = new Error("Please complete Step 2 (Application Form) to create the business before uploading documents.");
      error.code = "BUSINESS_REQUIRED";
      error.status = 400;
      throw error;
    }

    return await businessProfileService.updateLGUDocuments(
      userId,
      businessId,
      documents,
    );
  }

  /**
   * Upload business document file
   */
  async uploadBusinessDocumentFile(userId, businessId, file, fieldName) {
    if (!businessId || businessId === "new") {
      const error = new Error("Please complete Step 2 (Application Form) to create the business before uploading documents.");
      error.code = "BUSINESS_REQUIRED";
      error.status = 400;
      throw error;
    }

    return await fileUploadService.uploadBusinessDocument(businessId, file, fieldName);
  }

  /**
   * Update BIR registration
   */
  async updateBIRRegistration(userId, businessId, birData) {
    return await businessProfileService.updateBIRRegistration(
      userId,
      businessId,
      birData,
    );
  }

  /**
   * Update other agency registrations
   */
  async updateOtherAgencyRegistrations(userId, businessId, agencyData) {
    if (businessId === "new") {
      const error = new Error("Please complete Step 2 (Application Form) to create the business before saving agency registration details.");
      error.code = "BUSINESS_NOT_CREATED";
      error.status = 400;
      throw error;
    }

    return await businessProfileService.updateOtherAgencyRegistrations(
      userId,
      businessId,
      agencyData,
    );
  }

  /**
   * Submit business application
   */
  async submitBusinessApplication(userId, businessId) {
    const profile = await businessProfileService.submitBusinessApplication(
      userId,
      businessId,
    );
    const business = profile.businesses?.find(
      (b) => b.businessId === businessId || String(b._id) === businessId,
    );

    // Emit realtime event for new application submission
    const socket = getSocketService();
    if (socket && business) {
      socket.emitApplicationCreated(business, userId);
    }

    return {
      profile,
      referenceNumber: business?.applicationReferenceNumber,
      status: business?.applicationStatus,
      submittedAt: business?.submittedAt,
    };
  }

  /**
   * Get application status
   */
  async getApplicationStatus(userId, businessId) {
    return await businessProfileService.getApplicationStatus(userId, businessId);
  }

  /**
   * Upload owner ID
   */
  async uploadOwnerId(userId, file, side) {
    return await fileUploadService.uploadOwnerId(userId, file, side);
  }

  /**
   * Add a new business
   */
  async addBusiness(userId, businessData) {
    return await businessProfileService.addBusiness(userId, businessData);
  }

  /**
   * Update a business
   */
  async updateBusiness(userId, businessId, businessData) {
    return await businessProfileService.updateBusiness(userId, businessId, businessData);
  }

  /**
   * Delete a business
   */
  async deleteBusiness(userId, businessId) {
    return await businessProfileService.deleteBusiness(userId, businessId);
  }

  /**
   * Update payment generation status
   */
  async updatePaymentGenerationStatus(userId, businessId, status) {
    return await businessProfileService.updatePaymentGenerationStatus(userId, businessId, status);
  }

  /**
   * Get payment generation status
   */
  async getPaymentGenerationStatus(userId, businessId) {
    return await businessProfileService.getPaymentGenerationStatus(userId, businessId);
  }
}

module.exports = new ProfileService();
