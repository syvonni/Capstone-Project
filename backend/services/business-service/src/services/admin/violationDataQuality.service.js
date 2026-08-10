const ViolationDataQualityHelper = require("../../lib/dataQualityHelpers/violationDataQualityHelper");

class ViolationDataQualityService {
  /**
   * Validate all violations for data quality issues
   */
  async validateAllViolations() {
    return await ViolationDataQualityHelper.validateAllViolations();
  }

  /**
   * Validate a single violation for data quality issues
   */
  async validateViolation(id) {
    return await ViolationDataQualityHelper.validateViolation(id);
  }
}

module.exports = new ViolationDataQualityService();