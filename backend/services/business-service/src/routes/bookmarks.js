const express = require("express");
const router = express.Router();
const Bookmark = require("../models/Bookmark");
const { requireJwt } = require("../middleware/auth");

// Get all bookmarks for current user
router.get("/", requireJwt, async (req, res) => {
  try {
    const bookmarks = await Bookmark.find({ userId: req._userId })
      .sort({ bookmarkedAt: -1 })
      .lean();
    res.json({ data: bookmarks });
  } catch (err) {
    console.error("GET /bookmarks error:", err);
    res.status(500).json({ error: { message: "Failed to fetch bookmarks" } });
  }
});

// Add bookmark
router.post("/", requireJwt, async (req, res) => {
  try {
    const { itemType, itemId } = req.body;

    if (!itemType || !itemId) {
      return res.status(400).json({
        error: { message: "itemType and itemId are required" },
      });
    }

    if (!["application", "help_request", "business-owner"].includes(itemType)) {
      return res.status(400).json({
        error: {
          message:
            "itemType must be 'application', 'help_request', or 'business-owner'",
        },
      });
    }

    const bookmark = await Bookmark.create({
      userId: req._userId,
      itemType,
      itemId,
    });

    res.status(201).json({ data: bookmark });
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key error - already bookmarked
      return res.status(409).json({
        error: { message: "Item is already bookmarked" },
      });
    }
    console.error("POST /bookmarks error:", err);
    res.status(500).json({ error: { message: "Failed to add bookmark" } });
  }
});

// Remove bookmark
router.delete("/:id", requireJwt, async (req, res) => {
  try {
    const bookmark = await Bookmark.findOneAndDelete({
      _id: req.params.id,
      userId: req._userId,
    });

    if (!bookmark) {
      return res.status(404).json({
        error: { message: "Bookmark not found" },
      });
    }

    res.json({ data: bookmark });
  } catch (err) {
    console.error("DELETE /bookmarks/:id error:", err);
    res.status(500).json({ error: { message: "Failed to remove bookmark" } });
  }
});

// Check if item is bookmarked
router.get("/check", requireJwt, async (req, res) => {
  try {
    const { itemType, itemId } = req.query;

    if (!itemType || !itemId) {
      return res.status(400).json({
        error: { message: "itemType and itemId are required" },
      });
    }

    const bookmark = await Bookmark.findOne({
      userId: req._userId,
      itemType,
      itemId,
    }).lean();

    res.json({ data: { isBookmarked: !!bookmark, bookmark } });
  } catch (err) {
    console.error("GET /bookmarks/check error:", err);
    res.status(500).json({ error: { message: "Failed to check bookmark" } });
  }
});

module.exports = router;
