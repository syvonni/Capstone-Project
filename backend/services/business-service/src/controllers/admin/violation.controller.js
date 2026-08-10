const BaseController = require("../base.controller");
const violationService = require("../../services/admin/violation.service");
const violationDataQualityService = require("../../services/admin/violationDataQuality.service");
const violationPerformanceService = require("../../services/admin/violationPerformance.service");

class ViolationController extends BaseController {
  constructor() {
    super(violationService);
    this.dataQualityService = violationDataQualityService;
    this.performanceService = violationPerformanceService;
  }

  /**
   * List violations
   */
  async list(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.list(req.query);
    });
  }

  /**
   * Get violation by ID
   */
  async getById(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getById(req.params.id);
    });
  }

  /**
   * Create violation
   */
  async create(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.create(req.body, req._userId, req);
    }, { successStatus: 201 });
  }

  /**
   * Update violation
   */
  async update(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.update(req.params.id, req.body, req._userId, req);
    });
  }

  /**
   * Disable violation
   */
  async disable(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.disable(req.params.id, req._userId, req);
    });
  }

  /**
   * Get inspection items for a violation
   */
  async getInspectionItems(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getInspectionItems(req.params.id);
    });
  }

  /**
   * Get audit history for a violation
   */
  async getAuditHistory(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getAuditHistory(req.params.id, req.query);
    });
  }

  /**
   * Get data quality for all violations
   */
  async getDataQuality(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.dataQualityService.validateAllViolations();
    });
  }

  /**
   * Get data quality for a specific violation
   */
  async getDataQualityById(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.dataQualityService.validateViolation(req.params.id);
    });
  }

  /**
   * Get performance metrics for all violations
   */
  async getPerformance(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      const timeRange = req.query.timeRange || "24h";
      return await this.performanceService.getPerformanceSummary(timeRange);
    });
  }

  /**
   * Get performance metrics for a specific violation
   */
  async getPerformanceById(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      const timeRange = req.query.timeRange || "24h";
      return await this.performanceService.getViolationPerformance(req.params.id, timeRange);
    });
  }
}

module.exports = new ViolationController();
