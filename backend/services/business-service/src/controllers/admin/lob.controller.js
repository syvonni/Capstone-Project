const BaseController = require("../base.controller");
const lobService = require("../../services/admin/lob.service");
const lobDataQualityService = require("../../services/admin/lobDataQuality.service");
const lobPerformanceService = require("../../services/admin/lobPerformance.service");

class LobController extends BaseController {
  constructor() {
    super(lobService);
    this.dataQualityService = lobDataQualityService;
    this.performanceService = lobPerformanceService;
  }

  /**
   * List LOBs
   */
  async list(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.list(req.query);
    });
  }

  /**
   * Get post requirements
   */
  async getPostRequirements(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getPostRequirements();
    });
  }

  /**
   * Get LOB by ID
   */
  async getById(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getById(req.params.id);
    });
  }

  /**
   * Create LOB
   */
  async create(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.create(req.body, req._userId, req);
    });
  }

  /**
   * Update LOB
   */
  async update(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.update(req.params.id, req.body, req._userId, req);
    });
  }

  /**
   * Get audit history for a LOB
   */
  async getAuditHistory(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getAuditHistory(req.params.id, req.query);
    });
  }

  /**
   * Get data quality for all LOBs
   */
  async getDataQuality(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.dataQualityService.validateAllLobs();
    });
  }

  /**
   * Get data quality for a specific LOB
   */
  async getDataQualityById(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.dataQualityService.validateLob(req.params.id);
    });
  }

  /**
   * Get performance metrics for all LOBs
   */
  async getPerformance(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      const timeRange = req.query.timeRange || "24h";
      return await this.performanceService.getPerformanceSummary(timeRange);
    });
  }

  /**
   * Get performance metrics for a specific LOB
   */
  async getPerformanceById(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      const timeRange = req.query.timeRange || "24h";
      return await this.performanceService.getPerformanceSummary(timeRange);
    });
  }

  /**
   * Get all LOB audit logs
   */
  async getAllAuditLogs(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getAllAuditLogs(req.query, req.headers);
    });
  }
}

module.exports = new LobController();
