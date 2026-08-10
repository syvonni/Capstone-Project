const BaseController = require("../base.controller");
const paymentService = require("../../services/business/payment.service");

class PaymentController extends BaseController {
  constructor() {
    super();
    this.service = paymentService;
  }

  /**
   * List all payments for the authenticated user
   */
  async list(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.list(req._userId, req.query);
    });
  }

  /**
   * List pending payments for the authenticated user
   */
  async getPending(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getPending(req._userId, req.query);
    });
  }

  /**
   * Payment history with filters
   */
  async getHistory(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getHistory(req._userId, req.query);
    });
  }

  /**
   * Get payment details by ID
   */
  async getById(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getById(req._userId, req.params.paymentId);
    });
  }

  /**
   * Create a payment record (for fees, penalties, etc.)
   */
  async create(req, res) {
    return this.handleRequest(
      req,
      res,
      async (req, res) => {
        return await this.service.create(req._userId, req, req.body);
      },
      { successStatus: 201 },
    );
  }

  /**
   * Process payment
   */
  async pay(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.pay(req._userId, req.params.paymentId, req.body);
    });
  }

  /**
   * Cancel a pending payment
   */
  async cancel(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.cancel(req._userId, req.params.paymentId, req.body);
    });
  }

  /**
   * Generate receipt for a paid payment (business owner)
   */
  async getReceipt(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getReceipt(req._userId, req.params.paymentId);
    });
  }

  /**
   * Create a mock payment record for testing (frontend simulation)
   */
  async createMock(req, res) {
    return this.handleRequest(
      req,
      res,
      async (req, res) => {
        return await this.service.createMock(req._userId, req, req.body);
      },
      { successStatus: 201 },
    );
  }
}

module.exports = new PaymentController();
