const BaseController = require("../base.controller");
const inspectionItemService = require("../../services/admin/inspectionItem.service");
const inspectionItemDataQualityService = require("../../services/admin/inspectionItemDataQuality.service");
const inspectionItemPerformanceService = require("../../services/admin/inspectionItemPerformance.service");

class InspectionItemController extends BaseController {
  constructor() {
    super();
    this.service = inspectionItemService;
    this.dataQualityService = inspectionItemDataQualityService;
    this.performanceService = inspectionItemPerformanceService;
  }

  /**
   * List inspection items
   */
  async list(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.list(req.query);
    });
  }

  /**
   * Get inspection items by violation ID
   */
  async getByViolationId(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getByViolationId(req.params.violationId);
    });
  }

  /**
   * Get inspection item by ID
   */
  async getById(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getById(req.params.id);
    });
  }

  /**
   * Get checklists containing this inspection item
   */
  async getChecklists(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getChecklists(req.params.id);
    });
  }

  /**
   * Get audit history for an inspection item
   */
  async getAuditHistory(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getAuditHistory(req.params.id, req.query);
    });
  }

  /**
   * Create inspection item
   */
  async create(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.create(req.body, req._userId, req);
    }, { successStatus: 201 });
  }

  /**
   * Update inspection item
   */
  async update(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.update(req.params.id, req.body, req._userId, req);
    });
  }

  /**
   * Disable inspection item
   */
  async disable(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.disable(req.params.id, req._userId, req);
    });
  }

  /**
   * Get data quality for all inspection items
   */
  async getDataQuality(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.dataQualityService.validateAllInspectionItems();
    });
  }

  /**
   * Get data quality for a specific inspection item
   */
  async getDataQualityById(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.dataQualityService.validateInspectionItem(req.params.id);
    });
  }

  /**
   * Get performance metrics for all inspection items
   */
  async getPerformance(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      const timeRange = req.query.timeRange || "24h";
      return await this.performanceService.getPerformanceSummary(timeRange);
    });
  }

  /**
   * Get performance metrics for a specific inspection item
   */
  async getPerformanceById(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      const timeRange = req.query.timeRange || "24h";
      return await this.performanceService.getPerformanceSummary(timeRange);
    });
  }
}

module.exports = new InspectionItemController();
