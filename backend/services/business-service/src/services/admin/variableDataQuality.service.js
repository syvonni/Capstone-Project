const VariableDataQualityHelper = require("../../lib/dataQualityHelpers/variableDataQualityHelper");

class VariableDataQualityService {
  /**
   * Validate all variables for data quality issues
   */
  async validateAllVariables() {
    return await VariableDataQualityHelper.validateAllVariables();
  }

  /**
   * Validate a single variable for data quality issues
   */
  async validateVariable(id) {
    return await VariableDataQualityHelper.validateVariable(id);
  }
}

module.exports = new VariableDataQualityService();
