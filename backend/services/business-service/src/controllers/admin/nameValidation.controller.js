const NameValidationService = require("../../services/admin/nameValidation.service");

class NameValidationController {
  /**
   * Validate name endpoint
   * GET /api/business/admin/validate-name?name=xxx&entityType=xxx&excludeId=xxx
   */
  async validateName(req, res) {
    try {
      const { name, entityType, excludeId } = req.query;

      if (!name) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Name parameter is required",
          },
        });
      }

      const result = await NameValidationService.validateName(
        name,
        entityType,
        excludeId
      );

      return res.status(200).json({
        valid: result.valid,
        conflicts: result.conflicts,
      });
    } catch (err) {
      console.error("Name validation error:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL",
          message: "Failed to validate name",
        },
      });
    }
  }
}

module.exports = new NameValidationController();
