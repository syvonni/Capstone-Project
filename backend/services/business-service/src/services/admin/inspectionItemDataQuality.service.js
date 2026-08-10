const InspectionItemDataQualityHelper = require("../../lib/dataQualityHelpers/inspectionItemDataQualityHelper");

class InspectionItemDataQualityService {
  /**
   * Validate all inspection items for data quality issues
   */
  async validateAllInspectionItems() {
    return await InspectionItemDataQualityHelper.validateAllInspectionItems();
  }

  /**
   * Validate a single inspection item for data quality issues
   */
  async validateInspectionItem(id) {
    return await InspectionItemDataQualityHelper.validateInspectionItem(id);
  }
}

module.exports = new InspectionItemDataQualityService();
