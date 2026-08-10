const BaseController = require("../base.controller");
const postRequirementService = require("../../services/admin/postRequirement.service");
const postRequirementDataQualityService = require("../../services/admin/postRequirementDataQuality.service");
const postRequirementPerformanceService = require("../../services/admin/postRequirementPerformance.service");

class PostRequirementController extends BaseController {
  constructor() {
    super();
    this.service = postRequirementService;
    this.dataQualityService = postRequirementDataQualityService;
    this.performanceService = postRequirementPerformanceService;
  }

  /**
   * List post requirements
   */
  async list(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.list(req.query);
    });
  }

  /**
   * Get post requirement by ID
   */
  async getById(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getById(req.params.id);
    });
  }

  /**
   * Create post requirement
   */
  async create(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.create(req.body, req._userId, req);
    }, { successStatus: 201 });
  }

  /**
   * Update post requirement
   */
  async update(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.update(req.params.id, req.body, req._userId, req);
    });
  }

  /**
   * Disable post requirement
   */
  async disable(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.disable(req.params.id, req._userId, req);
    });
  }

  /**
   * Get data quality for all post requirements
   */
  async getDataQuality(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.dataQualityService.validateAllPostRequirements();
    });
  }

  /**
   * Get data quality for a specific post requirement
   */
  async getDataQualityById(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.dataQualityService.validatePostRequirement(req.params.id);
    });
  }

  /**
   * Get performance metrics for all post requirements
   */
  async getPerformance(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      const timeRange = req.query.timeRange || "24h";
      return await this.performanceService.getPerformanceSummary(timeRange);
    });
  }

  /**
   * Get performance metrics for a specific post requirement
   */
  async getPerformanceById(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      const timeRange = req.query.timeRange || "24h";
      return await this.performanceService.getPerformanceSummary(timeRange);
    });
  }

  /**
   * Get audit history for a post requirement
   */
  async getAuditHistory(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getAuditHistory(req.params.id, req.query);
    });
  }

  /**
   * Get all post requirement audit logs
   */
  async getAllAuditLogs(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getAllAuditLogs(req.query);
    });
  }
}

module.exports = new PostRequirementController();
