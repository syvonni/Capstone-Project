const BaseController = require("../base.controller");
const paymentService = require("../../services/lgu-officer/payment.service");

class PaymentController extends BaseController {
  constructor() {
    super();
    this.service = paymentService;
  }

  /**
   * List payments for reviewed applications/businesses.
   */
  async list(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.list(req.query);
    });
  }

  /**
   * Get payment details by ID.
   */
  async getById(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getById(req.params.paymentId);
    });
  }

  /**
   * Generate receipt for a paid payment.
   */
  async getReceipt(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getReceipt(req.params.paymentId);
    });
  }
}

module.exports = new PaymentController();
