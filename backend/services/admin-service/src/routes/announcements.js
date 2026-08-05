const express = require("express");
const router = express.Router();
const { requireJwt, requireRole, optionalJwt } = require("../middleware/auth");
const respond = require("../middleware/respond");
const Announcement = require("../models/Announcement");
const { logAuditEvent } = require("../lib/auditClient");

router.get("/public", async (req, res) => {
  try {
    const now = new Date();
    const announcements = await Announcement.find({
      status: "published",
      isActive: true,
      audience: "public",
      $and: [
        { $or: [{ publishAt: null }, { publishAt: { $lte: now } }] },
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
      ],
    }).sort({ priority: -1, createdAt: -1 });
    return respond.success(res, 200, announcements);
  } catch (err) {
    console.error("Failed to fetch public announcements", err);
    return respond.error(
      res,
      500,
      "fetch_failed",
      "Failed to fetch announcements",
    );
  }
});

router.get("/", optionalJwt, async (req, res) => {
  try {
    const isAdmin = req._userRole === "admin";
    const now = new Date();
    let filter = {
      status: "published",
      isActive: true,
      $or: [{ audience: "public" }, { audience: { $exists: false } }],
      $and: [
        { $or: [{ publishAt: null }, { publishAt: { $lte: now } }] },
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
      ],
    };
    if (isAdmin) {
      filter = {};
      // Admin can filter by audience
      if (
        req.query.audience &&
        ["public", "staff"].includes(req.query.audience)
      ) {
        filter.audience = req.query.audience;
      }
    }
    const announcements = await Announcement.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return respond.success(res, 200, announcements);
  } catch (err) {
    console.error("GET /api/admin/announcements error:", err);
    return respond.error(
      res,
      500,
      "fetch_error",
      "Failed to fetch announcements",
    );
  }
});

router.post("/", requireJwt, requireRole(["admin"]), async (req, res) => {
  try {
    const { title, body, priority, isActive, expiresAt, publishAt, status } =
      req.body;
    const isDraft = status === "draft";
    if (!isDraft && (!title || !body)) {
      return respond.error(
        res,
        400,
        "missing_fields",
        "Title and body are required for published announcements",
      );
    }

    const publishDate = publishAt ? new Date(publishAt) : null;
    const expiryDate = expiresAt ? new Date(expiresAt) : null;
    if (!isDraft && expiryDate) {
      const publishMoment = publishDate || new Date();
      const sameDay =
        expiryDate.toDateString() === publishMoment.toDateString();
      if (sameDay || expiryDate <= publishMoment) {
        return respond.error(
          res,
          400,
          "invalid_dates",
          "Published announcements must expire after the publish date and cannot expire on the same day",
        );
      }
    }

    const now = new Date();
    const audience =
      req.body.audience && ["public", "staff"].includes(req.body.audience)
        ? req.body.audience
        : "public";
    const announcement = await Announcement.create({
      title: title || "",
      body: body || "",
      priority: priority || "normal",
      status: status || "draft",
      audience,
      isActive: isDraft ? false : isActive !== false,
      publishAt: publishDate,
      publishedAt:
        !isDraft && (!publishDate || publishDate <= now) ? now : null,
      expiresAt: expiryDate,
      createdBy: req._userId,
    });

    // Create audit log
    await logAuditEvent(
      "announcement_created",
      req._userId,
      "Announcement",
      String(announcement._id),
      {
        role: req._userRole,
        fieldChanged: "announcement",
        oldValue: "",
        newValue: JSON.stringify({
          title,
          body,
          priority,
          status,
          isActive,
          publishAt,
          expiresAt,
        }),
        announcementId: announcement._id,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      },
    ).catch((err) =>
      console.error("Failed to log audit event for announcement_created:", err),
    );

    return respond.success(res, 201, announcement);
  } catch (err) {
    console.error("POST /api/admin/announcements error:", err);
    return respond.error(
      res,
      500,
      "create_error",
      "Failed to create announcement",
    );
  }
});

router.put("/:id", requireJwt, requireRole(["admin"]), async (req, res) => {
  try {
    const { title, body, priority, isActive, expiresAt, publishAt, status } =
      req.body;
    const isDraft = status === "draft";
    if (!isDraft && (!title || !body)) {
      return respond.error(
        res,
        400,
        "missing_fields",
        "Title and body are required for published announcements",
      );
    }

    const publishDate = publishAt ? new Date(publishAt) : null;
    const expiryDate = expiresAt ? new Date(expiresAt) : null;
    if (!isDraft && expiryDate) {
      const publishMoment = publishDate || new Date();
      const sameDay =
        expiryDate.toDateString() === publishMoment.toDateString();
      if (sameDay || expiryDate <= publishMoment) {
        return respond.error(
          res,
          400,
          "invalid_dates",
          "Published announcements must expire after the publish date and cannot expire on the same day",
        );
      }
    }

    // Get the current announcement for audit logging
    const currentAnnouncement = await Announcement.findById(req.params.id);
    if (!currentAnnouncement) {
      return respond.error(res, 404, "not_found", "Announcement not found");
    }

    const oldValues = {
      title: currentAnnouncement.title,
      body: currentAnnouncement.body,
      priority: currentAnnouncement.priority,
      status: currentAnnouncement.status,
      isActive: currentAnnouncement.isActive,
      publishAt: currentAnnouncement.publishAt,
      expiresAt: currentAnnouncement.expiresAt,
    };

    const now = new Date();
    const publishedAt =
      currentAnnouncement.publishedAt ||
      (status === "published" && (!publishDate || publishDate <= now)
        ? now
        : null);

    // When publishing, default isActive to true unless explicitly set to false
    // When unpublishing (draft), use the provided isActive value
    const resolvedIsActive =
      status === "published"
        ? isActive !== false
        : isActive !== undefined
          ? isActive
          : currentAnnouncement.isActive;

    const audience =
      req.body.audience && ["public", "staff"].includes(req.body.audience)
        ? req.body.audience
        : currentAnnouncement.audience;
    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      {
        title,
        body,
        priority,
        status,
        audience,
        isActive: resolvedIsActive,
        publishAt: publishDate,
        publishedAt,
        expiresAt: expiryDate,
        updatedBy: req._userId,
      },
      { new: true },
    );
    if (!announcement)
      return respond.error(res, 404, "not_found", "Announcement not found");

    // Create audit log
    await logAuditEvent(
      "announcement_updated",
      req._userId,
      "Announcement",
      String(announcement._id),
      {
        role: req._userRole,
        fieldChanged: "announcement",
        oldValue: JSON.stringify(oldValues),
        newValue: JSON.stringify({
          title,
          body,
          priority,
          status,
          isActive,
          publishAt,
          expiresAt,
        }),
        announcementId: announcement._id,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      },
    ).catch((err) =>
      console.error("Failed to log audit event for announcement_updated:", err),
    );

    return respond.success(res, 200, announcement);
  } catch (err) {
    console.error("PUT /api/admin/announcements/:id error:", err);
    return respond.error(
      res,
      500,
      "update_error",
      "Failed to update announcement",
    );
  }
});

router.delete("/:id", requireJwt, requireRole(["admin"]), async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement)
      return respond.error(res, 404, "not_found", "Announcement not found");

    const now = new Date();
    const hasBeenPosted =
      announcement.publishedAt ||
      (announcement.status === "published" &&
        (!announcement.publishAt || announcement.publishAt <= now));
    if (hasBeenPosted) {
      return respond.error(
        res,
        403,
        "delete_forbidden",
        "Published or previously posted announcements cannot be deleted. Unpublish to make them inactive instead.",
      );
    }

    // Create audit log before deletion
    await logAuditEvent(
      "announcement_deleted",
      req._userId,
      "Announcement",
      String(announcement._id),
      {
        role: req._userRole,
        fieldChanged: "announcement",
        oldValue: JSON.stringify({
          title: announcement.title,
          body: announcement.body,
          priority: announcement.priority,
          status: announcement.status,
          isActive: announcement.isActive,
          publishAt: announcement.publishAt,
          expiresAt: announcement.expiresAt,
        }),
        newValue: "",
        announcementId: announcement._id,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
      },
    ).catch((err) =>
      console.error("Failed to log audit event for announcement_deleted:", err),
    );

    await Announcement.findByIdAndDelete(req.params.id);
    return respond.success(res, 200, { deleted: true });
  } catch (err) {
    console.error("DELETE /api/admin/announcements/:id error:", err);
    return respond.error(
      res,
      500,
      "delete_error",
      "Failed to delete announcement",
    );
  }
});

module.exports = router;
