const mongoose = require("mongoose");

const BookmarkSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    itemType: {
      type: String,
      enum: ["application", "help_request", "business-owner"],
      required: true,
    },
    itemId: {
      type: String,
      required: true,
      index: true,
    },
    bookmarkedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// Compound unique index to prevent duplicate bookmarks
BookmarkSchema.index({ userId: 1, itemType: 1, itemId: 1 }, { unique: true });

const { encryptionPlugin } = require("../../../../shared/lib/encryptionPlugin");

BookmarkSchema.plugin(encryptionPlugin);

module.exports = mongoose.model("Bookmark", BookmarkSchema);
