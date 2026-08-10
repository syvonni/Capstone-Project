const express = require("express");
const router = express.Router();

const feesRouter = require("./fees.routes");
const variablesRouter = require("./variables.routes");
const taxBracketsRouter = require("./taxBrackets.routes");
const lobsRouter = require("./lobs.routes");
const claimableDocumentsRouter = require("./claimableDocuments.routes");
const penaltyRulesRouter = require("./penaltyRules.routes");
const postRequirementsRouter = require("./postRequirements.routes");
const violationsRouter = require("./violations.routes");
const inspectionItemsRouter = require("./inspectionItems.routes");
const checklistsRouter = require("./checklists.routes");
const variableFeeRulesRouter = require("./variableFeeRules.routes");
const nameValidationRouter = require("./nameValidation.routes");

// Mount routes at their specific paths (matching original index.js)
router.use("/fees", feesRouter);
router.use("/variables", variablesRouter);
router.use("/tax-brackets", taxBracketsRouter);
router.use("/lobs", lobsRouter);
router.use("/documents", claimableDocumentsRouter);
router.use("/penalty-rules", penaltyRulesRouter);
router.use("/variable-fee-rules", variableFeeRulesRouter);
router.use("/post-requirements", postRequirementsRouter);
router.use("/violations", violationsRouter);
router.use("/inspection-items", inspectionItemsRouter);
router.use("/checklists", checklistsRouter);
router.use("/validate-name", nameValidationRouter);

module.exports = router;
