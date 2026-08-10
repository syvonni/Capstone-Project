const ChecklistDataQualityHelper = require("../../lib/dataQualityHelpers/checklistDataQualityHelper");

class ChecklistDataQualityService {
  /**
   * Validate all checklists for data quality issues
   */
  async validateAllChecklists() {
    return await ChecklistDataQualityHelper.validateAllChecklists();
  }

  /**
   * Validate a single checklist for data quality issues
   */
  async validateChecklist(id) {
    return await ChecklistDataQualityHelper.validateChecklist(id);
  }
}

module.exports = new ChecklistDataQualityService();
