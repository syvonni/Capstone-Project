const BaseController = require("../base.controller");
const appealService = require("../../services/business/appeal.service");

class AppealController extends BaseController {
  constructor() {
    super();
    this.service = appealService;
  }

  /**
   * List appeals
   */
  async list(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.list(req._userId, req._userRole, req.query);
    });
  }

  /**
   * Get appeal by ID
   */
  async getById(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getById(req.params.id);
    });
  }

  /**
   * Create appeal
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
   * Resolve appeal
   */
  async resolve(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.resolve(req.params.id, req._userId, req.body);
    });
  }

  /**
   * Claim appeal
   */
  async claim(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.claim(req.params.id, req._userId);
    });
  }

  /**
   * Release appeal
   */
  async release(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.release(req.params.id, req._userId);
    });
  }

  /**
   * Transfer appeal
   */
  async transfer(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.transfer(req.params.id, req._userId, req.body.targetOfficerId);
    });
  }

  /**
   * Resend appeal email
   */
  async resendEmail(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.resendEmail(req.params.id, req._userId, req.body.emailType);
    });
  }
}

module.exports = new AppealController();
