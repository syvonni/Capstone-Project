/**
 * Walk-in Application Controller (LGU Officer)
 *
 * PURPOSE: Handles HTTP requests for LGU Officer walk-in application operations.
 * Extends BaseController and uses handleRequest pattern for error handling.
 *
 * METHODS:
 * - create: Create a walk-in application for a business owner (officer draft)
 * - finish: Finish an officer draft application (transition to approved)
 */

const BaseController = require("../base.controller");
const walkInApplicationService = require("../../services/lgu-officer/walkInApplication.service");

class WalkInApplicationController extends BaseController {
  constructor() {
    super();
    this.service = walkInApplicationService;
  }

  /**
   * Create a walk-in application for a business owner (officer draft)
   */
  async create(req, res) {
    return this.handleRequest(
      req,
      res,
      async (req, res) => {
        return await this.service.createWalkInApplication(
          req.body.ownerId,
          req.body.permitType,
          req.body.category,
          req._userId,
          { req }
        );
      },
      { successStatus: 201 }
    );
  }

  /**
   * Finish an officer draft application (transition to approved)
   */
  async finish(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.finishWalkInApplication(
        req.params.id,
        req._userId,
        { req }
      );
    });
  }
}

module.exports = new WalkInApplicationController();
