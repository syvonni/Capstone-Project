const express = require("express");
const RegulatoryFeeConfig = require("../models/RegulatoryFeeConfig");
const {
  requireJwt,
  requireRole,
  requireAdminStepUp,
} = require("../middleware/auth");
const { logAuditEvent } = require("../lib/auditClient");

const router = express.Router();
const ID = RegulatoryFeeConfig.SINGLETON_ID;

/** Ensure the singleton document exists with defaults. */
async function ensureConfig() {
  let doc = await RegulatoryFeeConfig.findById(ID).lean();
  if (doc) return doc;
  await RegulatoryFeeConfig.create({ _id: ID });
  doc = await RegulatoryFeeConfig.findById(ID).lean();
  return doc;
}

function validNumber(v) {
  return typeof v === "number" && !Number.isNaN(v);
}
function validArrayOfBrackets(arr, check) {
  return Array.isArray(arr) && arr.every(check);
}

// PUT /api/business/admin/regulatory-fee-config
router.put(
  "/",
  requireJwt,
  requireRole(["admin"]),
  requireAdminStepUp,
  async (req, res) => {
    try {
      const {
        sanitaryBrackets,
        sanitaryHouseForRentFee,
        fireSafetyRate,
        fireSafetyMin,
        businessPlate,
        weightsAndMeasures,
        communityTax,
        specialPermit,
        certificationOfBusinessRecord,
        certifiedTrueCopyPerDocument,
      } = req.body;

      const update = {};

      if (Array.isArray(sanitaryBrackets)) {
        const valid = sanitaryBrackets.every(
          (b) => b && typeof b.minSqm === "number" && typeof b.fee === "number",
        );
        if (valid) update.sanitaryBrackets = sanitaryBrackets;
      }
      if (
        typeof sanitaryHouseForRentFee === "number" &&
        sanitaryHouseForRentFee >= 0
      ) {
        update.sanitaryHouseForRentFee = sanitaryHouseForRentFee;
      }
      if (
        typeof fireSafetyRate === "number" &&
        fireSafetyRate >= 0 &&
        fireSafetyRate <= 1
      ) {
        update.fireSafetyRate = fireSafetyRate;
      }
      if (typeof fireSafetyMin === "number" && fireSafetyMin >= 0) {
        update.fireSafetyMin = fireSafetyMin;
      }

      if (businessPlate != null && typeof businessPlate === "object") {
        const bp = {};
        if (
          validNumber(businessPlate.feePerUnit) &&
          businessPlate.feePerUnit >= 0
        ) {
          bp.feePerUnit = businessPlate.feePerUnit;
        }
        if (typeof businessPlate.note === "string")
          bp.note = businessPlate.note;
        if (Object.keys(bp).length > 0) update.businessPlate = bp;
      }

      if (
        weightsAndMeasures != null &&
        typeof weightsAndMeasures === "object"
      ) {
        const wam = {};
        const bracketCheck = (b) =>
          (b.maxValue == null || validNumber(b.maxValue)) &&
          validNumber(b.feePerUnit);
        if (validArrayOfBrackets(weightsAndMeasures.linear, bracketCheck)) {
          wam.linear = weightsAndMeasures.linear;
        }
        if (validArrayOfBrackets(weightsAndMeasures.capacity, bracketCheck)) {
          wam.capacity = weightsAndMeasures.capacity;
        }
        if (validArrayOfBrackets(weightsAndMeasures.weights, bracketCheck)) {
          wam.weights = weightsAndMeasures.weights;
        }
        if (
          validNumber(weightsAndMeasures.retestingPerUnit) &&
          weightsAndMeasures.retestingPerUnit >= 0
        ) {
          wam.retestingPerUnit = weightsAndMeasures.retestingPerUnit;
        }
        if (
          validNumber(weightsAndMeasures.gasolinePerNozzle) &&
          weightsAndMeasures.gasolinePerNozzle >= 0
        ) {
          wam.gasolinePerNozzle = weightsAndMeasures.gasolinePerNozzle;
        }
        if (Object.keys(wam).length > 0) update.weightsAndMeasures = wam;
      }

      if (communityTax != null && typeof communityTax === "object") {
        const ct = {};
        const ctFields = [
          "individualBase",
          "individualRatePer1000",
          "individualCap",
          "juridicalBase",
          "juridicalRatePer5000",
          "juridicalCap",
        ];
        ctFields.forEach((f) => {
          if (validNumber(communityTax[f]) && communityTax[f] >= 0)
            ct[f] = communityTax[f];
        });
        if (Object.keys(ct).length > 0) update.communityTax = ct;
      }

      if (specialPermit != null && typeof specialPermit === "object") {
        const sp = {};
        if (
          validNumber(specialPermit.streamerPerSqYard) &&
          specialPermit.streamerPerSqYard >= 0
        ) {
          sp.streamerPerSqYard = specialPermit.streamerPerSqYard;
        }
        if (
          validNumber(specialPermit.streamerDays) &&
          specialPermit.streamerDays >= 0
        ) {
          sp.streamerDays = specialPermit.streamerDays;
        }
        if (
          validNumber(specialPermit.motorcadePerDay) &&
          specialPermit.motorcadePerDay >= 0
        ) {
          sp.motorcadePerDay = specialPermit.motorcadePerDay;
        }
        if (Object.keys(sp).length > 0) update.specialPermit = sp;
      }

      if (
        certificationOfBusinessRecord != null &&
        typeof certificationOfBusinessRecord === "object"
      ) {
        const cert = {};
        if (
          validNumber(certificationOfBusinessRecord.fee) &&
          certificationOfBusinessRecord.fee >= 0
        ) {
          cert.fee = certificationOfBusinessRecord.fee;
        }
        if (
          validNumber(certificationOfBusinessRecord.documentaryStamp) &&
          certificationOfBusinessRecord.documentaryStamp >= 0
        ) {
          cert.documentaryStamp =
            certificationOfBusinessRecord.documentaryStamp;
        }
        if (Object.keys(cert).length > 0)
          update.certificationOfBusinessRecord = cert;
      }

      if (
        certifiedTrueCopyPerDocument != null &&
        typeof certifiedTrueCopyPerDocument === "object"
      ) {
        const cpy = {};
        if (
          validNumber(certifiedTrueCopyPerDocument.fee) &&
          certifiedTrueCopyPerDocument.fee >= 0
        ) {
          cpy.fee = certifiedTrueCopyPerDocument.fee;
        }
        if (
          validNumber(certifiedTrueCopyPerDocument.documentaryStamp) &&
          certifiedTrueCopyPerDocument.documentaryStamp >= 0
        ) {
          cpy.documentaryStamp = certifiedTrueCopyPerDocument.documentaryStamp;
        }
        if (Object.keys(cpy).length > 0)
          update.certifiedTrueCopyPerDocument = cpy;
      }

      const previous = await RegulatoryFeeConfig.findById(ID).lean();
      const config = await RegulatoryFeeConfig.findByIdAndUpdate(
        ID,
        { $set: update },
        { new: true, upsert: true },
      ).lean();

      logAuditEvent(
        "regulatory_fee_config_updated",
        req._userId,
        "RegulatoryFeeConfig",
        ID,
        {
          role: "admin",
          fieldChanged: "regulatory_fee_config",
          oldValue: previous ? JSON.stringify(previous) : "",
          newValue: config ? JSON.stringify(config) : "",
          ip: req.ip,
          userAgent: req.get && req.get("user-agent"),
        },
      ).catch((err) =>
        console.error(
          "Failed to log audit event for regulatory fee config update",
          err,
        ),
      );

      return res.json({ data: config });
    } catch (err) {
      console.error("PUT /regulatory-fee-config error:", err);
      return res.status(500).json({
        error: {
          code: "INTERNAL",
          message: "Failed to update regulatory fee config",
        },
      });
    }
  },
);

// GET /api/business/admin/regulatory-fee-config
router.get("/", requireJwt, async (req, res) => {
  try {
    const config = await ensureConfig();
    return res.json({ data: config });
  } catch (err) {
    console.error("GET /regulatory-fee-config error:", err);
    return res.status(500).json({
      error: {
        code: "INTERNAL",
        message: "Failed to fetch regulatory fee config",
      },
    });
  }
});

module.exports = router;
