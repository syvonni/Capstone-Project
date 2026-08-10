const BaseController = require("../base.controller");
const claimableDocumentService = require("../../services/admin/claimableDocument.service");

class ClaimableDocumentController extends BaseController {
  constructor() {
    super();
    this.service = claimableDocumentService;
  }

  /**
   * List documents
   */
  async list(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.list(req.query);
    });
  }

  /**
   * Get document by ID
   */
  async getById(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getById(req.params.id);
    });
  }

  /**
   * Get audit history for a document
   */
  async getAuditHistory(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getAuditHistory(req.params.id, req.query);
    });
  }

  /**
   * Get draft for a document
   */
  async getDraft(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.getDraft(req.params.id);
    });
  }

  /**
   * Create or update draft for a document
   */
  async saveDraft(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.saveDraft(req.params.id, req.body);
    });
  }

  /**
   * Publish draft to original document
   */
  async publishDraft(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.publishDraft(req.params.id, req._userId, req);
    });
  }

  /**
   * Create document
   */
  async create(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.create(req.body, req._userId, req);
    }, { successStatus: 201 });
  }

  /**
   * Update document
   */
  async update(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.update(req.params.id, req.body, req._userId, req);
    });
  }

  /**
   * Disable document
   */
  async disable(req, res) {
    return this.handleRequest(req, res, async (req, res) => {
      return await this.service.disable(req.params.id, req._userId, req);
    });
  }
}

module.exports = new ClaimableDocumentController();
