const LobDataQualityHelper = require("../../lib/dataQualityHelpers/lobDataQualityHelper");

class LobDataQualityService {
  /**
   * Get data quality issues for all LOBs
   */
  async validateAllLobs() {
    return await LobDataQualityHelper.validateAllLobs();
  }

  /**
   * Get data quality issues for a specific LOB
   */
  async validateLob(id) {
    return await LobDataQualityHelper.validateLob(id);
  }
}

module.exports = new LobDataQualityService();
