const BaseController = require("../base.controller");
const editRequestService = require("../../services/business/editRequest.service");

class EditRequestController extends BaseController {
  constructor() {
    super();
    this.service = editRequestService;
  }

  /**
   * List edit requests
   */
  async list(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.list(req._userId, req._userRole, req.query);
    });
  }

  /**
   * Create edit request
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
   * Update edit request (approve/reject)
   */
  async update(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.update(req.params.id, req._userId, req._userRole, req.body);
    });
  }

  /**
   * Claim edit request
   */
  async claim(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.claim(req.params.id, req._userId);
    });
  }

  /**
   * Release edit request
   */
  async release(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.release(req.params.id, req._userId, req._userRole);
    });
  }

  /**
   * Transfer edit request
   */
  async transfer(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.transfer(req.params.id, req._userId, req._userRole, req.body.targetOfficerId);
    });
  }
}

module.exports = new EditRequestController();
