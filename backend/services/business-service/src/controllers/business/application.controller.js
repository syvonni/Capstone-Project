const BaseController = require("../base.controller");
const applicationService = require("../../services/business/application.service");

class ApplicationController extends BaseController {
  constructor() {
    super();
    this.service = applicationService;
  }

  /**
   * Submit a new application
   */
  async create(req, res) {
    return this.handleRequest(
      req,
      res,
      async (req, res) => {
        return await this.service.create(req._userId, req.body);
      },
      { successStatus: 201 },
    );
  }

  /**
   * List applications with optional filters
   */
  async list(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.list(req._userId, req.user?.role, req.query);
    });
  }

  /**
   * Get application details
   */
  async getById(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getById(req.params.id);
    });
  }

  /**
   * Update application
   */
  async update(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.update(req.params.id, req.body, req._userId);
    });
  }

  /**
   * Claim an application for review
   */
  async claim(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.claim(req.params.id, req._userId);
    });
  }

  /**
   * Approve an application
   */
  async approve(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.approve(req.params.id, req._userId);
    });
  }

  /**
   * Reject an application
   */
  async reject(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.reject(req.params.id, req._userId, req.body.rejectionReason);
    });
  }

  /**
   * Return application for revision
   */
  async returnForRevision(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.returnForRevision(req.params.id, req._userId, req.body.reviewComments);
    });
  }

  /**
   * Resend application email
   */
  async resendEmail(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.resendEmail(req.params.id, req._userId, req.body.emailType);
    });
  }

  /**
   * Delete application
   */
  async delete(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.delete(req.params.id, req._userId);
    });
  }

  /**
   * Debug: Clear all applications for current user and reset welcome state
   */
  async clearAllApplications(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.clearAllApplications(req._userId);
    });
  }
}

module.exports = new ApplicationController();
