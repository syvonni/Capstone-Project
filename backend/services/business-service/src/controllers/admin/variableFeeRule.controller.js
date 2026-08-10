const BaseController = require("../base.controller");
const variableFeeRuleService = require("../../services/admin/variableFeeRule.service");

class VariableFeeRuleController extends BaseController {
  constructor() {
    super();
    this.service = variableFeeRuleService;
  }

  /**
   * List variable fee rules
   */
  async list(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.list(req.query);
    });
  }

  /**
   * Get LOBs that use this variable fee rule
   */
  async getLobs(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getLobs(req.params.id);
    });
  }

  /**
   * Get variable fee rule by ID
   */
  async getById(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getById(req.params.id);
    });
  }

  /**
   * Get audit history for a variable fee rule
   */
  async getAuditHistory(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getAuditHistory(req.params.id, req.query);
    });
  }

  /**
   * Create variable fee rule
   */
  async create(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.create(req.body, req._userId, req);
    }, { successStatus: 201 });
  }

  /**
   * Update variable fee rule
   */
  async update(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.update(req.params.id, req.body, req._userId, req);
    });
  }

  /**
   * Disable variable fee rule
   */
  async disable(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.disable(req.params.id, req._userId, req);
    });
  }
}

module.exports = new VariableFeeRuleController();
