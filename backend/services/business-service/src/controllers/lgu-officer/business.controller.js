/**
 * Business Controller (LGU Officer)
 *
 * PURPOSE: Handles HTTP requests for LGU Officer business operations.
 * Extends BaseController and uses handleRequest pattern for error handling.
 *
 * METHODS:
 * - list: List all approved businesses across the LGU
 * - getById: Get business details by ID
 * - getDataQuality: Get data quality report for all businesses
 * - getDataQualityById: Get data quality for single business
 * - getPerformance: Get performance metrics for businesses
 * - getPerformanceById: Get performance metrics for single business
 */

const BaseController = require("../base.controller");
const businessService = require("../../services/lgu-officer/business.service");
const businessDataQualityService = require("../../services/lgu-officer/businessDataQuality.service");
const businessPerformanceService = require("../../services/lgu-officer/businessPerformance.service");

class BusinessController extends BaseController {
  constructor() {
    super();
    this.service = businessService;
  }

  /**
   * List all approved businesses across the LGU
   */
  async list(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.listBusinesses(req.query);
    });
  }

  /**
   * Get business by ID
   */
  async getById(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getBusinessById(req.params.id);
    });
  }

  /**
   * Get data quality report for all businesses
   */
  async getDataQuality(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await businessDataQualityService.validateAllBusinesses();
    });
  }

  /**
   * Get data quality for single business
   */
  async getDataQualityById(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await businessDataQualityService.validateBusiness(req.params.id);
    });
  }

  /**
   * Get performance metrics for businesses
   */
  async getPerformance(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      const timeRange = req.query.timeRange || "24h";
      return await businessPerformanceService.getPerformanceSummary(timeRange);
    });
  }

  /**
   * Get performance metrics for single business
   */
  async getPerformanceById(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      const timeRange = req.query.timeRange || "24h";
      return await businessPerformanceService.getPerformanceSummary(timeRange);
    });
  }
}

module.exports = new BusinessController();
