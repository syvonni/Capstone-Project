const express = require("express");
const router = express.Router();
const Bookmark = require("../models/Bookmark");
const { requireJwt, requireRole } = require("../middleware/auth");
const respond = require("../middleware/respond");

const ALLOWED_ITEM_TYPES = ["application", "help_request", "business-owner"];

router.use(requireJwt);
router.use(requireRole(["lgu_officer", "staff", "admin"]));

/**
 * GET /api/bookmarks
 * Get all bookmarks for the current user
 */
router.get("/", async (req, res) => {
  try {
    const bookmarks = await Bookmark.find({ userId: req._userId })
      .sort({ bookmarkedAt: -1 })
      .lean();
    return res.json(bookmarks);
  } catch (err) {
    console.error("GET /api/bookmarks error:", err);
    return respond.error(res, 500, "fetch_error", "Failed to fetch bookmarks");
  }
});

/**
 * POST /api/bookmarks
 * Add a new bookmark
 */
router.post("/", async (req, res) => {
  try {
    const { itemType, itemId } = req.body || {};

    if (!itemType || !itemId) {
      return respond.error(
        res,
        400,
        "missing_fields",
        "itemType and itemId are required",
      );
    }

    if (!ALLOWED_ITEM_TYPES.includes(itemType)) {
      return respond.error(
        res,
        400,
        "invalid_item_type",
        "itemType must be 'application', 'help_request', or 'business-owner'",
      );
    }

    const bookmark = await Bookmark.create({
      userId: req._userId,
      itemType,
      itemId: String(itemId),
    });

    return res.status(201).json(bookmark);
  } catch (err) {
    if (err.name === "MongoError" && err.code === 11000) {
      return respond.error(
        res,
        409,
        "already_bookmarked",
        "Item is already bookmarked",
      );
    }
    console.error("POST /api/bookmarks error:", err);
    return respond.error(res, 500, "create_error", "Failed to add bookmark");
  }
});

/**
 * DELETE /api/bookmarks/:id
 * Remove a bookmark
 */
router.delete("/:id", async (req, res) => {
  try {
    const bookmark = await Bookmark.findOneAndDelete({
      _id: req.params.id,
      userId: req._userId,
    }).lean();

    if (!bookmark) {
      return respond.error(res, 404, "not_found", "Bookmark not found");
    }

    return res.json(bookmark);
  } catch (err) {
    console.error("DELETE /api/bookmarks/:id error:", err);
    return respond.error(res, 500, "delete_error", "Failed to remove bookmark");
  }
});

/**
 * GET /api/bookmarks/check
 * Check if an item is bookmarked
 */
router.get("/check", async (req, res) => {
  try {
    const { itemType, itemId } = req.query;

    if (!itemType || !itemId) {
      return respond.error(
        res,
        400,
        "missing_fields",
        "itemType and itemId are required",
      );
    }

    if (!ALLOWED_ITEM_TYPES.includes(itemType)) {
      return respond.error(
        res,
        400,
        "invalid_item_type",
        "itemType must be 'application', 'help_request', or 'business-owner'",
      );
    }

    const bookmark = await Bookmark.findOne({
      userId: req._userId,
      itemType,
      itemId: String(itemId),
    }).lean();

    return res.json({ isBookmarked: !!bookmark, bookmark });
  } catch (err) {
    console.error("GET /api/bookmarks/check error:", err);
    return respond.error(res, 500, "check_error", "Failed to check bookmark");
  }
});

module.exports = router;
