const express = require("express");
const router = express.Router();
const { requireJwt, requireRole } = require("../middleware/auth");
const respond = require("../middleware/respond");
const ApplicationProcess = require("../models/ApplicationProcess");
const { logAuditEvent } = require("../lib/auditClient");

// GET / — fetch all application processes (admin only)
router.get("/", requireJwt, requireRole(["admin"]), async (req, res) => {
  try {
    const processes = await ApplicationProcess.find().sort({
      applicationType: 1,
    });
    return respond.success(res, 200, processes);
  } catch (err) {
    return respond.error(res, 500, "fetch_error", err.message);
  }
});

// GET /:id — fetch specific application process (admin only)
router.get("/:id", requireJwt, requireRole(["admin"]), async (req, res) => {
  try {
    const process = await ApplicationProcess.findById(req.params.id);
    if (!process) {
      return respond.error(
        res,
        404,
        "not_found",
        "Application process not found",
      );
    }
    return respond.success(res, 200, process);
  } catch (err) {
    return respond.error(res, 500, "fetch_error", err.message);
  }
});

// PUT /:id — update existing application process (admin only)
router.put("/:id", requireJwt, requireRole(["admin"]), async (req, res) => {
  try {
    const process = await ApplicationProcess.findById(req.params.id);
    if (!process) {
      return respond.error(
        res,
        404,
        "not_found",
        "Application process not found",
      );
    }

    const {
      title,
      description,
      steps,
      totalEstimatedTime,
      totalEstimatedCost,
    } = req.body;

    // Validate required fields
    if (title !== undefined) process.title = title;
    if (description !== undefined) process.description = description;
    if (steps !== undefined) {
      // Validate steps have required fields
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (!step.title || !step.description) {
          return respond.error(
            res,
            400,
            "validation_error",
            `Step ${i + 1} must have a title and description`,
          );
        }
        if (!step.stepId) {
          step.stepId = `step-${Date.now()}-${i}`;
        }
        if (step.order === undefined) {
          step.order = i;
        }
      }
      process.steps = steps;
    }
    if (totalEstimatedTime !== undefined)
      process.totalEstimatedTime = totalEstimatedTime;
    if (totalEstimatedCost !== undefined)
      process.totalEstimatedCost = totalEstimatedCost;

    process.updatedBy = req._userId;
    await process.save();

    await logAuditEvent(
      "application_process_updated",
      req._userId,
      "ApplicationProcess",
      String(process._id),
      {
        role: req._userRole || "admin",
        applicationType: process.applicationType,
        title: process.title,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      },
    ).catch((err) =>
      console.error(
        "Failed to log audit event for application_process_updated:",
        err,
      ),
    );

    return respond.success(res, 200, process);
  } catch (err) {
    if (err.message.includes("Cannot publish")) {
      return respond.error(res, 400, "validation_error", err.message);
    }
    return respond.error(res, 500, "update_error", err.message);
  }
});

// POST /:id/publish — publish application process (admin only)
router.post(
  "/:id/publish",
  requireJwt,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const process = await ApplicationProcess.findById(req.params.id);
      if (!process) {
        return respond.error(
          res,
          404,
          "not_found",
          "Application process not found",
        );
      }

      if (!process.steps || process.steps.length === 0) {
        return respond.error(
          res,
          400,
          "validation_error",
          "Cannot publish an application process without any steps",
        );
      }

      process.status = "published";
      process.updatedBy = req._userId;
      await process.save();

      await logAuditEvent(
        "application_process_published",
        req._userId,
        "ApplicationProcess",
        String(process._id),
        {
          role: req._userRole || "admin",
          applicationType: process.applicationType,
          title: process.title,
          ip: req.ip,
          userAgent: req.get("user-agent"),
        },
      ).catch((err) =>
        console.error(
          "Failed to log audit event for application_process_published:",
          err,
        ),
      );

      return respond.success(res, 200, process);
    } catch (err) {
      return respond.error(res, 500, "publish_error", err.message);
    }
  },
);

// POST /:id/archive — archive application process (admin only)
router.post(
  "/:id/archive",
  requireJwt,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const process = await ApplicationProcess.findById(req.params.id);
      if (!process) {
        return respond.error(
          res,
          404,
          "not_found",
          "Application process not found",
        );
      }

      process.status = "archived";
      process.updatedBy = req._userId;
      await process.save();

      await logAuditEvent(
        "application_process_archived",
        req._userId,
        "ApplicationProcess",
        String(process._id),
        {
          role: req._userRole || "admin",
          applicationType: process.applicationType,
          title: process.title,
          ip: req.ip,
          userAgent: req.get("user-agent"),
        },
      ).catch((err) =>
        console.error(
          "Failed to log audit event for application_process_archived:",
          err,
        ),
      );

      return respond.success(res, 200, process);
    } catch (err) {
      return respond.error(res, 500, "archive_error", err.message);
    }
  },
);

// POST /:id/unarchive — unarchive application process (admin only)
router.post(
  "/:id/unarchive",
  requireJwt,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const process = await ApplicationProcess.findById(req.params.id);
      if (!process) {
        return respond.error(
          res,
          404,
          "not_found",
          "Application process not found",
        );
      }

      process.status = "published";
      process.updatedBy = req._userId;
      await process.save();

      await logAuditEvent(
        "application_process_unarchived",
        req._userId,
        "ApplicationProcess",
        String(process._id),
        {
          role: req._userRole || "admin",
          applicationType: process.applicationType,
          title: process.title,
          ip: req.ip,
          userAgent: req.get("user-agent"),
        },
      ).catch((err) =>
        console.error(
          "Failed to log audit event for application_process_unarchived:",
          err,
        ),
      );

      return respond.success(res, 200, process);
    } catch (err) {
      return respond.error(res, 500, "unarchive_error", err.message);
    }
  },
);

module.exports = router;
