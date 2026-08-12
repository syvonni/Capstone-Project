/**
 * Permit Application Controller (LGU Officer)
 *
 * PURPOSE: Handles HTTP requests for LGU Officer permit application operations.
 * Extends BaseController and uses handleRequest pattern for error handling.
 *
 * METHODS:
 * - list: List permit applications with filters
 * - getById: Get single application by ID
 * - startReview: Claim an application for review
 * - review: Review and approve/reject an application
 * - claim: Claim a permit application for review
 * - release: Release a claimed application
 * - resetStatus: Reset application status
 * - updateFieldDecisions: Update field-level review decisions
 * - updateFormData: Update application form data
 * - delete: Delete an application (for officer drafts)
 * - createPendingAction: Create pending action with undo window
 * - cancelPendingAction: Cancel pending action
 * - getPendingAction: Get pending action details
 * - executePendingAction: Execute pending action
 * - resendEmail: Resend application email
 * - resetEmailStatus: Reset email send status
 * - getDataQuality: Get data quality report for all applications
 * - getDataQualityById: Get data quality for single application
 * - getPerformance: Get performance metrics for applications
 * - getPerformanceById: Get performance metrics for single application
 */

const BaseController = require("../base.controller");
const permitApplicationService = require("../../services/lgu-officer/permitApplication.service");
const applicationDataQualityService = require("../../services/lgu-officer/applicationDataQuality.service");
const applicationPerformanceService = require("../../services/lgu-officer/applicationPerformance.service");

class PermitApplicationController extends BaseController {
  constructor() {
    super();
    this.service = permitApplicationService;
  }

  /**
   * List permit applications with filters
   */
  async list(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.listApplications(req.query);
    });
  }

  /**
   * Get application by ID
   */
  async getById(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getApplicationById(req.params.id);
    });
  }

  /**
   * Start review - claim an application for review
   */
  async startReview(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.startReview(req.params.id, req._userId, { req });
    });
  }

  /**
   * Review application - approve or reject
   */
  async review(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.reviewApplication(
        req.params.id,
        req._userId,
        req.body,
        { req }
      );
    });
  }

  /**
   * Claim a permit application for review
   */
  async claim(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      const force = req.body.force === true;
      return await this.service.claimApplication(
        req.params.id,
        req._userId,
        force,
        { req }
      );
    });
  }

  /**
   * Release a claimed application
   */
  async release(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.releaseApplication(req.params.id, req._userId, { req });
    });
  }

  /**
   * Reset application status
   */
  async resetStatus(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.resetApplicationStatus(
        req.params.id,
        req._userId,
        req.body.newStatus,
        { req }
      );
    });
  }

  /**
   * Update field-level review decisions
   */
  async updateFieldDecisions(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.updateFieldDecisions(
        req.params.id,
        req._userId,
        req.body,
        { req }
      );
    });
  }

  /**
   * Update application form data
   */
  async updateFormData(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.updateFormData(
        req.params.id,
        req.body.formData,
        req.body.documentCids,
        req.body.businessActivities
      );
    });
  }

  /**
   * Delete application (for officer drafts)
   */
  async delete(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.deleteApplication(req.params.id, req._userId, { req });
    });
  }

  /**
   * Create pending action with undo window
   */
  async createPendingAction(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.createPendingAction(
        req.params.id,
        req.body.actionType,
        req.body.payload,
        req._userId,
        req.body.undoWindowMinutes,
        { req }
      );
    });
  }

  /**
   * Cancel pending action
   */
  async cancelPendingAction(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.cancelPendingAction(req.params.id, req._userId, { req });
    });
  }

  /**
   * Get pending action details
   */
  async getPendingAction(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getPendingAction(req.params.id);
    });
  }

  /**
   * Execute pending action
   */
  async executePendingAction(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.executePendingAction(req.params.id, req._userId, { req });
    });
  }

  /**
   * Resend application email
   */
  async resendEmail(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.resendEmail(
        req.params.id,
        req.body.emailType,
        req._userId,
        { req }
      );
    });
  }

  /**
   * Reset email send status
   */
  async resetEmailStatus(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.resetEmailStatus(
        req.params.id,
        req.body.emailType,
        req._userId,
        { req }
      );
    });
  }

  /**
   * Get data quality report for all applications
   */
  async getDataQuality(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await applicationDataQualityService.validateAllApplications();
    });
  }

  /**
   * Get data quality for single application
   */
  async getDataQualityById(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await applicationDataQualityService.validateApplication(
        req.params.id
      );
    });
  }

  /**
   * Get performance metrics for applications
   */
  async getPerformance(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      const timeRange = req.query.timeRange || "24h";
      return await applicationPerformanceService.getPerformanceSummary(
        timeRange
      );
    });
  }

  /**
   * Get performance metrics for single application
   */
  async getPerformanceById(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      const timeRange = req.query.timeRange || "24h";
      return await applicationPerformanceService.getPerformanceSummary(
        timeRange
      );
    });
  }
}

module.exports = new PermitApplicationController();
