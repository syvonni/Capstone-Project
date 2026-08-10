const BaseController = require("../base.controller");
const checklistService = require("../../services/admin/checklist.service");
const checklistDataQualityService = require("../../services/admin/checklistDataQuality.service");
const checklistPerformanceService = require("../../services/admin/checklistPerformance.service");

class ChecklistController extends BaseController {
  constructor() {
    super();
    this.service = checklistService;
    this.dataQualityService = checklistDataQualityService;
    this.performanceService = checklistPerformanceService;
  }

  /**
   * List checklists
   */
  async list(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.list(req.query);
    });
  }

  /**
   * Get checklist by ID
   */
  async getById(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getById(req.params.id);
    });
  }

  /**
   * Get audit history for a checklist
   */
  async getAuditHistory(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getAuditHistory(req.params.id, req.query);
    });
  }

  /**
   * Create checklist
   */
  async create(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.create(req.body, req._userId, req);
    }, { successStatus: 201 });
  }

  /**
   * Update checklist
   */
  async update(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.update(req.params.id, req.body, req._userId, req);
    });
  }

  /**
   * Disable checklist
   */
  async disable(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.disable(req.params.id, req._userId, req);
    });
  }

  /**
   * Get data quality for all checklists
   */
  async getDataQuality(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.dataQualityService.validateAllChecklists();
    });
  }

  /**
   * Get data quality for a specific checklist
   */
  async getDataQualityById(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.dataQualityService.validateChecklist(req.params.id);
    });
  }

  /**
   * Get performance metrics for all checklists
   */
  async getPerformance(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      const timeRange = req.query.timeRange || "24h";
      return await this.performanceService.getPerformanceSummary(timeRange);
    });
  }

  /**
   * Get performance metrics for a specific checklist
   */
  async getPerformanceById(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      const timeRange = req.query.timeRange || "24h";
      return await this.performanceService.getPerformanceSummary(timeRange);
    });
  }
}

module.exports = new ChecklistController();
