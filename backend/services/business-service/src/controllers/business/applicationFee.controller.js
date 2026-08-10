const BaseController = require("../base.controller");
const Fee = require("../../models/Fee");
const { createHttpClient } = require("../../../../../shared/lib/httpClient");

class ApplicationFeeController extends BaseController {
  constructor() {
    super();
  }

  /**
   * Get application fee for a specific permit form
   */
  async getFeeByPermitForm(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      const { formId } = req.params;
      
      // Call admin-service public endpoint to get permit form
      // Use docker network address for admin service
      const adminBaseUrl = process.env.ADMIN_SERVICE_URL || 'http://admin-service:3003';
      const adminClient = createHttpClient("admin", { baseURL: adminBaseUrl });
      const permitFormResponse = await adminClient.get(`/api/public/permit-forms/by-formId/${formId}`);
      
      if (!permitFormResponse || !permitFormResponse.data) {
        const error = new Error("Permit form not found");
        error.code = "NOT_FOUND";
        error.status = 404;
        throw error;
      }

      const permitForm = permitFormResponse.data;

      // If no feeId is set, return empty fee
      if (!permitForm.feeId) {
        return {
          success: true,
          fees: [],
          total: 0,
          message: "No fee configured for this permit form"
        };
      }

      // Get the fee details
      const fee = await Fee.findById(permitForm.feeId).lean();
      if (!fee || !fee.isActive) {
        return {
          success: true,
          fees: [],
          total: 0,
          message: "Fee not found or inactive"
        };
      }

      // Return fee in the expected format
      return {
        success: true,
        fees: [
          {
            label: fee.name,
            amount: fee.amount,
            description: fee.notes || ""
          }
        ],
        total: fee.amount
      };
    });
  }
}

module.exports = new ApplicationFeeController();
