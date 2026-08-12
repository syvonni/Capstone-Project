const BaseController = require("../base.controller");
const Fee = require("../../../../../shared/models/Fee");
const PermitForm = require("../../../../../shared/models/PermitForm");

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

      console.log("[getFeeByPermitForm] formId:", formId);

      // Get permit form directly from shared models with populated fee
      const permitForm = await PermitForm.findOne({
        formId,
        isActive: true,
      }).populate("feeId");

      if (!permitForm) {
        const error = new Error("Permit form not found");
        error.code = "NOT_FOUND";
        error.status = 404;
        throw error;
      }

      console.log(
        "[getFeeByPermitForm] permitForm:",
        permitForm.formId,
        "feeId:",
        permitForm.feeId,
      );

      // Collect all fees to include in breakdown
      const fees = [];
      let total = 0;

      // Add permit-specific fee if configured
      if (permitForm.feeId) {
        const fee = permitForm.feeId;
        console.log(
          "[getFeeByPermitForm] permit-specific fee:",
          fee.name,
          "amount:",
          fee.amount,
          "isActive:",
          fee.isActive,
        );
        if (fee && fee.isActive) {
          fees.push({
            label: fee.name,
            amount: fee.amount,
            description: fee.notes || "",
          });
          total += fee.amount;
        }
      }

      // Add all global fees (apply to all permit types)
      const globalFees = await Fee.find({
        category: "global",
        isActive: true,
      });

      console.log("[getFeeByPermitForm] global fees found:", globalFees.length);
      for (const globalFee of globalFees) {
        console.log(
          "[getFeeByPermitForm] adding global fee:",
          globalFee.name,
          "amount:",
          globalFee.amount,
        );
        fees.push({
          label: globalFee.name,
          amount: globalFee.amount,
          description: globalFee.notes || "",
        });
        total += globalFee.amount;
      }

      console.log(
        "[getFeeByPermitForm] final fees:",
        fees.length,
        "total:",
        total,
      );

      // Return combined fee breakdown
      return {
        fees,
        total,
      };
    });
  }
}

module.exports = new ApplicationFeeController();
