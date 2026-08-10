const BaseController = require("../base.controller");
const variableService = require("../../services/admin/variable.service");
const variableDataQualityService = require("../../services/admin/variableDataQuality.service");
const variablePerformanceService = require("../../services/admin/variablePerformance.service");

class VariableController extends BaseController {
  constructor() {
    super(variableService);
    this.dataQualityService = variableDataQualityService;
    this.performanceService = variablePerformanceService;
  }

  /**
   * List variables
   */
  async list(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.list(req.query);
    });
  }

  /**
   * Get variable by ID
   */
  async getById(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getById(req.params.id);
    });
  }

  /**
   * Get variables by fee ID
   */
  async getByFeeId(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getByFeeId(req.params.feeId);
    });
  }

  /**
   * Get variables by variable fee rule ID
   */
  async getByVariableFeeRuleId(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getByVariableFeeRuleId(req.params.variableFeeRuleId);
    });
  }

  /**
   * Create variable
   */
  async create(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.create(req.body, req._userId, req);
    });
  }

  /**
   * Update variable
   */
  async update(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.update(req.params.id, req.body, req._userId, req);
    });
  }

  /**
   * Disable variable
   */
  async disable(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.disable(req.params.id, req._userId, req);
    });
  }

  /**
   * Get audit history for a variable
   */
  async getAuditHistory(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getAuditHistory(req.params.id, req.query);
    });
  }

  /**
   * Get data quality for all variables
   */
  async getDataQuality(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.dataQualityService.validateAllVariables();
    });
  }

  /**
   * Get data quality for a specific variable
   */
  async getDataQualityById(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.dataQualityService.validateVariable(req.params.id);
    });
  }

  /**
   * Get performance summary for all variables
   */
  async getPerformance(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.performanceService.getPerformanceSummary(req.query.timeRange);
    });
  }

  /**
   * Get performance for a specific variable
   */
  async getPerformanceById(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.performanceService.getVariablePerformance(
        req.params.id,
        req.query.timeRange,
      );
    });
  }
}

module.exports = new VariableController();
