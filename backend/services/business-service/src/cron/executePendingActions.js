/**
 * Execute expired pending actions
 * Runs every minute to check for pending actions that have expired and execute them
 */

const logger = require("../lib/logger");

/**
 * Find and execute all expired pending actions
 */
async function executePendingActions() {
  try {
    const Application = require("../models/Application");
    const GeneralPermit = require("../models/GeneralPermit");
    const Business = require("../models/Business");

    const now = new Date();
    let totalExecuted = 0;

    // 2. Check Application collection (new structure)
    const applications = await Application.find({
      "pendingAction.expiresAt": { $lte: now },
    });

    for (const app of applications) {
      try {
        const applicationId = app.applicationId || app._id;
        const pendingAction = app.pendingAction;

        logger.info(
          `Executing pending action for Application ${applicationId}: ${pendingAction.actionType}`,
        );

        // Execute the action directly on the database
        let newStatus = app.applicationStatus;
        if (pendingAction.actionType === "complete_review") {
          newStatus = "approved";
        } else if (pendingAction.actionType === "reject") {
          newStatus = "rejected";
        } else if (pendingAction.actionType === "return") {
          newStatus = "needs_revision";
        }

        const updateData = {
          applicationStatus: newStatus,
          pendingAction: null,
          updatedAt: new Date(),
        };

        if (pendingAction.actionType === "reject") {
          updateData.rejectionReason =
            pendingAction.payload?.rejectionReason ||
            pendingAction.payload?.comments;
        }
        if (pendingAction.actionType === "complete_review") {
          updateData.reviewComments = pendingAction.payload?.comments;
        }

        // If approving, create Business record
        if (newStatus === "approved") {
          const businessProfile = await BusinessProfile.findOne({
            userId: app.userId,
          });
          if (businessProfile) {
            const generatedBusinessId = `BIZ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            // For general_permit formType, use activityName as business name (the actual name submitted by user)
            const businessName =
              app.formType === "general_permit"
                ? app.formData?.activityName ||
                  app.formData?.businessName ||
                  "Temporary Permit"
                : app.formData?.businessName || "Unknown Business";
            const business = await Business.create({
              businessId: generatedBusinessId,
              userId: app.userId,
              ownerProfileId: businessProfile._id,
              approvedApplicationId: app._id,
              businessName,
              businessStatus: "active",
              registrationStatus: "not_yet_registered",
              applicationStatus: "approved",
              applicationReferenceNumber: app.applicationReferenceNumber,
              formType: app.formType || "permit",
              category:
                app.formType === "general_permit"
                  ? app.formData?.generalPermitCategory || app.category || ""
                  : app.category || "",
              formData: app.formData || {},
              submittedAt: app.submittedAt,
              reviewedBy: app.reviewedBy,
              location: {
                street: app.formData?.businessAddress?.streetAddress || "",
                barangay: app.formData?.businessAddress?.barangayName || "",
                city: "",
                municipality: "",
                province: "",
                zipCode: app.formData?.businessAddress?.postalCode || "",
              },
              businessType: "g",
              registrationAgency: "LGU",
              businessRegistrationNumber:
                app.formData?.tin ||
                `APP-${app._id.toString().slice(-8).toUpperCase()}`,
              contactNumber: app.formData?.businessPhone || "",
            });
            updateData.businessId = business._id;
            logger.info(
              `Created Business record ${generatedBusinessId} for Application ${applicationId}`,
            );
          }
        }

        await Application.updateOne({ _id: app._id }, { $set: updateData });

        logger.info(
          `Successfully executed pending action for Application ${applicationId}`,
        );
        totalExecuted++;
      } catch (error) {
        logger.error(
          `Failed to execute pending action for Application ${app.applicationId || app._id}`,
          { error },
        );
      }
    }

    // 3. Check GeneralPermit collection (temporary permits)
    const generalPermits = await GeneralPermit.find({
      "pendingAction.expiresAt": { $lte: now },
    });

    for (const permit of generalPermits) {
      try {
        const permitId = permit._id;
        const pendingAction = permit.pendingAction;

        logger.info(
          `Executing pending action for GeneralPermit ${permitId}: ${pendingAction.actionType}`,
        );

        // Execute the action directly on the database
        let newStatus = permit.status;
        if (pendingAction.actionType === "complete_review") {
          newStatus = "approved";
        } else if (pendingAction.actionType === "reject") {
          newStatus = "rejected";
        } else if (pendingAction.actionType === "return") {
          newStatus = "needs_revision";
        }

        const updateData = {
          status: newStatus,
          pendingAction: null,
          updatedAt: new Date(),
        };

        if (pendingAction.actionType === "reject") {
          updateData.rejectionReason =
            pendingAction.payload?.rejectionReason ||
            pendingAction.payload?.comments;
        }
        if (pendingAction.actionType === "complete_review") {
          updateData.reviewComments = pendingAction.payload?.comments;
        }

        // If approving, create Business record
        if (newStatus === "approved") {
          const businessProfile = await BusinessProfile.findOne({
            userId: permit.applicantId,
          });
          if (businessProfile) {
            const generatedBusinessId = `BIZ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            const business = await Business.create({
              businessId: generatedBusinessId,
              userId: permit.applicantId,
              ownerProfileId: businessProfile._id,
              approvedGeneralPermitId: permit._id,
              businessName: permit.permitCategory || "Temporary Permit",
              registeredBusinessName: "",
              businessStatus: "active",
              registrationStatus: "not_yet_registered",
              applicationStatus: "approved",
              applicationReferenceNumber: `GP-${permit._id.toString().slice(-8).toUpperCase()}`,
              formType: "general_permit",
              category: permit.permitCategory || "",
              formData: {
                permitCategory: permit.permitCategory,
                businessPlateNo: permit.businessPlateNo,
                requirements: permit.requirements,
              },
              submittedAt: permit.createdAt,
              reviewedBy: pendingAction.payload?.officerId || permit.approvedBy,
              location: {},
              businessType: "g",
              registrationAgency: "LGU",
              businessRegistrationNumber: `TEMP-${permit._id.toString().slice(-8).toUpperCase()}`,
              contactNumber: "",
            });
            updateData.businessId = business._id;
            logger.info(
              `Created Business record ${generatedBusinessId} for GeneralPermit ${permitId}`,
            );
          }
        }

        await GeneralPermit.updateOne(
          { _id: permit._id },
          { $set: updateData },
        );

        logger.info(
          `Successfully executed pending action for GeneralPermit ${permitId}`,
        );
        totalExecuted++;
      } catch (error) {
        logger.error(
          `Failed to execute pending action for GeneralPermit ${permit._id}`,
          { error },
        );
      }
    }

    // 4. Check Business collection (approved applications)
    const businesses = await Business.find({
      "pendingAction.expiresAt": { $lte: now },
    });

    for (const business of businesses) {
      try {
        const businessId = business.businessId || business._id;
        const pendingAction = business.pendingAction;

        logger.info(
          `Executing pending action for Business ${businessId}: ${pendingAction.actionType}`,
        );

        // Execute the action directly on the database
        let newStatus = business.applicationStatus;
        if (pendingAction.actionType === "complete_review") {
          newStatus = "approved";
        } else if (pendingAction.actionType === "reject") {
          newStatus = "rejected";
        } else if (pendingAction.actionType === "return") {
          newStatus = "needs_revision";
        }

        const updateData = {
          applicationStatus: newStatus,
          pendingAction: null,
          updatedAt: new Date(),
        };

        if (pendingAction.actionType === "reject") {
          updateData.rejectionReason =
            pendingAction.payload?.rejectionReason ||
            pendingAction.payload?.comments;
        }
        if (pendingAction.actionType === "complete_review") {
          updateData.reviewComments = pendingAction.payload?.comments;
        }

        await Business.updateOne({ _id: business._id }, { $set: updateData });

        logger.info(
          `Successfully executed pending action for Business ${businessId}`,
        );
        totalExecuted++;
      } catch (error) {
        logger.error(
          `Failed to execute pending action for Business ${business.businessId || business._id}`,
          { error },
        );
      }
    }

    if (totalExecuted > 0) {
      logger.info(`Successfully executed ${totalExecuted} pending actions`);
    }
  } catch (error) {
    logger.error("Error in executePendingActions job", { error });
  }
}

module.exports = { executePendingActions };
