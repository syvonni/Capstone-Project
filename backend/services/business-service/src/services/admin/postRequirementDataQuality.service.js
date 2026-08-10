const PostRequirementDataQualityHelper = require("../../lib/dataQualityHelpers/postRequirementDataQualityHelper");

class PostRequirementDataQualityService {
  /**
   * Get data quality issues for all post requirements
   */
  async validateAllPostRequirements() {
    return await PostRequirementDataQualityHelper.validateAllPostRequirements();
  }

  /**
   * Get data quality issues for a specific post requirement
   */
  async validatePostRequirement(id) {
    return await PostRequirementDataQualityHelper.validatePostRequirement(id);
  }
}

module.exports = new PostRequirementDataQualityService();
