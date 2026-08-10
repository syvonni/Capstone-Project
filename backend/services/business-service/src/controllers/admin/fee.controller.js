const BaseController = require("../base.controller");
const feeService = require("../../services/admin/fee.service");

class FeeController extends BaseController {
  constructor() {
    super();
    this.service = feeService;
  }

  /**
   * List fees
   */
  async list(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.list(req.query);
    });
  }

  /**
   * Get fee by ID
   */
  async getById(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getById(req.params.id);
    });
  }

  /**
   * Create fee (internal service endpoint)
   */
  async createInternal(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.createInternal(req.body);
    });
  }

  /**
   * Create fee (admin endpoint)
   */
  async create(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.create(req.body, req._userId, req);
    });
  }

  /**
   * Update fee
   */
  async update(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.update(req.params.id, req.body, req._userId, req);
    });
  }

  /**
   * Disable fee
   */
  async disable(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.disable(req.params.id, req._userId, req);
    });
  }

  /**
   * Get audit history for a fee
   */
  async getAuditHistory(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getAuditHistory(req.params.id, req.query);
    });
  }

  /**
   * Get fees by category
   */
  async getByCategory(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getByCategory(req.params.category);
    });
  }

  /**
   * Update variable calculation for a fee
   */
  async updateVariableCalculation(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.updateVariableCalculation(
        req.params.id,
        req.body,
        req._userId,
        req,
      );
    });
  }
}

module.exports = new FeeController();
