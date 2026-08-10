/**
 * Business Creation Service
 *
 * PURPOSE: Handles business creation from approved permit applications.
 * Extracts business creation logic from application approval workflow.
 *
 * USAGE EXAMPLE:
 * const businessCreationService = require('../services/lgu-officer/businessCreation.service');
 * const business = await businessCreationService.createBusinessFromApplication(application, businessProfile);
 */

const Business = require("../../models/Business");

class BusinessCreationService {
  /**
   * Generate unique business ID
   *
   * @returns {string} - Business ID in format BIZ-{timestamp}-{random}
   */
  generateBusinessId() {
    return `BIZ-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
  }

  /**
   * Extract business name from form data
   * Handles multiple field keys used by different form types
   *
   * @param {object} formData - Form data from application
   * @returns {string} - Business name
   */
  extractBusinessName(formData) {
    return (
      formData?.businessName ||
      formData?.registeredBusinessName ||
      formData?.activityName ||
      formData?.["Business / trade name"] ||
      formData?.businessTradeName ||
      "Unnamed Business"
    );
  }

  /**
   * Create Business entity from approved application
   *
   * @param {object} application - Application document
   * @param {object} businessProfile - BusinessProfile document
   * @returns {Promise<object>} - Created Business document
   * @throws {Error} - If businessProfile not found
   */
  async createBusinessFromApplication(application, businessProfile) {
    if (!businessProfile) {
      const error = new Error("Business profile not found");
      error.code = "NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const generatedBusinessId = this.generateBusinessId();
    const businessName = this.extractBusinessName(application.formData);

    const business = await Business.create({
      businessId: generatedBusinessId,
      userId: application.userId,
      ownerProfileId: businessProfile._id,
      approvedApplicationId: application._id,
      businessName,
      registeredBusinessName: application.formData?.registeredBusinessName || "",
      businessStatus: "active",
      registrationStatus: "proposed",
      location: application.formData?.location || {},
      businessType: application.formData?.businessType,
      registrationAgency: application.formData?.registrationAgency,
      businessRegistrationNumber: application.formData?.businessRegistrationNumber || "",
      businessStartDate: application.formData?.businessStartDate,
      numberOfBranches: application.formData?.numberOfBranches || 0,
      industryClassification: application.formData?.industryClassification || "",
      taxIdentificationNumber: application.formData?.taxIdentificationNumber || "",
      contactNumber: application.formData?.contactNumber || "",
      riskProfile: application.formData?.riskProfile || {},
    });

    return business;
  }
}

module.exports = new BusinessCreationService();
