const pdfService = require("../../lib/pdfService");
const logger = require("../../lib/logger");

class PdfGenerationService {
  /**
   * Generate business permit PDF
   */
  async generateBusinessPermit(businessData) {
    try {
      const pdfBuffer = await pdfService.generateBusinessPermit(businessData);
      return {
        success: true,
        buffer: pdfBuffer,
        filename: `business_permit_${businessData.businessId || 'unknown'}.pdf`,
      };
    } catch (err) {
      logger.error("Failed to generate business permit PDF", {
        error: err.message,
        businessId: businessData.businessId,
      });
      const error = new Error("Failed to generate business permit PDF");
      error.code = "PDF_GENERATION_FAILED";
      error.status = 500;
      throw error;
    }
  }

  /**
   * Generate business clearance PDF
   */
  async generateBusinessClearance(businessData) {
    try {
      const pdfBuffer = await pdfService.generateBusinessClearance(businessData);
      return {
        success: true,
        buffer: pdfBuffer,
        filename: `business_clearance_${businessData.businessId || 'unknown'}.pdf`,
      };
    } catch (err) {
      logger.error("Failed to generate business clearance PDF", {
        error: err.message,
        businessId: businessData.businessId,
      });
      const error = new Error("Failed to generate business clearance PDF");
      error.code = "PDF_GENERATION_FAILED";
      error.status = 500;
      throw error;
    }
  }

  /**
   * Generate payment receipt PDF
   */
  async generatePaymentReceipt(paymentData) {
    try {
      const pdfBuffer = await pdfService.generatePaymentReceipt(paymentData);
      return {
        success: true,
        buffer: pdfBuffer,
        filename: `payment_receipt_${paymentData.paymentId || 'unknown'}.pdf`,
      };
    } catch (err) {
      logger.error("Failed to generate payment receipt PDF", {
        error: err.message,
        paymentId: paymentData.paymentId,
      });
      const error = new Error("Failed to generate payment receipt PDF");
      error.code = "PDF_GENERATION_FAILED";
      error.status = 500;
      throw error;
    }
  }

  /**
   * Generate application acknowledgment PDF
   */
  async generateApplicationAcknowledgment(applicationData) {
    try {
      const pdfBuffer = await pdfService.generateApplicationAcknowledgment(applicationData);
      return {
        success: true,
        buffer: pdfBuffer,
        filename: `application_acknowledgment_${applicationData.applicationId || 'unknown'}.pdf`,
      };
    } catch (err) {
      logger.error("Failed to generate application acknowledgment PDF", {
        error: err.message,
        applicationId: applicationData.applicationId,
      });
      const error = new Error("Failed to generate application acknowledgment PDF");
      error.code = "PDF_GENERATION_FAILED";
      error.status = 500;
      throw error;
    }
  }

  /**
   * Generate tax clearance PDF
   */
  async generateTaxClearance(taxData) {
    try {
      const pdfBuffer = await pdfService.generateTaxClearance(taxData);
      return {
        success: true,
        buffer: pdfBuffer,
        filename: `tax_clearance_${taxData.businessId || 'unknown'}.pdf`,
      };
    } catch (err) {
      logger.error("Failed to generate tax clearance PDF", {
        error: err.message,
        businessId: taxData.businessId,
      });
      const error = new Error("Failed to generate tax clearance PDF");
      error.code = "PDF_GENERATION_FAILED";
      error.status = 500;
      throw error;
    }
  }

  /**
   * Generate generic PDF from template
   */
  async generateFromTemplate(templateName, data) {
    try {
      const pdfBuffer = await pdfService.generateFromTemplate(templateName, data);
      return {
        success: true,
        buffer: pdfBuffer,
        filename: `${templateName}_${Date.now()}.pdf`,
      };
    } catch (err) {
      logger.error("Failed to generate PDF from template", {
        error: err.message,
        templateName,
      });
      const error = new Error("Failed to generate PDF from template");
      error.code = "PDF_GENERATION_FAILED";
      error.status = 500;
      throw error;
    }
  }
}

module.exports = new PdfGenerationService();
